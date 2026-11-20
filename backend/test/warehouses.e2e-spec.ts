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
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { warehouseCreatedSchema } from '../src/modules/warehouses/warehouses.schemas.js';

describe('Warehouses API with PostgreSQL', () => {
  const ownerEmail = 'warehouse-owner@example.com';
  const otherOwnerEmail = 'other-warehouse-owner@example.com';
  const dimensions = { width: 20, height: 10 };
  const password = 'test-password-123';
  let app: INestApplication<Server> | undefined;
  let prisma: PrismaService;
  let server: Server;
  let ownerId: string;
  let ownerSession: Awaited<ReturnType<typeof login>>;

  async function login(email: string) {
    const agent = request.agent(server);
    const csrf = await agent.get('/auth/csrf').expect(200);
    const { csrfToken } = csrf.body as { csrfToken: string };

    await agent
      .post('/auth/login')
      .set('X-CSRF-Token', csrfToken)
      .send({ email, password, rememberMe: false })
      .expect(200);

    return { agent, csrfToken };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication<INestApplication<Server>>({
      logger: false,
    });
    configureApp(app);
    expect(app.get(ConfigService).get<unknown>('DATABASE_URL')).toBe(
      inject('testDatabaseUrl'),
    );
    await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    server = app.getHttpServer();
    const [connection] = await prisma.$queryRaw<{ database: string }[]>`
      SELECT current_database() AS database
    `;
    expect(connection?.database).toBe(
      new URL(inject('testDatabaseUrl')).pathname.slice(1),
    );
  });

  beforeEach(async () => {
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'Warehouse owner',
        passwordHash: await hashPassword(password),
        verifiedAt: new Date(),
      },
    });
    ownerId = owner.id;
    ownerSession = await login(ownerEmail);
  });

  afterEach(async () => {
    // The foreign key cascades deletion to these fixture users' warehouses.
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherOwnerEmail] } },
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requires a session on every warehouse route', async () => {
    const client = request(server);
    const path = `/warehouses/${ownerId}`;

    await client.get('/warehouses').expect(401);
    await client
      .post('/warehouses')
      .send({ name: 'Warehouse', ...dimensions })
      .expect(401);
    await client.get(path).expect(401);
    await client.patch(path).send({ name: 'Renamed' }).expect(401);
    await client.delete(path).expect(401);
  });

  it('requires a CSRF token for writes even with a valid session', async () => {
    const { agent } = ownerSession;
    const path = `/warehouses/${ownerId}`;

    await agent
      .post('/warehouses')
      .send({ name: 'Warehouse', ...dimensions })
      .expect(403);
    await agent.patch(path).send({ name: 'Renamed' }).expect(403);
    await agent.delete(path).expect(403);
  });

  it('creates, reads, renames and deletes a warehouse', async () => {
    const { agent, csrfToken } = ownerSession;
    const created = await agent
      .post('/warehouses')
      .set('X-CSRF-Token', csrfToken)
      .send({ name: ' Main warehouse ', ...dimensions })
      .expect('Content-Type', /json/)
      .expect(201);
    const { warehouseId } = warehouseCreatedSchema.parse(created.body);
    expect(created.body).toEqual({ warehouseId });

    const stored = await prisma.warehouse.findUniqueOrThrow({
      where: { id: warehouseId },
    });
    expect(stored).toMatchObject({
      ownerId,
      name: 'Main warehouse',
      ...dimensions,
    });

    const path = `/warehouses/${warehouseId}`;
    const details = await agent.get(path).expect(200);
    expect(details.body).toEqual({
      id: warehouseId,
      ownerId,
      name: 'Main warehouse',
      ...dimensions,
      robots: [],
      obstacles: [],
      stations: [],
      createdAt: stored.createdAt.toISOString(),
      updatedAt: stored.updatedAt.toISOString(),
    });

    await agent
      .patch(path)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: ' Renamed warehouse ' })
      .expect(204, '');
    expect(
      await prisma.warehouse.findUniqueOrThrow({ where: { id: warehouseId } }),
    ).toMatchObject({ name: 'Renamed warehouse', ...dimensions });

    await agent.delete(path).set('X-CSRF-Token', csrfToken).expect(204, '');
    expect(
      await prisma.warehouse.findUnique({ where: { id: warehouseId } }),
    ).toBeNull();
    await agent.get(path).expect(404);
  });

  it('excludes another owner’s warehouse from the list and rejects access to it', async () => {
    const otherOwner = await prisma.user.create({
      data: {
        email: otherOwnerEmail,
        name: 'Other warehouse owner',
        passwordHash: await hashPassword(password),
        verifiedAt: new Date(),
      },
    });
    const otherSession = await login(otherOwnerEmail);
    const owned = await prisma.warehouse.create({
      data: { ownerId, name: 'Own warehouse', ...dimensions },
    });
    const foreign = await prisma.warehouse.create({
      data: { ownerId: otherOwner.id, name: 'Other warehouse', ...dimensions },
    });

    const { agent, csrfToken } = ownerSession;
    const list = await agent.get('/warehouses').expect(200);
    expect(list.body).toEqual({
      list: [{ id: owned.id, name: owned.name, ...dimensions }],
      total: 1,
      page: 1,
      limit: 20,
    });
    const otherList = await otherSession.agent.get('/warehouses').expect(200);
    expect(otherList.body).toEqual({
      list: [{ id: foreign.id, name: foreign.name, ...dimensions }],
      total: 1,
      page: 1,
      limit: 20,
    });

    const path = `/warehouses/${foreign.id}`;
    const error = { statusCode: 404, message: 'Склад не найден.' };
    await agent.get(path).expect(404, error);
    await agent
      .patch(path)
      .set('X-CSRF-Token', csrfToken)
      .send({ name: 'Renamed warehouse' })
      .expect(404, error);
    await agent.delete(path).set('X-CSRF-Token', csrfToken).expect(404, error);
    expect(
      await prisma.warehouse.findUniqueOrThrow({ where: { id: foreign.id } }),
    ).toEqual(foreign);
  });
});
