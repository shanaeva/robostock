import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObjectChange } from './warehouse-map.schemas.js';
import {
  WAREHOUSE_MAP_STORAGE,
  WarehouseMapService,
  type WarehouseMapRecord,
  type WarehouseMapStorage,
  type WarehouseMapTransaction,
} from './warehouse-map.service.js';

const WAREHOUSE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OBSTACLE_ID = '11111111-1111-4111-8111-111111111111';
const STATION_ID = '22222222-2222-4222-8222-222222222222';
const ROBOT_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_STATION_ID = '44444444-4444-4444-8444-444444444444';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const warehouse: WarehouseMapRecord = {
  ownerId: OWNER_ID,
  width: 20,
  height: 20,
  objects: [
    { id: OBSTACLE_ID, objectType: 'obstacle', x: 1, y: 1 },
    { id: STATION_ID, objectType: 'station', x: 2, y: 2 },
    { id: ROBOT_ID, objectType: 'robot', x: 2, y: 3 },
    { id: SECOND_STATION_ID, objectType: 'station', x: 2, y: 4 },
  ],
};

const createObstacle = (x: number, y: number): ObjectChange => ({
  type: 'create',
  objectType: 'obstacle',
  x,
  y,
});
const createStation = (x: number, y: number): ObjectChange => ({
  type: 'create',
  objectType: 'station',
  name: 'Station',
  x,
  y,
  direction: 'north',
});
const createRobot = (x: number, y: number): ObjectChange => ({
  type: 'create',
  objectType: 'robot',
  name: 'Robot',
  x,
  y,
});
const remove = (
  objectType: 'obstacle' | 'station' | 'robot',
  objectId: string,
): ObjectChange => ({ type: 'delete', objectType, objectId });
const move = (
  objectType: 'obstacle' | 'station' | 'robot',
  objectId: string,
  x: number,
  y: number,
): ObjectChange => ({ type: 'move', objectType, objectId, x, y });

function createStorageMock() {
  const transaction = {
    loadWarehouseMap: vi.fn<WarehouseMapTransaction['loadWarehouseMap']>(),
    applyOperations: vi.fn<WarehouseMapTransaction['applyOperations']>(),
    touchWarehouse: vi.fn<WarehouseMapTransaction['touchWarehouse']>(),
  };
  const runInTransaction = vi.fn();
  const storage: WarehouseMapStorage = {
    runInTransaction: (work) => {
      runInTransaction();

      return work(transaction);
    },
  };

  return { storage, transaction, runInTransaction };
}

