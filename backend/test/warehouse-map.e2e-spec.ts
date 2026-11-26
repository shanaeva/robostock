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
import { warehouseDetailsSchema } from '../src/modules/warehouses/warehouses.schemas.js';
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
  const station = (
    x: number,
    y: number,
    name = 'Station',
    direction: 'north' | 'south' | 'east' | 'west' = 'north',
  ) =>
    ({
      type: 'create',
      objectType: 'station',
      name,
      x,
      y,
      direction,
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
  // Validates the response against the published contract.
  const getMap = async (id = warehouseId) => {
    const response = await owner.agent.get(`/warehouses/${id}`).expect(200);

    return warehouseDetailsSchema.parse(response.body);
  };
  const notFound = { statusCode: 404, message: 'Склад не найден.' };
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

    it('rejects an invalid CSRF token and an invalid session', async () => {
      const path = `/warehouses/${warehouseId}/objects`;
      await owner.agent
        .patch(path)
        .set('X-CSRF-Token', 'forged')
        .send({ changes: [obstacle(1, 1)] })
        .expect(403);
      await request(server)
        .patch(path)
        .set('Cookie', [`csrf_token=${owner.csrfToken}`, 'access_token=forged'])
        .set('X-CSRF-Token', owner.csrfToken)
        .send({ changes: [obstacle(1, 1)] })
        .expect(401);
      await request(server).get(`/warehouses/${warehouseId}`).expect(401);
      expect(await objectsAt(1, 1)).toBe(0);
    });

    it('answers identically for foreign and unknown warehouses', async () => {
      const other = await login(otherEmail);
      const before = await updatedAt();
      const unknownId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

      for (const id of [warehouseId, unknownId]) {
        await patchMap(other, [obstacle(1, 1)], id).expect(404, notFound);
        await other.agent.get(`/warehouses/${id}`).expect(404, notFound);
      }

      expect(await objectsAt(1, 1)).toBe(0);
      expect(await updatedAt()).toBe(before);
    });

    it("does not wait for a lock on another user's warehouse", async () => {
      const other = await login(otherEmail);

      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT id FROM warehouses WHERE id = ${warehouseId}::uuid FOR UPDATE
        `;
        const started = Date.now();
        await patchMap(other, [obstacle(1, 1)]).expect(404, notFound);
        // Well below the 3 s lock timeout.
        expect(Date.now() - started).toBeLessThan(1500);
      });
    });
  });

  describe('editor workflow', () => {
    it('creates, reads, moves and deletes objects using ids from GET', async () => {
      const created = await owner.agent
        .post('/warehouses')
        .set('X-CSRF-Token', owner.csrfToken)
        .send({ name: 'Workflow warehouse', width: 30, height: 15 })
        .expect(201);
      const { warehouseId: id } = created.body as { warehouseId: string };
      expect(await getMap(id)).toMatchObject(empty);

      await patchMap(
        owner,
        [obstacle(29, 14), station(5, 5, 'Charger'), robot(5, 6, 'R-1')],
        id,
      ).expect(204, '');

      const map = await getMap(id);
      const [o, s, r] = [map.obstacles[0], map.stations[0], map.robots[0]];

      if (!o || !s || !r) {
        throw new Error('GET did not return the created objects');
      }
      expect(map).toMatchObject({ id, ownerId, width: 30, height: 15 });
      // Exact equality: no internal columns may leak into the response.
      expect(map.obstacles).toEqual([{ id: o.id, x: 29, y: 14 }]);
      expect(map.stations).toEqual([
        { id: s.id, name: 'Charger', x: 5, y: 5, direction: 'north' },
      ]);
      expect(map.robots).toEqual([{ id: r.id, name: 'R-1', x: 5, y: 6 }]);

      await patchMap(
        owner,
        [
          { type: 'move', objectType: 'obstacle', objectId: o.id, x: 2, y: 3 },
          { type: 'move', objectType: 'station', objectId: s.id, x: 4, y: 6 },
        ],
        id,
      ).expect(204);
      const moved = await getMap(id);
      expect(moved.obstacles).toEqual([{ id: o.id, x: 2, y: 3 }]);
      expect(moved.stations).toMatchObject([{ id: s.id, x: 4, y: 6 }]);
      expect(moved.robots).toEqual(map.robots);

      await patchMap(
        owner,
        [{ type: 'delete', objectType: 'obstacle', objectId: o.id }],
        id,
      ).expect(204);
      expect(await getMap(id)).toMatchObject({
        obstacles: [],
        stations: [{ id: s.id }],
        robots: [{ id: r.id }],
      });
    });

    it('never returns a half-applied map', async () => {
      await patchMap(owner, [obstacle(3, 3)]).expect(204);
      const maps: Awaited<ReturnType<typeof getMap>>[] = [];
      const edits = (async () => {
        for (let i = 0; i < 10; i += 1) {
          const { obstacles, stations } = await getMap();
          const [o] = obstacles;
          const [s] = stations;
          await patchMap(
            owner,
            o
              ? [
                  { type: 'delete', objectType: 'obstacle', objectId: o.id },
                  station(3, 3),
                ]
              : [
                  { type: 'delete', objectType: 'station', objectId: s?.id },
                  obstacle(3, 3),
                ],
          ).expect(204);
        }
      })();
      const reads = Array.from({ length: 3 }, async () => {
        for (let i = 0; i < 20; i += 1) {
          maps.push(await getMap());
        }
      });
      await Promise.all([edits, ...reads]);

      for (const { obstacles, stations } of maps) {
        expect(obstacles.length + stations.length).toBe(1);
      }
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

    it('moves obstacles and stations and deletes objects of every type', async () => {
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
        { type: 'move', objectType: 'station', objectId: s.id, x: 6, y: 6 },
      ]).expect(204);

      const moved = await snapshot();
      expect(moved.obstacles).toMatchObject([{ id: o.id, x: 2, y: 2 }]);
      expect(moved.stations).toMatchObject([
        { id: s.id, x: 6, y: 6, name: 'S', direction: 'east' },
      ]);
      expect(moved.robots).toMatchObject([{ id: r.id, x: 5, y: 6 }]);

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

    it.each(['north', 'south', 'east', 'west'] as const)(
      'accepts robots on all four sides of a station facing %s, never diagonally',
      async (direction) => {
        const charger = station(5, 5, 'S', direction);
        await patchMap(owner, [
          charger,
          robot(4, 5),
          robot(6, 5),
          robot(5, 4),
          robot(5, 6),
        ]).expect(204);
        await patchMap(owner, [robot(4, 4)]).expect(422);

        const map = await getMap();
        expect(map.robots).toHaveLength(4);
        expect(map.stations).toMatchObject([{ direction }]);
      },
    );

    it('rejects robot movement with 400 and keeps the robot in place', async () => {
      await patchMap(owner, [station(5, 5), robot(5, 6)]).expect(204);
      const { robots } = await getMap();

      await patchMap(owner, [
        obstacle(1, 1),
        {
          type: 'move',
          objectType: 'robot',
          objectId: robots[0]?.id,
          x: 5,
          y: 4,
        },
      ]).expect(400);

      expect((await getMap()).robots).toEqual(robots);
      expect(await objectsAt(1, 1)).toBe(0);
    });

    it('forbids deleting a station next to a robot and rolls back', async () => {
      await patchMap(owner, [station(5, 5), robot(5, 6)]).expect(204);
      const { stations, robots } = await getMap();
      const deleteStation = {
        type: 'delete',
        objectType: 'station',
        objectId: stations[0]?.id,
      };
      const deleteRobot = {
        type: 'delete',
        objectType: 'robot',
        objectId: robots[0]?.id,
      };
      const before = await snapshot();
      const touched = await updatedAt();

      await patchMap(owner, [obstacle(1, 1), deleteStation]).expect(422);
      // The order matters: the robot is still there when the station goes.
      await patchMap(owner, [deleteStation, deleteRobot]).expect(422);
      expect(await snapshot()).toEqual(before);
      expect(await updatedAt()).toBe(touched);

      await patchMap(owner, [deleteRobot, deleteStation]).expect(204);
      expect(await snapshot()).toEqual(empty);
    });

    it('forbids the deletion even when a second station is adjacent', async () => {
      await patchMap(owner, [
        station(5, 5, 'A'),
        robot(5, 6),
        station(5, 7, 'B'),
      ]).expect(204);
      const { stations } = await getMap();

      for (const { id } of stations) {
        await patchMap(owner, [
          { type: 'delete', objectType: 'station', objectId: id },
        ]).expect(422);
      }
      expect((await getMap()).stations).toEqual(stations);
    });

    it.each([
      [1, 1],
      [1, 500],
      [500, 1],
      [7, 3],
    ])('uses the stored dimensions of a %i×%i map', async (width, height) => {
      const created = await owner.agent
        .post('/warehouses')
        .set('X-CSRF-Token', owner.csrfToken)
        .send({ name: 'Sized warehouse', width, height })
        .expect(201);
      const { warehouseId: id } = created.body as { warehouseId: string };
      const [x, y] = [width - 1, height - 1];

      await patchMap(owner, [obstacle(width, y)], id).expect(422);
      await patchMap(owner, [obstacle(x, height)], id).expect(422);
      await patchMap(owner, [obstacle(x, y)], id).expect(204);
      expect((await getMap(id)).obstacles).toMatchObject([{ x, y }]);
    });

    it('accepts 400 changes per batch, rejects 401 and allows more objects in total', async () => {
      const cells = Array.from({ length: 401 }, (_, i) =>
        obstacle(i % 100, Math.floor(i / 100)),
      );
      await prisma.warehouse.update({
        where: { id: warehouseId },
        data: { width: 100 },
      });

      await patchMap(owner, cells).expect(400);
      expect(await snapshot()).toEqual(empty);
      await patchMap(owner, cells.slice(0, 400)).expect(204);
      await patchMap(owner, cells.slice(400)).expect(204);
      expect((await getMap()).obstacles).toHaveLength(401);
    });

    it('returns 400 for a name PostgreSQL cannot store', async () => {
      await patchMap(owner, [station(1, 1, 'a\0b')]).expect(400);
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

    it('returns 503 and saves nothing when the lock is held too long', async () => {
      const before = await updatedAt();

      await prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`
            SELECT id FROM warehouses WHERE id = ${warehouseId}::uuid FOR UPDATE
          `;
          await patchMap(owner, [obstacle(4, 4)]).expect(503, {
            statusCode: 503,
            message: 'Service unavailable',
          });
        },
        { timeout: 8000 },
      );

      expect(await objectsAt(4, 4)).toBe(0);
      expect(await updatedAt()).toBe(before);
      await patchMap(owner, [obstacle(4, 4)]).expect(204);
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
