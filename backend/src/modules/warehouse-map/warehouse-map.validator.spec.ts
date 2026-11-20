import { describe, expect, it } from 'vitest';
import type { ObjectChange } from './warehouse-map.schemas.js';
import {
  validateObjectChanges,
  type MapObjectSnapshot,
  type WarehouseMapState,
} from './warehouse-map.validator.js';

const OBSTACLE_ID = '11111111-1111-4111-8111-111111111111';
const STATION_ID = '22222222-2222-4222-8222-222222222222';
const ROBOT_ID = '33333333-3333-4333-8333-333333333333';
const SECOND_STATION_ID = '44444444-4444-4444-8444-444444444444';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const snapshotObjects: MapObjectSnapshot[] = [
  { id: OBSTACLE_ID, objectType: 'obstacle', x: 1, y: 1 },
  { id: STATION_ID, objectType: 'station', x: 2, y: 2 },
  { id: ROBOT_ID, objectType: 'robot', x: 2, y: 3 },
  { id: SECOND_STATION_ID, objectType: 'station', x: 2, y: 4 },
];

const makeMap = (
  objects: MapObjectSnapshot[] = snapshotObjects,
): WarehouseMapState => ({ width: 20, height: 20, objects });

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

const validate = (changes: ObjectChange[], map = makeMap()) =>
  validateObjectChanges(map, changes);

const adjacencyFailure = (
  x: number,
  y: number,
  extra: { robotId?: string; index?: number } = {},
) => ({
  valid: false,
  failure: { reason: 'ROBOT_NOT_ADJACENT_TO_STATION', x, y, ...extra },
});