describe('WarehouseMapService', () => {
  let testingModule: TestingModule;
  let service: WarehouseMapService;
  let mock: ReturnType<typeof createStorageMock>;

  const applyAs = (userId: string, changes: ObjectChange[]) =>
    service.applyChanges(WAREHOUSE_ID, userId, changes);
  const apply = (changes: ObjectChange[]) => applyAs(OWNER_ID, changes);

  const expectNoWrites = () => {
    expect(mock.transaction.applyOperations).not.toHaveBeenCalled();
    expect(mock.transaction.touchWarehouse).not.toHaveBeenCalled();
  };

  const expectForwarded = (operations: ObjectChange[]) => {
    expect(mock.transaction.applyOperations).toHaveBeenCalledTimes(1);
    expect(mock.transaction.applyOperations).toHaveBeenCalledWith(
      WAREHOUSE_ID,
      operations,
    );
  };

  beforeEach(async () => {
    mock = createStorageMock();
    mock.transaction.loadWarehouseMap.mockResolvedValue(warehouse);
    mock.transaction.applyOperations.mockResolvedValue();
    mock.transaction.touchWarehouse.mockResolvedValue();
    testingModule = await Test.createTestingModule({
      providers: [
        WarehouseMapService,
        { provide: WAREHOUSE_MAP_STORAGE, useValue: mock.storage },
      ],
    }).compile();
    service = testingModule.get(WarehouseMapService);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('successful batches', () => {
    it.each([
      ['creates an obstacle', [createObstacle(5, 5)]],
      ['deletes an obstacle', [remove('obstacle', OBSTACLE_ID)]],
      ['moves an obstacle', [move('obstacle', OBSTACLE_ID, 8, 8)]],
      ['moves a station', [move('station', STATION_ID, 9, 9)]],
      ['deletes a robot', [remove('robot', ROBOT_ID)]],
      ['creates a robot next to a station', [createRobot(3, 2)]],
      ['moves a robot next to a station', [move('robot', ROBOT_ID, 3, 2)]],
    ])('%s and touches the warehouse', async (_name, changes) => {
      await expect(apply(changes)).resolves.toBeUndefined();
      expectForwarded(changes);
      expect(mock.transaction.touchWarehouse).toHaveBeenCalledExactlyOnceWith(
        WAREHOUSE_ID,
      );
    });

    it('loads and writes inside one transaction', async () => {
      await apply([createObstacle(5, 5)]);
      expect(mock.runInTransaction).toHaveBeenCalledTimes(1);
      expect(mock.transaction.loadWarehouseMap).toHaveBeenCalledWith(
        WAREHOUSE_ID,
      );
    });

    it('forwards several operations in their original order', async () => {
      const changes = [
        createObstacle(5, 5),
        move('obstacle', OBSTACLE_ID, 5, 6),
        remove('station', STATION_ID),
        createStation(5, 7),
        move('obstacle', OBSTACLE_ID, 5, 8),
      ];
      await apply(changes);
      expectForwarded(changes);
    });

    it('applies the writes before touching the warehouse', async () => {
      await apply([createObstacle(5, 5)]);
      const [applyOrder] =
        mock.transaction.applyOperations.mock.invocationCallOrder;
      const [touchOrder] =
        mock.transaction.touchWarehouse.mock.invocationCallOrder;
      expect(applyOrder).toBeLessThan(touchOrder ?? 0);
    });

    it('creates a robot together with its station in one batch', async () => {
      const changes = [createRobot(10, 10), createStation(10, 11)];
      await apply(changes);
      expectForwarded(changes);
    });

    it('accepts a batch that is only valid in its final state', async () => {
      const changes = [
        remove('station', STATION_ID),
        remove('station', SECOND_STATION_ID),
        createStation(1, 3),
      ];
      await apply(changes);
      expectForwarded(changes);
    });
  });

  describe('no-op moves', () => {
    it('does not write or touch the warehouse for a no-op batch', async () => {
      await expect(
        apply([move('obstacle', OBSTACLE_ID, 1, 1)]),
      ).resolves.toBeUndefined();
      expectNoWrites();
    });

    it('forwards only effective operations from a mixed batch', async () => {
      const effective = createObstacle(5, 5);
      await apply([
        move('obstacle', OBSTACLE_ID, 1, 1),
        effective,
        move('robot', ROBOT_ID, 2, 3),
      ]);
      expectForwarded([effective]);
      expect(mock.transaction.touchWarehouse).toHaveBeenCalledTimes(1);
    });

    it('still reports a missing object in a no-op move', async () => {
      await expect(
        apply([move('obstacle', MISSING_ID, 1, 1)]),
      ).rejects.toBeInstanceOf(NotFoundException);
      expectNoWrites();
    });
  });

  describe('warehouse access', () => {
    it('throws 404 when the warehouse does not exist', async () => {
      mock.transaction.loadWarehouseMap.mockResolvedValue(null);
      await expect(apply([createObstacle(5, 5)])).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expectNoWrites();
    });

    it('throws 403 when the user is not the owner', async () => {
      await expect(
        applyAs(OTHER_USER_ID, [createObstacle(5, 5)]),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expectNoWrites();
    });

    it('checks ownership before validating the changes', async () => {
      await expect(
        applyAs(OTHER_USER_ID, [remove('robot', MISSING_ID)]),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('validation failures', () => {
    it.each([
      ['a missing delete target', remove('obstacle', MISSING_ID)],
      ['a missing move target', move('station', MISSING_ID, 5, 5)],
      ['a wrong objectType', remove('robot', OBSTACLE_ID)],
    ])('throws 404 for %s', async (_name, change) => {
      await expect(apply([change])).rejects.toBeInstanceOf(NotFoundException);
      expectNoWrites();
    });

    it.each([
      ['an occupied create', createObstacle(1, 1)],
      ['an occupied move', move('obstacle', OBSTACLE_ID, 2, 2)],
      ['an occupied robot move', move('robot', ROBOT_ID, 1, 1)],
      ['an out-of-bounds create', createObstacle(20, 0)],
      ['a negative create', createObstacle(-1, 0)],
      ['an out-of-bounds move', move('station', STATION_ID, 0, 20)],
      ['an out-of-bounds robot move', move('robot', ROBOT_ID, 20, 3)],
    ])('throws 422 for %s', async (_name, change) => {
      await expect(apply([change])).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expectNoWrites();
    });

    it.each([
      ['a robot created away from stations', [createRobot(10, 10)]],
      [
        'a robot created next to an obstacle only',
        [createObstacle(10, 10), createRobot(10, 11)],
      ],
      ['a robot created diagonally to a station', [createRobot(3, 3)]],
      ['a robot moved away from stations', [move('robot', ROBOT_ID, 10, 10)]],
      [
        'a robot left without stations',
        [remove('station', STATION_ID), remove('station', SECOND_STATION_ID)],
      ],
      [
        'stations moved away from a robot',
        [
          move('station', STATION_ID, 10, 10),
          move('station', SECOND_STATION_ID, 12, 12),
        ],
      ],
    ])('throws 422 for %s', async (_name, changes) => {
      await expect(apply(changes)).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
      expectNoWrites();
    });

    it('rejects the whole batch when only the last change fails', async () => {
      await expect(
        apply([
          createObstacle(5, 5),
          createObstacle(6, 6),
          move('obstacle', OBSTACLE_ID, 7, 7),
          createObstacle(2, 2),
        ]),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expectNoWrites();
    });

    it('includes the failing change index in the message', async () => {
      await expect(
        apply([createObstacle(5, 5), createObstacle(5, 5)]),
      ).rejects.toThrow('Change 1: Cell is already occupied');
      await expect(apply([remove('robot', MISSING_ID)])).rejects.toThrow(
        'Change 0: Map object not found',
      );
    });

    it('names the robot cell in an adjacency failure', async () => {
      await expect(apply([createRobot(10, 10)])).rejects.toThrow(
        'Change 0: Robot at (10, 10) must be adjacent to a station',
      );
    });

    it('omits the change index for a robot stranded by a station change', async () => {
      await expect(
        apply([
          remove('station', STATION_ID),
          remove('station', SECOND_STATION_ID),
        ]),
      ).rejects.toThrow('Robot at (2, 3) must be adjacent to a station');
      await expect(
        apply([
          remove('station', STATION_ID),
          remove('station', SECOND_STATION_ID),
        ]),
      ).rejects.not.toThrow('Change');
    });

    it('rejects a no-op batch on an invalid map without writing', async () => {
      mock.transaction.loadWarehouseMap.mockResolvedValue({
        ...warehouse,
        objects: [{ id: ROBOT_ID, objectType: 'robot', x: 9, y: 9 }],
      });
      await expect(
        apply([move('robot', ROBOT_ID, 9, 9)]),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expectNoWrites();
    });
  });

  describe('storage failures', () => {
    it('propagates a failing write without touching the warehouse', async () => {
      const failure = new Error('write failed');
      mock.transaction.applyOperations.mockRejectedValue(failure);
      await expect(apply([createObstacle(5, 5)])).rejects.toBe(failure);
      expect(mock.transaction.touchWarehouse).not.toHaveBeenCalled();
    });

    it('propagates a failing timestamp update', async () => {
      const failure = new Error('touch failed');
      mock.transaction.touchWarehouse.mockRejectedValue(failure);
      await expect(apply([createObstacle(5, 5)])).rejects.toBe(failure);
    });

    it('propagates a failing load', async () => {
      const failure = new Error('load failed');
      mock.transaction.loadWarehouseMap.mockRejectedValue(failure);
      await expect(apply([createObstacle(5, 5)])).rejects.toBe(failure);
      expectNoWrites();
    });
  });
});
