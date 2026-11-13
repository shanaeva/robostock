import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  inject,
  it,
  vi,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { apiErrorSchema } from '../src/common/api-error.schema.js';
import { configureApp } from '../src/configure-app.js';
import {
  userResponseSchema,
  usersResponseSchema,
} from '../src/modules/users/users.schemas.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Users API with PostgreSQL', () => {
  let app: INestApplication<Server> | undefined;
  let prisma: PrismaService;
  let server: Server;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = testingModule.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    server = app.getHttpServer();

    // Verify the real connection before any per-test cleanup can run.
    expect(app.get(ConfigService).get<unknown>('DATABASE_URL')).toBe(
      inject('testDatabaseUrl'),
    );
    const [connection] = await prisma.$queryRaw<{ database: string }[]>`
      SELECT current_database() AS database
    `;
    expect(connection?.database).toBe(
      new URL(inject('testDatabaseUrl')).pathname.slice(1),
    );
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates and persists a user with a generated UUID and creation date', async () => {
    const response = await request(server)
      .post('/users')
      .send({ email: 'test@example.com', name: ' Alex ' })
      .expect('Content-Type', /json/)
      .expect(201);
    const user = userResponseSchema.parse(response.body);
    expect(response.body).toEqual(user);
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Alex');
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(stored.email).toBe(user.email);
    expect(stored.createdAt.toISOString()).toBe(user.createdAt);
  });

  it('returns an empty list when no users exist', async () => {
    const response = await request(server).get('/users').expect(200);
    expect(response.body).toEqual([]);
  });

  it('lists users from PostgreSQL', async () => {
    const first = await prisma.user.create({
      data: { email: 'first@example.com', name: 'First' },
    });
    const second = await prisma.user.create({
      data: { email: 'second@example.com', name: 'Second' },
    });
    const response = await request(server).get('/users').expect(200);
    const users = usersResponseSchema.parse(response.body);
    expect(response.body).toEqual(users);
    expect(users.map((user) => user.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  });

  it('limits the default page to 20 users and allows at most 100', async () => {
    await prisma.user.createMany({
      data: Array.from({ length: 105 }, (_, index) => ({
        email: `user${String(index)}@example.com`,
        name: `User ${String(index)}`,
      })),
    });

    const defaultPage = await request(server).get('/users').expect(200);
    expect(usersResponseSchema.parse(defaultPage.body)).toHaveLength(20);

    const largestPage = await request(server)
      .get('/users?limit=100')
      .expect(200);
    expect(usersResponseSchema.parse(largestPage.body)).toHaveLength(100);
  });

  it('paginates by creation date and breaks timestamp ties by descending UUID', async () => {
    const ids = [1, 2, 3, 4, 5].map(
      (index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    );
    await prisma.user.createMany({
      data: ids.map((id, index) => ({
        id,
        email: `user${String(index)}@example.com`,
        name: `User ${String(index)}`,
        // The smallest UUID is the newest user; the other timestamps tie.
        createdAt: new Date(
          index === 0 ? '2026-11-10T10:00:00Z' : '2026-11-10T09:00:00Z',
        ),
      })),
    });

    const pages = [];
    for (const offset of [0, 2, 4]) {
      const response = await request(server)
        .get(`/users?limit=2&offset=${String(offset)}`)
        .expect(200);
      pages.push(usersResponseSchema.parse(response.body));
    }
    expect(pages.flat().map((user) => user.id)).toEqual([
      ids[0],
      ids[4],
      ids[3],
      ids[2],
      ids[1],
    ]);

    const beyond = await request(server)
      .get('/users?limit=2&offset=5')
      .expect(200);
    expect(beyond.body).toEqual([]);
  });

  it.each([
    'limit=0',
    'limit=101',
    'limit=1.5',
    'limit=invalid',
    'limit=1&limit=2',
    'offset=-1',
    'offset=1.5',
    'offset=2147483648',
    'offset=invalid',
    'unknown=value',
  ])('returns 400 for invalid pagination: %s', async (query) => {
    const response = await request(server).get(`/users?${query}`).expect(400);
    expect(apiErrorSchema.parse(response.body).statusCode).toBe(400);
  });

  it('gets a user by UUID', async () => {
    const stored = await prisma.user.create({
      data: { email: 'test@example.com', name: 'Alex' },
    });
    const response = await request(server)
      .get(`/users/${stored.id}`)
      .expect(200);
    userResponseSchema.parse(response.body);
    expect(response.body).toEqual({
      ...stored,
      createdAt: stored.createdAt.toISOString(),
    });
  });

  it('returns 409 for a duplicate email without creating a second row', async () => {
    await prisma.user.create({
      data: { email: 'test@example.com', name: 'Alex' },
    });
    const response = await request(server)
      .post('/users')
      .send({ email: 'test@example.com', name: 'Duplicate' })
      .expect(409);
    expect(apiErrorSchema.parse(response.body)).toEqual({
      statusCode: 409,
      message: 'Email already exists',
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it('handles concurrent requests for the same email', async () => {
    const responses = await Promise.all([
      request(server)
        .post('/users')
        .send({ email: 'test@example.com', name: 'First' }),
      request(server)
        .post('/users')
        .send({ email: 'test@example.com', name: 'Second' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await prisma.user.count()).toBe(1);
  });

  it.each([
    { email: 'invalid', name: 'Alex' },
    { email: 'test@example.com' },
    { email: 'test@example.com', name: '   ' },
    { email: 'test@example.com', name: 'Alex', role: 'admin' },
  ])(
    'returns 400 for invalid input without writing to the database (%#)',
    async (body) => {
      const response = await request(server)
        .post('/users')
        .send(body)
        .expect(400);
      const error = apiErrorSchema.parse(response.body);
      expect(error.statusCode).toBe(400);
      expect(error.message).not.toBe('');
      expect(await prisma.user.count()).toBe(0);
    },
  );

  it('returns 400 for malformed JSON', async () => {
    const response = await request(server)
      .post('/users')
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    expect(apiErrorSchema.parse(response.body).statusCode).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it('returns 400 for a malformed UUID', async () => {
    const response = await request(server).get('/users/not-a-uuid').expect(400);
    expect(apiErrorSchema.parse(response.body).statusCode).toBe(400);
  });

  it('returns 404 for an unknown UUID', async () => {
    const response = await request(server)
      .get(`/users/${randomUUID()}`)
      .expect(404);
    expect(apiErrorSchema.parse(response.body)).toEqual({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('reports a healthy database', async () => {
    const response = await request(server).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('does not expose database details when a query fails', async () => {
    await prisma.$executeRaw`ALTER TABLE "users" RENAME TO "users_unavailable"`;
    try {
      const response = await request(server).get('/users').expect(500);
      expect(response.body).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    } finally {
      await prisma.$executeRaw`ALTER TABLE "users_unavailable" RENAME TO "users"`;
    }
  });

  it('returns 503 when the health query fails', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(
      new Error('Private database failure'),
    );
    const response = await request(server).get('/health').expect(503);
    expect(response.body).toEqual({
      statusCode: 503,
      message: 'Service unavailable',
    });
  });

  it('uses the same error format for unknown routes', async () => {
    const response = await request(server).get('/missing').expect(404);
    const error = apiErrorSchema.parse(response.body);
    expect(error.statusCode).toBe(404);
    expect(response.body).toEqual({ statusCode: 404, message: error.message });
  });

  it('serves Swagger UI using the shared application configuration', async () => {
    await request(server)
      .get('/docs')
      .expect('Content-Type', /html/)
      .expect(200)
      .expect(/swagger-ui/);
  });

  it('documents pagination, user responses and validation errors in OpenAPI', async () => {
    const response = await request(server)
      .get('/docs-json')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body).toMatchObject({
      paths: {
        '/users': {
          get: {
            parameters: [
              {
                name: 'limit',
                in: 'query',
                required: false,
                schema: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  default: 20,
                },
              },
              {
                name: 'offset',
                in: 'query',
                required: false,
                schema: {
                  type: 'integer',
                  minimum: 0,
                  default: 0,
                },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' },
                    },
                  },
                },
              },
              '400': {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/ApiError' },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