describe('validateObjectChanges', () => {
  describe('create', () => {
    it('accepts creating an object in an empty cell', () => {
      const change = createObstacle(5, 5);
      expect(validate([change])).toEqual({ valid: true, operations: [change] });
    });

    it('rejects creating an object outside the map', () => {
      const change = createRobot(20, 5);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'OUT_OF_BOUNDS', change },
      });
      expect(validate([createObstacle(-1, 0)])).toMatchObject({
        failure: { reason: 'OUT_OF_BOUNDS' },
      });
      expect(validate([createObstacle(0, 20)])).toMatchObject({
        failure: { reason: 'OUT_OF_BOUNDS' },
      });
    });

    it('rejects overlap with an object of the same type', () => {
      const change = createObstacle(1, 1);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'CELL_OCCUPIED', change },
      });
    });

    it.each([
      ['obstacle', createStation(1, 1)],
      ['station', createRobot(2, 2)],
      ['robot', createObstacle(2, 3)],
    ])(
      'rejects overlap with an existing %s of a different type',
      (_t, change) => {
        expect(validate([change])).toMatchObject({
          valid: false,
          failure: { index: 0, reason: 'CELL_OCCUPIED' },
        });
      },
    );

    it('rejects two creations at the same coordinates in one batch', () => {
      const second = createRobot(7, 7);
      expect(validate([createObstacle(7, 7), second])).toEqual({
        valid: false,
        failure: { index: 1, reason: 'CELL_OCCUPIED', change: second },
      });
    });
  });

  describe('delete', () => {
    it('accepts deleting an existing object', () => {
      const change = remove('station', STATION_ID);
      expect(validate([change])).toEqual({ valid: true, operations: [change] });
    });

    it('rejects deleting a nonexistent object with NOT_FOUND', () => {
      const change = remove('robot', MISSING_ID);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'NOT_FOUND', change },
      });
    });

    it('rejects deleting the same object twice', () => {
      const second = remove('obstacle', OBSTACLE_ID);
      expect(validate([remove('obstacle', OBSTACLE_ID), second])).toEqual({
        valid: false,
        failure: { index: 1, reason: 'NOT_FOUND', change: second },
      });
    });

    it('rejects a wrong objectType for an existing objectId', () => {
      const change = remove('robot', OBSTACLE_ID);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'NOT_FOUND', change },
      });
    });

    it('frees the cell for a later creation', () => {
      const changes = [remove('robot', ROBOT_ID), createObstacle(2, 3)];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });
  });

  describe('move', () => {
    it.each([
      ['obstacle', move('obstacle', OBSTACLE_ID, 10, 10)],
      ['station', move('station', STATION_ID, 0, 19)],
    ])('accepts moving a %s to an empty cell', (_t, change) => {
      expect(validate([change])).toEqual({ valid: true, operations: [change] });
    });

    it('rejects moving an object outside the map', () => {
      const change = move('obstacle', OBSTACLE_ID, 20, 0);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'OUT_OF_BOUNDS', change },
      });
      expect(validate([move('station', STATION_ID, 0, -1)])).toMatchObject({
        failure: { reason: 'OUT_OF_BOUNDS' },
      });
    });

    it.each([
      ['obstacle', move('station', STATION_ID, 1, 1)],
      ['station', move('obstacle', OBSTACLE_ID, 2, 2)],
      ['robot', move('obstacle', OBSTACLE_ID, 2, 3)],
    ])('rejects moving into a cell occupied by a %s', (_t, change) => {
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'CELL_OCCUPIED', change },
      });
    });

    it('treats moving to the current cell as a valid no-op', () => {
      const result = validate([move('obstacle', OBSTACLE_ID, 1, 1)]);
      expect(result).toEqual({ valid: true, operations: [] });
    });

    it('keeps a no-op move from releasing the cell', () => {
      expect(
        validate([move('obstacle', OBSTACLE_ID, 1, 1), createRobot(1, 1)]),
      ).toMatchObject({
        failure: { index: 1, reason: 'CELL_OCCUPIED' },
      });
    });

    it('frees the old cell for reuse later in the batch', () => {
      const changes = [
        move('obstacle', OBSTACLE_ID, 10, 10),
        createStation(1, 1),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });

    it('occupies the new cell after a move', () => {
      const blocked = createObstacle(10, 10);
      expect(
        validate([move('obstacle', OBSTACLE_ID, 10, 10), blocked]),
      ).toEqual({
        valid: false,
        failure: { index: 1, reason: 'CELL_OCCUPIED', change: blocked },
      });
    });

    it('tracks the moved position for later operations', () => {
      const changes = [
        move('station', STATION_ID, 8, 8),
        move('obstacle', OBSTACLE_ID, 2, 2),
        remove('station', STATION_ID),
        createObstacle(8, 8),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });

    it('rejects an unknown objectId with NOT_FOUND', () => {
      const change = move('station', MISSING_ID, 5, 5);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'NOT_FOUND', change },
      });
    });

    it('rejects an incorrect objectType for an existing objectId', () => {
      const change = move('station', OBSTACLE_ID, 5, 5);
      expect(validate([change])).toEqual({
        valid: false,
        failure: { index: 0, reason: 'NOT_FOUND', change },
      });
    });

    it('reports NOT_FOUND before OUT_OF_BOUNDS', () => {
      expect(validate([move('station', MISSING_ID, 99, 99)])).toMatchObject({
        failure: { reason: 'NOT_FOUND' },
      });
    });
  });

  describe('robots and charging stations', () => {
    it('accepts moving a robot to an empty cell next to a station', () => {
      const change = move('robot', ROBOT_ID, 3, 2);
      expect(validate([change])).toEqual({ valid: true, operations: [change] });
    });

    it('rejects moving a robot away from every station', () => {
      expect(validate([move('robot', ROBOT_ID, 10, 10)])).toEqual(
        adjacencyFailure(10, 10, { robotId: ROBOT_ID }),
      );
    });

    it('rejects moving a robot outside the map or onto an object', () => {
      expect(validate([move('robot', ROBOT_ID, -1, 3)])).toMatchObject({
        failure: { index: 0, reason: 'OUT_OF_BOUNDS' },
      });
      expect(validate([move('robot', ROBOT_ID, 2, 2)])).toMatchObject({
        failure: { index: 0, reason: 'CELL_OCCUPIED' },
      });
    });

    it('rejects moving a robot with the wrong objectType', () => {
      expect(validate([move('robot', STATION_ID, 3, 2)])).toMatchObject({
        failure: { index: 0, reason: 'NOT_FOUND' },
      });
    });

    it.each([
      ['west', 1, 5],
      ['east', 3, 5],
      ['north', 2, 4],
      ['south', 2, 6],
    ])('accepts a created robot with a station to the %s', (_d, x, y) => {
      const changes = [createStation(2, 5), createRobot(x, y)];
      expect(validate(changes, makeMap([]))).toEqual({
        valid: true,
        operations: changes,
      });
    });

    it('rejects a created robot that only touches a station diagonally', () => {
      const result = validate(
        [createStation(5, 5), createRobot(6, 6)],
        makeMap([]),
      );
      expect(result).toMatchObject({
        valid: false,
        failure: { reason: 'ROBOT_NOT_ADJACENT_TO_STATION' },
      });
    });

    it('rejects a created robot next to an obstacle or another robot', () => {
      expect(
        validate([createObstacle(5, 5), createRobot(5, 6)], makeMap([])),
      ).toMatchObject({
        failure: { reason: 'ROBOT_NOT_ADJACENT_TO_STATION' },
      });
      expect(validate([createRobot(3, 3)])).toMatchObject({
        failure: { reason: 'ROBOT_NOT_ADJACENT_TO_STATION' },
      });
    });

    it('rejects a robot on a map without stations', () => {
      expect(validate([createRobot(5, 5)], makeMap([]))).toMatchObject({
        failure: { reason: 'ROBOT_NOT_ADJACENT_TO_STATION' },
      });
    });

    it('rejects deleting the only stations next to a robot', () => {
      const changes = [
        remove('station', STATION_ID),
        remove('station', SECOND_STATION_ID),
      ];
      expect(validate(changes)).toEqual(
        adjacencyFailure(2, 3, { robotId: ROBOT_ID }),
      );
    });

    it('accepts deleting a station when another one stays adjacent', () => {
      const change = remove('station', STATION_ID);
      expect(validate([change])).toEqual({ valid: true, operations: [change] });
    });

    it('rejects moving the only adjacent stations away', () => {
      const changes = [
        move('station', STATION_ID, 10, 10),
        move('station', SECOND_STATION_ID, 12, 12),
      ];
      expect(validate(changes)).toEqual(
        adjacencyFailure(2, 3, { robotId: ROBOT_ID }),
      );
    });

    it('validates adjacency against the final state of the batch', () => {
      const changes = [
        remove('station', STATION_ID),
        remove('station', SECOND_STATION_ID),
        createStation(1, 3),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });

    it('accepts a robot created before its station in the same batch', () => {
      const changes = [createRobot(8, 8), createStation(8, 9)];
      expect(validate(changes, makeMap([]))).toEqual({
        valid: true,
        operations: changes,
      });
    });

    it('accepts moving a robot and its station in one batch', () => {
      const changes = [
        move('robot', ROBOT_ID, 10, 10),
        move('station', STATION_ID, 10, 11),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });

    it('reports another robot that loses its only station', () => {
      const otherRobotId = '66666666-6666-4666-8666-666666666666';
      const otherStationId = '55555555-5555-4555-8555-555555555555';
      const objects: MapObjectSnapshot[] = [
        ...snapshotObjects,
        { id: otherRobotId, objectType: 'robot', x: 15, y: 15 },
        { id: otherStationId, objectType: 'station', x: 15, y: 16 },
      ];
      expect(
        validate([remove('station', otherStationId)], makeMap(objects)),
      ).toEqual(adjacencyFailure(15, 15, { robotId: otherRobotId }));
    });

    it('prefers per-operation failures over the final adjacency check', () => {
      expect(
        validate([createRobot(10, 10), createObstacle(2, 2)]),
      ).toMatchObject({
        failure: { index: 1, reason: 'CELL_OCCUPIED' },
      });
    });

    it('rejects an invalid final map for a batch of only no-op moves', () => {
      const map = makeMap([{ id: ROBOT_ID, objectType: 'robot', x: 9, y: 9 }]);
      expect(validate([move('robot', ROBOT_ID, 9, 9)], map)).toEqual(
        adjacencyFailure(9, 9, { robotId: ROBOT_ID }),
      );
    });

    it('accepts a valid final map for a batch of only no-op moves', () => {
      expect(validate([move('robot', ROBOT_ID, 2, 3)])).toEqual({
        valid: true,
        operations: [],
      });
    });

    it('reports the create index of a newly created robot', () => {
      expect(validate([createObstacle(5, 5), createRobot(10, 10)])).toEqual(
        adjacencyFailure(10, 10, { index: 1 }),
      );
    });

    it('reports no index for a robot stranded by a station deletion', () => {
      const result = validate([
        remove('station', STATION_ID),
        remove('station', SECOND_STATION_ID),
      ]);
      expect(result).toEqual(adjacencyFailure(2, 3, { robotId: ROBOT_ID }));
      expect(result).not.toHaveProperty('failure.index');
    });

    it('reports no index for a robot stranded by a station move', () => {
      const result = validate([
        move('station', STATION_ID, 10, 10),
        move('station', SECOND_STATION_ID, 12, 12),
      ]);
      expect(result).toEqual(adjacencyFailure(2, 3, { robotId: ROBOT_ID }));
    });

    it('reports the persisted id for a moved robot, without an index', () => {
      expect(validate([move('robot', ROBOT_ID, 10, 10)])).toEqual(
        adjacencyFailure(10, 10, { robotId: ROBOT_ID }),
      );
    });
  });

  describe('batches', () => {
    it('accepts a valid sequence of mixed operations in order', () => {
      const changes = [
        createObstacle(5, 5),
        move('obstacle', OBSTACLE_ID, 5, 6),
        remove('station', STATION_ID),
        createRobot(3, 4),
        move('obstacle', OBSTACLE_ID, 5, 7),
        createStation(5, 6),
        remove('robot', ROBOT_ID),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
    });

    it('fails the whole batch when only the last operation fails', () => {
      const last = move('station', STATION_ID, 1, 1);
      const result = validate([
        createObstacle(5, 5),
        createRobot(6, 6),
        remove('robot', ROBOT_ID),
        last,
      ]);
      expect(result).toEqual({
        valid: false,
        failure: { index: 3, reason: 'CELL_OCCUPIED', change: last },
      });
    });

    it('stops at the first failing operation', () => {
      const result = validate([
        createObstacle(5, 5),
        createObstacle(5, 5),
        createObstacle(30, 30),
      ]);
      expect(result).toMatchObject({
        failure: { index: 1, reason: 'CELL_OCCUPIED' },
      });
    });

    it('accepts the corner cells 0 and 19 on a 20x20 map', () => {
      const changes = [
        createObstacle(0, 0),
        createObstacle(19, 19),
        createRobot(0, 19),
        createStation(0, 18),
        createStation(19, 0),
      ];
      expect(validate(changes, makeMap([]))).toEqual({
        valid: true,
        operations: changes,
      });
    });

    it('uses the provided dimensions', () => {
      const small = { width: 3, height: 2, objects: [] };
      expect(
        validateObjectChanges(small, [createObstacle(2, 1)]),
      ).toMatchObject({ valid: true });
      expect(
        validateObjectChanges(small, [createObstacle(3, 1)]),
      ).toMatchObject({ valid: false });
      expect(
        validateObjectChanges(small, [createObstacle(2, 2)]),
      ).toMatchObject({ valid: false });
    });

    it('does not mutate the snapshot or the changes', () => {
      const objects = snapshotObjects.map((o) => ({ ...o }));
      const map = makeMap(objects);
      const changes = [
        move('obstacle', OBSTACLE_ID, 10, 10),
        remove('station', STATION_ID),
        createRobot(3, 4),
      ];
      const objectsBefore = structuredClone(objects);
      const changesBefore = structuredClone(changes);

      validateObjectChanges(map, changes);
      validateObjectChanges(map, [createObstacle(1, 1)]);

      expect(map.objects).toBe(objects);
      expect(objects).toEqual(objectsBefore);
      expect(changes).toEqual(changesBefore);
    });

    it('gives the same result when called twice on the same snapshot', () => {
      const changes = [remove('station', STATION_ID), createRobot(3, 4)];
      const map = makeMap();
      expect(validateObjectChanges(map, changes)).toEqual(
        validateObjectChanges(map, changes),
      );
    });
  });
});
