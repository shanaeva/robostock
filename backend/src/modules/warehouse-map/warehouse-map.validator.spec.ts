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
const MISSING_ID = '99999999-9999-4999-8999-999999999999';

const snapshotObjects: MapObjectSnapshot[] = [
  { id: OBSTACLE_ID, objectType: 'obstacle', x: 1, y: 1 },
  { id: STATION_ID, objectType: 'station', x: 2, y: 2 },
  { id: ROBOT_ID, objectType: 'robot', x: 3, y: 3 },
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
  objectType: 'obstacle' | 'station',
  objectId: string,
  x: number,
  y: number,
): ObjectChange => ({ type: 'move', objectType, objectId, x, y });

const validate = (changes: ObjectChange[], map = makeMap()) =>
  validateObjectChanges(map, changes);

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
      ['robot', createObstacle(3, 3)],
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
      const changes = [remove('robot', ROBOT_ID), createObstacle(3, 3)];
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
      ['robot', move('obstacle', OBSTACLE_ID, 3, 3)],
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
        createRobot(8, 8),
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

  describe('batches', () => {
    it('accepts a valid sequence of mixed operations in order', () => {
      const changes = [
        createObstacle(5, 5),
        move('obstacle', OBSTACLE_ID, 5, 6),
        remove('station', STATION_ID),
        createRobot(2, 2),
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
        createStation(19, 0),
      ];
      expect(validate(changes)).toEqual({ valid: true, operations: changes });
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
        createRobot(2, 2),
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
      const changes = [remove('station', STATION_ID), createRobot(2, 2)];
      const map = makeMap();
      expect(validateObjectChanges(map, changes)).toEqual(
        validateObjectChanges(map, changes),
      );
    });
  });
});
