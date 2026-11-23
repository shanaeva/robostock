import type { Server } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Warehouse map API with PostgreSQL', () => {
  const ownerEmail = 'map-owner@example.com';
  const otherEmail = 'map-other@example.com';
  const password = 'test-password-123';
  const empty = { obstacles: [], stations: [], robots: [] };
  let app: INestApplication<Server> | undefined;
  let prisma: PrismaService;
  let server: Server;
  let ownerId: string;
  let warehouseId: string;
  let owner: Awaited<ReturnType<typeof login>>;

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

  const createUser = async (email: string) =>
    prisma.user.create({
      data: {
        email,
        name: 'Map user',
        passwordHash: await hashPassword(password),
        verifiedAt: new Date(),
      },
    });

  const patchMap = (
    session: typeof owner,
    changes: unknown,
    id = warehouseId,
  ) =>
    session.agent
      .patch(`/warehouses/${id}/objects`)
      .set('X-CSRF-Token', session.csrfToken)
      .send({ changes });

  const obstacle = (x: number, y: number) =>
    ({ type: 'create', objectType: 'obstacle', x, y }) as const;
  const station = (x: number, y: number, name = 'Station') =>
    ({
      type: 'create',
      objectType: 'station',
      name,
      x,
      y,
      direction: 'north',
    }) as const;
  const robot = (x: number, y: number, name = 'Robot') =>
    ({ type: 'create', objectType: 'robot', name, x, y }) as const;

  const snapshot = async () => {
    const query = {
      where: { warehouseId },
      orderBy: [{ x: 'asc' as const }, { y: 'asc' as const }],
    };

    return {
      obstacles: await prisma.obstacle.findMany(query),
      stations: await prisma.station.findMany(query),
      robots: await prisma.robot.findMany(query),
    };
  };
  const objectsAt = async (x: number, y: number) => {
    const where = { warehouseId, x, y };
    const counts = await Promise.all([
      prisma.obstacle.count({ where }),
      prisma.station.count({ where }),
      prisma.robot.count({ where }),
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  };
  const updatedAt = async () =>
    (
      await prisma.warehouse.findUniqueOrThrow({
        where: { id: warehouseId },
        select: { updatedAt: true },
      })
    ).updatedAt.getTime();

  beforeAll(async () => {
    process.env.AUTH_RATE_LIMIT_ENABLED = 'false';
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
  });

  beforeEach(async () => {
    ownerId = (await createUser(ownerEmail)).id;
    await createUser(otherEmail);
    warehouseId = (
      await prisma.warehouse.create({
        data: { ownerId, name: 'Map warehouse', width: 20, height: 20 },
      })
    ).id;
    owner = await login(ownerEmail);
  });

  afterEach(async () => {
    // Cascades to warehouses and map objects.
    await prisma.user.deleteMany({
      where: { email: { in: [ownerEmail, otherEmail] } },
    });
  });

  afterAll(async () => {
    delete process.env.AUTH_RATE_LIMIT_ENABLED;
    await app?.close();
  });

  describe('security', () => {
    it('requires a session', async () => {
      const csrfResponse = await request(server).get('/auth/csrf').expect(200);

      const csrfCookie = (
        csrfResponse.headers['set-cookie'] as string[] | undefined
      )?.find((cookie) => cookie.startsWith('csrf_token='));

      if (!csrfCookie) {
        throw new Error('CSRF cookie was not returned');
      }

      const csrfToken = (csrfResponse.body as { csrfToken: string }).csrfToken;

      await request(server)
        .patch(`/warehouses/${warehouseId}/objects`)
        .set('Cookie', csrfCookie)
        .set('X-CSRF-Token', csrfToken)
        .send({ changes: [obstacle(1, 1)] })
        .expect(401);
    });

    it('requires a CSRF token', async () => {
      await owner.agent
        .patch(`/warehouses/${warehouseId}/objects`)
        .send({ changes: [obstacle(1, 1)] })
        .expect(403);
      expect(await objectsAt(1, 1)).toBe(0);
    });

    it("returns 403 for another user's warehouse and changes nothing", async () => {
      const other = await login(otherEmail);
      const before = await updatedAt();

      await patchMap(other, [obstacle(1, 1)]).expect(403);

      expect(await objectsAt(1, 1)).toBe(0);
      expect(await updatedAt()).toBe(before);
    });

    it('returns 404 for an unknown warehouse', async () => {
      await patchMap(
        owner,
        [obstacle(1, 1)],
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      ).expect(404);
    });
  });

  describe('operations', () => {
    it('creates objects of every type with generated ids', async () => {
      await patchMap(owner, [
        obstacle(1, 1),
        station(5, 5, 'Charger'),
        robot(5, 6, 'R-1'),
      ]).expect(204, '');

      const { obstacles, stations, robots } = await snapshot();
      expect(obstacles).toMatchObject([{ x: 1, y: 1 }]);
      expect(stations).toMatchObject([
        { x: 5, y: 5, name: 'Charger', direction: 'north' },
      ]);
      expect(robots).toMatchObject([{ x: 5, y: 6, name: 'R-1' }]);
      for (const { id } of [...obstacles, ...stations, ...robots]) {
        expect(id).toMatch(/^[0-9a-f-]{36}$/);
      }
    });

    it('moves and deletes persisted objects of every type', async () => {
      const o = await prisma.obstacle.create({
        data: { warehouseId, x: 1, y: 1 },
      });
      const s = await prisma.station.create({
        data: { warehouseId, x: 5, y: 5, name: 'S', direction: 'east' },
      });
      const r = await prisma.robot.create({
        data: { warehouseId, x: 5, y: 6, name: 'R' },
      });

      await patchMap(owner, [
        { type: 'move', objectType: 'obstacle', objectId: o.id, x: 2, y: 2 },
        { type: 'move', objectType: 'station', objectId: s.id, x: 6, y: 5 },
        { type: 'move', objectType: 'robot', objectId: r.id, x: 6, y: 6 },
      ]).expect(204);

      const moved = await snapshot();
      expect(moved.obstacles).toMatchObject([{ id: o.id, x: 2, y: 2 }]);
      expect(moved.stations).toMatchObject([
        { id: s.id, x: 6, y: 5, name: 'S', direction: 'east' },
      ]);
      expect(moved.robots).toMatchObject([{ id: r.id, x: 6, y: 6 }]);

      await patchMap(owner, [
        { type: 'delete', objectType: 'robot', objectId: r.id },
        { type: 'delete', objectType: 'station', objectId: s.id },
        { type: 'delete', objectType: 'obstacle', objectId: o.id },
      ]).expect(204);
      expect(await snapshot()).toEqual(empty);
    });

    it('executes operations in order, reusing a vacated cell', async () => {
      const o = await prisma.obstacle.create({
        data: { warehouseId, x: 1, y: 1 },
      });

      await patchMap(owner, [
        { type: 'move', objectType: 'obstacle', objectId: o.id, x: 2, y: 2 },
        station(1, 1),
      ]).expect(204);

      const { obstacles, stations } = await snapshot();
      expect(obstacles).toMatchObject([{ x: 2, y: 2 }]);
      expect(stations).toMatchObject([{ x: 1, y: 1 }]);
    });

    it('does not touch objects of another warehouse', async () => {
      const foreign = await prisma.warehouse.create({
        data: { ownerId, name: 'Other warehouse', width: 20, height: 20 },
      });
      const o = await prisma.obstacle.create({
        data: { warehouseId: foreign.id, x: 1, y: 1 },
      });

      await patchMap(owner, [
        { type: 'delete', objectType: 'obstacle', objectId: o.id },
      ]).expect(404);
      expect(await prisma.obstacle.count({ where: { id: o.id } })).toBe(1);
    });

    it('returns 404 for an unknown object or a wrong object type', async () => {
      const o = await prisma.obstacle.create({
        data: { warehouseId, x: 1, y: 1 },
      });

      await patchMap(owner, [
        { type: 'delete', objectType: 'robot', objectId: o.id },
      ]).expect(404);
      await patchMap(owner, [
        {
          type: 'move',
          objectType: 'obstacle',
          objectId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          x: 3,
          y: 3,
        },
      ]).expect(404);
      expect(await prisma.obstacle.count({ where: { id: o.id } })).toBe(1);
    });
  });

  describe('validation', () => {
    it.each([
      ['beyond the width', obstacle(20, 0)],
      ['beyond the height', obstacle(0, 20)],
      ['negative', obstacle(-1, 0)],
    ])('returns 422 for coordinates %s', async (_name, change) => {
      await patchMap(owner, [change]).expect(422);
      expect(await snapshot()).toEqual(empty);
    });

    it.each([
      ['an obstacle', obstacle(1, 1), station(1, 1)],
      ['an obstacle', obstacle(1, 1), obstacle(1, 1)],
      ['a station', station(1, 1), obstacle(1, 1)],
    ])(
      'returns 422 when a new object lands on %s',
      async (_name, first, second) => {
        await patchMap(owner, [first]).expect(204);

        await patchMap(owner, [second]).expect(422);
        expect(await objectsAt(1, 1)).toBe(1);
      },
    );

    it('returns 422 when a new object lands on a robot', async () => {
      await patchMap(owner, [station(1, 1), robot(1, 2)]).expect(204);

      await patchMap(owner, [obstacle(1, 2)]).expect(422);
      expect(await objectsAt(1, 2)).toBe(1);
    });

    it('requires every robot to be adjacent to a station', async () => {
      await patchMap(owner, [robot(7, 7)]).expect(422);
      await patchMap(owner, [station(5, 5), robot(6, 6)]).expect(422);
      expect(await snapshot()).toEqual(empty);

      await patchMap(owner, [station(5, 5), robot(5, 6)]).expect(204);
    });

    it('rejects removing or moving the last adjacent station of a robot', async () => {
      const s = await prisma.station.create({
        data: { warehouseId, x: 5, y: 5, name: 'S', direction: 'north' },
      });
      await prisma.robot.create({
        data: { warehouseId, x: 5, y: 6, name: 'R' },
      });

      await patchMap(owner, [
        { type: 'delete', objectType: 'station', objectId: s.id },
      ]).expect(422);
      await patchMap(owner, [
        { type: 'move', objectType: 'station', objectId: s.id, x: 9, y: 9 },
      ]).expect(422);
      expect((await snapshot()).stations).toMatchObject([{ x: 5, y: 5 }]);
    });

    it('returns 400 for a malformed body', async () => {
      await patchMap(owner, []).expect(400);
      await patchMap(owner, [{ type: 'create' }]).expect(400);
    });
  });

  describe('atomicity and updatedAt', () => {
    it('rolls back every change when a later operation fails', async () => {
      const before = await updatedAt();

      await patchMap(owner, [
        obstacle(1, 1),
        station(5, 5),
        obstacle(1, 1),
      ]).expect(422);

      expect(await snapshot()).toEqual(empty);
      expect(await updatedAt()).toBe(before);
    });

    it('rolls back when the final adjacency check fails', async () => {
      await patchMap(owner, [obstacle(1, 1), robot(9, 9)]).expect(422);

      expect(await objectsAt(1, 1)).toBe(0);
    });

    it('bumps updatedAt only for effective changes', async () => {
      const o = await prisma.obstacle.create({
        data: { warehouseId, x: 1, y: 1 },
      });
      const before = await updatedAt();

      await patchMap(owner, [
        { type: 'move', objectType: 'obstacle', objectId: o.id, x: 1, y: 1 },
      ]).expect(204);
      expect(await updatedAt()).toBe(before);

      await patchMap(owner, [
        { type: 'move', objectType: 'obstacle', objectId: o.id, x: 2, y: 2 },
      ]).expect(204);
      expect(await updatedAt()).toBeGreaterThan(before);
    });
  });

  describe('concurrency', () => {
    it('lets exactly one of many racing creates claim a cell across tables', async () => {
      const responses = await Promise.all(
        [
          obstacle(3, 3),
          station(3, 3, 'A'),
          obstacle(3, 3),
          station(3, 3, 'B'),
          obstacle(3, 3),
          station(3, 3, 'C'),
        ].map((change) => patchMap(owner, [change])),
      );

      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([204, 422, 422, 422, 422, 422]);
      expect(await objectsAt(3, 3)).toBe(1);
    });

    it('lets exactly one of two racing moves claim a cell', async () => {
      const a = await prisma.obstacle.create({
        data: { warehouseId, x: 1, y: 1 },
      });
      const b = await prisma.station.create({
        data: { warehouseId, x: 2, y: 2, name: 'S', direction: 'north' },
      });

      const responses = await Promise.all([
        patchMap(owner, [
          { type: 'move', objectType: 'obstacle', objectId: a.id, x: 8, y: 8 },
        ]),
        patchMap(owner, [
          { type: 'move', objectType: 'station', objectId: b.id, x: 8, y: 8 },
        ]),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([
        204, 422,
      ]);
      expect(await objectsAt(8, 8)).toBe(1);
    });

    it('validates a waiting request against the latest committed state', async () => {
      let settled = false;
      const held = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM warehouses WHERE id = ${warehouseId}::uuid FOR UPDATE
        `;
        const pending = patchMap(owner, [station(4, 4)]).then((response) => {
          settled = true;

          return response;
        });
        await sleep(300);
        expect(settled).toBe(false);
        // Committed by the lock holder while the request is waiting.
        await tx.obstacle.create({ data: { warehouseId, x: 4, y: 4 } });

        return { pending };
      });

      const response = await held.pending;
      expect(response.status).toBe(422);
      expect(await objectsAt(4, 4)).toBe(1);
      expect((await snapshot()).stations).toEqual([]);
    });
  });

  describe('cascading deletion', () => {
    it('removes map objects with the warehouse', async () => {
      await patchMap(owner, [
        obstacle(1, 1),
        station(5, 5),
        robot(5, 6),
      ]).expect(204);

      await owner.agent
        .delete(`/warehouses/${warehouseId}`)
        .set('X-CSRF-Token', owner.csrfToken)
        .expect(204);

      expect(await snapshot()).toEqual(empty);
    });

    it('removes map objects when the owner is deleted', async () => {
      await patchMap(owner, [obstacle(1, 1)]).expect(204);

      await prisma.user.delete({ where: { id: ownerId } });

      expect(await prisma.obstacle.count()).toBe(0);
    });
  });

  describe('database constraints', () => {
    it('rejects negative coordinates and same-table duplicates', async () => {
      await expect(
        prisma.obstacle.create({ data: { warehouseId, x: -1, y: 0 } }),
      ).rejects.toThrow();
      await prisma.robot.create({
        data: { warehouseId, x: 1, y: 1, name: 'R' },
      });
      await expect(
        prisma.robot.create({ data: { warehouseId, x: 1, y: 1, name: 'R2' } }),
      ).rejects.toThrow();
    });
  });
});
