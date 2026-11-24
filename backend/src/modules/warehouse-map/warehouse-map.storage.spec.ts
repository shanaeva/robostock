import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PrismaWarehouseMapStorage } from './warehouse-map.storage.js';
import type { WarehouseMapTransaction } from './warehouse-map.service.js';

const WAREHOUSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OBJECT_ID = '33333333-3333-4333-8333-333333333333';

function delegate() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
}

describe('PrismaWarehouseMapStorage', () => {
  const calls: string[] = [];
  const tx = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    warehouse: { update: vi.fn() },
    obstacle: delegate(),
    station: delegate(),
    robot: delegate(),
  };
  const $transaction = vi.fn();
  let storage: PrismaWarehouseMapStorage;

  const run = <T>(work: (t: WarehouseMapTransaction) => Promise<T>) =>
    storage.runInTransaction(work);

  beforeEach(() => {
    calls.length = 0;
    tx.$executeRaw.mockReset();
    tx.$queryRaw.mockReset();
    tx.$queryRaw.mockResolvedValue([{ width: 20, height: 20 }]);
    tx.warehouse.update.mockReset();
    for (const model of [tx.obstacle, tx.station, tx.robot]) {
      model.findMany.mockReset().mockResolvedValue([]);
      model.create.mockReset().mockResolvedValue({});
      model.updateMany.mockReset().mockResolvedValue({ count: 1 });
      model.deleteMany.mockReset().mockResolvedValue({ count: 1 });
    }
    $transaction.mockReset();
    $transaction.mockImplementation((fn: (client: typeof tx) => unknown) =>
      fn(tx),
    );
    storage = new PrismaWarehouseMapStorage({
      $transaction,
    } as unknown as PrismaService);
  });

  it('runs the work in one transaction without overriding isolation', async () => {
    await run(() => Promise.resolve());

    expect($transaction).toHaveBeenCalledOnce();
    const options = $transaction.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(options).toMatchObject({ timeout: 10_000, maxWait: 2_000 });
    // READ COMMITTED (the default) is required after waiting for the lock.
    expect(options).not.toHaveProperty('isolationLevel');
  });

  it('locks the warehouse row with a parameterized query', async () => {
    await run((t) => t.loadWarehouseMap(WAREHOUSE_ID, OWNER_ID));

    const [strings, ...values] = tx.$queryRaw.mock.calls[0] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    expect(strings.join('?')).toMatch(/FOR NO KEY UPDATE/);
    expect(strings.join('?')).not.toContain(WAREHOUSE_ID);
    expect(strings.join('?')).toContain('"ownerId" = ?::uuid');
    expect(values).toEqual([WAREHOUSE_ID, OWNER_ID]);
  });

  it('limits the lock wait before locking', async () => {
    await run((t) => t.loadWarehouseMap(WAREHOUSE_ID, OWNER_ID));

    const [strings] = tx.$executeRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join('')).toBe("SET LOCAL lock_timeout = '3s'");
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.$queryRaw.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('returns null without loading objects for an unknown warehouse', async () => {
    tx.$queryRaw.mockResolvedValue([]);

    await expect(
      run((t) => t.loadWarehouseMap(WAREHOUSE_ID, OWNER_ID)),
    ).resolves.toBeNull();
    expect(tx.obstacle.findMany).not.toHaveBeenCalled();
  });

  it('locks first, then loads all three object tables', async () => {
    tx.$queryRaw.mockImplementation(() => {
      calls.push('lock');

      return Promise.resolve([{ width: 20, height: 10 }]);
    });
    for (const model of [tx.obstacle, tx.station, tx.robot]) {
      model.findMany.mockImplementation(() => {
        calls.push('load');

        return Promise.resolve([]);
      });
    }
    tx.obstacle.findMany.mockImplementationOnce(() => {
      calls.push('load');

      return Promise.resolve([{ id: 'o', x: 1, y: 2 }]);
    });
    tx.station.findMany.mockResolvedValueOnce([{ id: 's', x: 3, y: 4 }]);
    tx.robot.findMany.mockResolvedValueOnce([{ id: 'r', x: 3, y: 5 }]);

    const map = await run((t) => t.loadWarehouseMap(WAREHOUSE_ID, OWNER_ID));

    expect(calls[0]).toBe('lock');
    expect(map).toEqual({
      width: 20,
      height: 10,
      objects: [
        { id: 'o', x: 1, y: 2, objectType: 'obstacle' },
        { id: 's', x: 3, y: 4, objectType: 'station' },
        { id: 'r', x: 3, y: 5, objectType: 'robot' },
      ],
    });
    expect(tx.station.findMany).toHaveBeenCalledWith({
      where: { warehouseId: WAREHOUSE_ID },
      select: { id: true, x: true, y: true },
    });
  });

  it('creates objects of every type scoped to the warehouse', async () => {
    await run((t) =>
      t.applyOperations(WAREHOUSE_ID, [
        { type: 'create', objectType: 'obstacle', x: 1, y: 2 },
        {
          type: 'create',
          objectType: 'station',
          name: 'S',
          x: 3,
          y: 4,
          direction: 'north',
        },
        { type: 'create', objectType: 'robot', name: 'R', x: 5, y: 6 },
      ]),
    );

    expect(tx.obstacle.create).toHaveBeenCalledWith({
      data: { warehouseId: WAREHOUSE_ID, x: 1, y: 2 },
    });
    expect(tx.station.create).toHaveBeenCalledWith({
      data: {
        warehouseId: WAREHOUSE_ID,
        x: 3,
        y: 4,
        name: 'S',
        direction: 'north',
      },
    });
    expect(tx.robot.create).toHaveBeenCalledWith({
      data: { warehouseId: WAREHOUSE_ID, x: 5, y: 6, name: 'R' },
    });
  });

  it('deletes a robot scoped by warehouse id', async () => {
    await run((t) =>
      t.applyOperations(WAREHOUSE_ID, [
        { type: 'delete', objectType: 'robot', objectId: OBJECT_ID },
      ]),
    );

    expect(tx.robot.deleteMany).toHaveBeenCalledWith({
      where: { id: OBJECT_ID, warehouseId: WAREHOUSE_ID },
    });
  });

  it.each(['obstacle', 'station'] as const)(
    'moves and deletes a %s scoped by warehouse id',
    async (objectType) => {
      await run((t) =>
        t.applyOperations(WAREHOUSE_ID, [
          { type: 'move', objectType, objectId: OBJECT_ID, x: 7, y: 8 },
          { type: 'delete', objectType, objectId: OBJECT_ID },
        ]),
      );

      const model = tx[objectType];
      const where = { id: OBJECT_ID, warehouseId: WAREHOUSE_ID };
      expect(model.updateMany).toHaveBeenCalledWith({
        where,
        data: { x: 7, y: 8 },
      });
      expect(model.deleteMany).toHaveBeenCalledWith({ where });
    },
  );

  it('executes operations strictly in order', async () => {
    tx.obstacle.deleteMany.mockImplementation(() => {
      calls.push('delete');

      return Promise.resolve({ count: 1 });
    });
    tx.robot.create.mockImplementation(() => {
      calls.push('create');

      return Promise.resolve({});
    });
    tx.station.updateMany.mockImplementation(() => {
      calls.push('move');

      return Promise.resolve({ count: 1 });
    });

    await run((t) =>
      t.applyOperations(WAREHOUSE_ID, [
        { type: 'delete', objectType: 'obstacle', objectId: OBJECT_ID },
        { type: 'create', objectType: 'robot', name: 'R', x: 1, y: 1 },
        {
          type: 'move',
          objectType: 'station',
          objectId: OBJECT_ID,
          x: 2,
          y: 2,
        },
      ]),
    );

    expect(calls).toEqual(['delete', 'create', 'move']);
  });

  it.each([
    [
      'move',
      { type: 'move', objectType: 'station', objectId: OBJECT_ID, x: 1, y: 1 },
      'updateMany',
    ],
    [
      'delete',
      { type: 'delete', objectType: 'station', objectId: OBJECT_ID },
      'deleteMany',
    ],
  ] as const)(
    'aborts the batch when a %s affects no row',
    async (_name, operation, method) => {
      tx.station[method].mockResolvedValue({ count: 0 });

      await expect(
        run((t) => t.applyOperations(WAREHOUSE_ID, [operation])),
      ).rejects.toThrow('Map object disappeared');
    },
  );

  it('touches only the given warehouse', async () => {
    await run((t) => t.touchWarehouse(WAREHOUSE_ID));

    expect(tx.warehouse.update).toHaveBeenCalledWith({
      where: { id: WAREHOUSE_ID },
      data: { updatedAt: expect.any(Date) as Date },
    });
  });

  it.each([
    ['an expired or unavailable transaction', 'P2028', undefined],
    ['a lock timeout', 'P2010', '55P03'],
  ])('reports %s as 503', async (_name, code, originalCode) => {
    $transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('busy', {
        code,
        clientVersion: 'unit-test',
        meta: { driverAdapterError: { cause: { originalCode } } },
      }),
    );

    await expect(run(() => Promise.resolve())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does not disguise other database errors as 503', async () => {
    const failure = new Prisma.PrismaClientKnownRequestError('syntax error', {
      code: 'P2010',
      clientVersion: 'unit-test',
      meta: { driverAdapterError: { cause: { originalCode: '42601' } } },
    });
    $transaction.mockRejectedValue(failure);

    await expect(run(() => Promise.resolve())).rejects.toBe(failure);
  });

  it('propagates work failures so Prisma rolls the transaction back', async () => {
    const failure = new Error('boom');

    await expect(run(() => Promise.reject(failure))).rejects.toBe(failure);
  });
});
