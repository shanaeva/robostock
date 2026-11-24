import { describe, expect, it } from 'vitest';
import {
  MAX_CHANGES_PER_BATCH,
  batchObjectChangesSchema,
  objectChangeSchema,
} from './warehouse-map.schemas.js';

const ID = '33333333-3333-4333-8333-333333333333';

const createObstacle = { type: 'create', objectType: 'obstacle', x: 1, y: 2 };
const createStation = {
  type: 'create',
  objectType: 'station',
  name: 'Station 1',
  x: 3,
  y: 4,
  direction: 'north',
};
const createRobot = {
  type: 'create',
  objectType: 'robot',
  name: 'Robot 1',
  x: 5,
  y: 8,
};
const moveObstacle = {
  type: 'move',
  objectType: 'obstacle',
  objectId: ID,
  x: 7,
  y: 9,
};

describe('objectChangeSchema', () => {
  it.each([
    createObstacle,
    createStation,
    createRobot,
    { type: 'delete', objectType: 'obstacle', objectId: ID },
    { type: 'delete', objectType: 'station', objectId: ID },
    { type: 'delete', objectType: 'robot', objectId: ID },
    moveObstacle,
    { ...moveObstacle, objectType: 'station' },
  ])('accepts a valid operation (%#)', (input) => {
    expect(objectChangeSchema.parse(input)).toEqual(input);
  });

  it.each(['robot', 'wall'])('rejects moving a %s', (objectType) => {
    expect(
      objectChangeSchema.safeParse({ ...moveObstacle, objectType }).success,
    ).toBe(false);
  });

  it.each([
    { ...createStation, direction: 'up' },
    { ...createStation, direction: 'North' },
    { ...createStation, direction: undefined },
  ])('rejects an invalid station direction (%#)', (input) => {
    expect(objectChangeSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { ...moveObstacle, objectId: 'not-a-uuid' },
    { type: 'delete', objectType: 'robot', objectId: '123' },
    { type: 'delete', objectType: 'robot', objectId: null },
  ])('rejects an invalid UUID (%#)', (input) => {
    expect(objectChangeSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { objectType: 'obstacle', x: 1, y: 2 },
    { type: 'create', x: 1, y: 2 },
    { type: 'create', objectType: 'obstacle', y: 2 },
    { type: 'create', objectType: 'obstacle', x: 1 },
    { type: 'create', objectType: 'station', x: 1, y: 2, direction: 'north' },
    { type: 'create', objectType: 'station', name: 'S', x: 1, y: 2 },
    { type: 'create', objectType: 'robot', name: 'R', x: 1 },
    { type: 'create', objectType: 'robot', x: 1, y: 2 },
    { type: 'delete', objectId: ID },
    { type: 'delete', objectType: 'robot' },
    { type: 'move', objectType: 'obstacle', objectId: ID, x: 1 },
    { type: 'move', objectId: ID, x: 1, y: 2 },
  ])('rejects an operation with missing fields (%#)', (input) => {
    expect(objectChangeSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { ...createObstacle, objectType: 'wall' },
    { ...createRobot, objectType: 'drone' },
    { type: 'delete', objectType: 'warehouse', objectId: ID },
    { type: 'update', objectType: 'robot', objectId: ID },
    { type: 'rename', objectId: ID },
    [],
    null,
    'create',
  ])('rejects an unknown type or object type (%#)', (input) => {
    expect(objectChangeSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    { ...createObstacle, id: ID },
    { ...createStation, id: ID },
    { ...createRobot, id: ID },
    { ...createObstacle, name: 'Wall' },
    { ...createRobot, direction: 'north' },
    { type: 'delete', objectType: 'robot', objectId: ID, x: 1 },
    { ...moveObstacle, name: 'Renamed' },
  ])('rejects unknown extra properties (%#)', (input) => {
    expect(objectChangeSchema.safeParse(input).success).toBe(false);
  });

  describe('names', () => {
    it.each([
      ['Robot', createRobot],
      ['Station', createStation],
    ])('trims a %s name', (_label, base) => {
      expect(
        objectChangeSchema.parse({ ...base, name: '  Alex  ' }),
      ).toMatchObject({ name: 'Alex' });
    });

    it.each([createRobot, createStation])(
      'rejects empty and whitespace-only names (%#)',
      (base) => {
        expect(
          objectChangeSchema.safeParse({ ...base, name: '' }).success,
        ).toBe(false);
        expect(
          objectChangeSchema.safeParse({ ...base, name: '   ' }).success,
        ).toBe(false);
      },
    );

    it.each([createRobot, createStation])(
      'accepts 1 and 100 characters and rejects 101 (%#)',
      (base) => {
        expect(
          objectChangeSchema.safeParse({ ...base, name: 'a' }).success,
        ).toBe(true);
        expect(
          objectChangeSchema.safeParse({ ...base, name: 'a'.repeat(100) })
            .success,
        ).toBe(true);
        expect(
          objectChangeSchema.safeParse({ ...base, name: 'a'.repeat(101) })
            .success,
        ).toBe(false);
      },
    );

    it('measures the name length after trimming', () => {
      expect(
        objectChangeSchema.safeParse({
          ...createRobot,
          name: ` ${'a'.repeat(100)} `,
        }).success,
      ).toBe(true);
    });

    it.each([createRobot, createStation])(
      'rejects NUL characters, which PostgreSQL cannot store (%#)',
      (base) => {
        expect(
          objectChangeSchema.safeParse({ ...base, name: 'a\0b' }).success,
        ).toBe(false);
      },
    );

    it('rejects non-string names', () => {
      expect(
        objectChangeSchema.safeParse({ ...createRobot, name: 123 }).success,
      ).toBe(false);
    });
  });

  describe('coordinates', () => {
    it.each([
      { ...createObstacle, x: 1.5 },
      { ...createObstacle, y: 0.1 },
      { ...createStation, x: 2.5 },
      { ...createRobot, y: 3.14 },
      { ...moveObstacle, x: 1.5 },
      { ...createObstacle, x: '1' },
      { ...createRobot, y: '2' },
      { ...moveObstacle, y: '9' },
      { ...createObstacle, x: null },
      { ...createObstacle, x: Number.NaN },
      { ...createObstacle, x: Number.POSITIVE_INFINITY },
    ])('rejects fractional or non-numeric coordinates (%#)', (input) => {
      expect(objectChangeSchema.safeParse(input).success).toBe(false);
    });

    it.each([
      { ...createObstacle, x: -1, y: -5 },
      { ...createStation, x: -1 },
      { ...createRobot, y: -10 },
      { ...moveObstacle, x: -3, y: -3 },
      { ...createObstacle, x: 20, y: 20 },
      { ...createObstacle, x: 1000, y: 0 },
    ])(
      'accepts out-of-map integers; bounds are a service concern (%#)',
      (input) => {
        expect(objectChangeSchema.safeParse(input).success).toBe(true);
      },
    );
  });
});

describe('batchObjectChangesSchema', () => {
  it('accepts a batch with different operation types, preserving order', () => {
    const changes = [
      createObstacle,
      createStation,
      createRobot,
      moveObstacle,
      { type: 'delete', objectType: 'robot', objectId: ID },
    ];

    expect(batchObjectChangesSchema.parse({ changes })).toEqual({ changes });
  });

  it('accepts exactly 1 and exactly 400 operations', () => {
    expect(MAX_CHANGES_PER_BATCH).toBe(400);
    expect(
      batchObjectChangesSchema.safeParse({ changes: [createObstacle] }).success,
    ).toBe(true);
    expect(
      batchObjectChangesSchema.safeParse({
        changes: Array.from({ length: 400 }, () => createObstacle),
      }).success,
    ).toBe(true);
  });

  it('rejects an empty batch', () => {
    expect(batchObjectChangesSchema.safeParse({ changes: [] }).success).toBe(
      false,
    );
  });

  it('rejects a batch with more than 400 operations', () => {
    expect(
      batchObjectChangesSchema.safeParse({
        changes: Array.from({ length: 401 }, () => createObstacle),
      }).success,
    ).toBe(false);
  });

  it('rejects a batch containing one invalid operation', () => {
    expect(
      batchObjectChangesSchema.safeParse({
        changes: [createObstacle, { ...moveObstacle, objectType: 'wall' }],
      }).success,
    ).toBe(false);
  });

  it.each([
    {},
    { changes: null },
    { changes: createObstacle },
    { changes: [createObstacle], extra: true },
    [createObstacle],
    null,
  ])('rejects a malformed batch (%#)', (input) => {
    expect(batchObjectChangesSchema.safeParse(input).success).toBe(false);
  });
});
