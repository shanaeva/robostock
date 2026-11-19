import { z } from 'zod';

// Structural validation only. Map bounds (0..width-1 / 0..height-1), cell
// occupancy, ownership and object existence are checked by the service layer.
const objectIdSchema = z.uuid();

const nameSchema = z.string().trim().min(1).max(100);

// Intentionally no .min()/.max(): out-of-map integers (including negative
// ones) must reach the service so it can answer 422 instead of 400.
const coordinateSchema = z.number().int();

const directionSchema = z.enum(['north', 'south', 'east', 'west']);

export const MAX_CHANGES_PER_BATCH = 400;

const createObstacleChangeSchema = z
  .strictObject({
    type: z.literal('create'),
    objectType: z.literal('obstacle'),
    x: coordinateSchema,
    y: coordinateSchema,
  })
  .meta({ id: 'CreateObstacleChange' });

const createStationChangeSchema = z
  .strictObject({
    type: z.literal('create'),
    objectType: z.literal('station'),
    name: nameSchema,
    x: coordinateSchema,
    y: coordinateSchema,
    direction: directionSchema,
  })
  .meta({ id: 'CreateStationChange' });

const createRobotChangeSchema = z
  .strictObject({
    type: z.literal('create'),
    objectType: z.literal('robot'),
    name: nameSchema,
    x: coordinateSchema,
    y: coordinateSchema,
  })
  .meta({ id: 'CreateRobotChange' });

export const createObjectChangeSchema = z
  .discriminatedUnion('objectType', [
    createObstacleChangeSchema,
    createStationChangeSchema,
    createRobotChangeSchema,
  ])
  .meta({ id: 'CreateObjectChange' });

export const deleteObjectChangeSchema = z
  .strictObject({
    type: z.literal('delete'),
    objectType: z.enum(['obstacle', 'station', 'robot']),
    objectId: objectIdSchema,
  })
  .meta({ id: 'DeleteObjectChange' });

// Robots cannot be moved in the current API scope.
export const moveObjectChangeSchema = z
  .strictObject({
    type: z.literal('move'),
    objectType: z.enum(['obstacle', 'station']),
    objectId: objectIdSchema,
    x: coordinateSchema,
    y: coordinateSchema,
  })
  .meta({ id: 'MoveObjectChange' });

export const objectChangeSchema = z
  .discriminatedUnion('type', [
    createObjectChangeSchema,
    deleteObjectChangeSchema,
    moveObjectChangeSchema,
  ])
  .meta({ id: 'ObjectChange' });

export const batchObjectChangesSchema = z
  .strictObject({
    changes: z.array(objectChangeSchema).min(1).max(MAX_CHANGES_PER_BATCH),
  })
  .meta({
    id: 'BatchObjectChanges',
    examples: [
      {
        changes: [
          { type: 'create', objectType: 'obstacle', x: 3, y: 4 },
          {
            type: 'move',
            objectType: 'station',
            objectId: '33333333-3333-4333-8333-333333333333',
            x: 7,
            y: 9,
          },
        ],
      },
    ],
  });

export type ObjectChange = z.infer<typeof objectChangeSchema>;
export type BatchObjectChangesInput = z.infer<typeof batchObjectChangesSchema>;
