import { z } from 'zod';

export const warehouseIdSchema = z.uuid();

export const createWarehouseSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(100),
    width: z.number().int().min(1).max(500),
    height: z.number().int().min(1).max(500),
  })
  .meta({
    id: 'CreateWarehouse',
    examples: [{ name: 'Склад с огурцами', width: 20, height: 20 }],
  });

export const updateWarehouseSchema = z
  .strictObject({ name: createWarehouseSchema.shape.name })
  .meta({ id: 'UpdateWarehouse', examples: [{ name: 'Склад с огурцами' }] });

export const listWarehousesQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['id', 'name', 'width', 'height']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const warehouseSummarySchema = z
  .object({
    id: warehouseIdSchema,
    name: createWarehouseSchema.shape.name,
    width: createWarehouseSchema.shape.width,
    height: createWarehouseSchema.shape.height,
  })
  .meta({ id: 'WarehouseSummary' });

export const warehousesResponseSchema = z
  .object({
    list: z.array(warehouseSummarySchema),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
  })
  .meta({ id: 'WarehouseList' });

export const warehouseCreatedSchema = z
  .object({ warehouseId: warehouseIdSchema })
  .meta({ id: 'WarehouseCreated' });

const robotSchema = z.strictObject({
  id: warehouseIdSchema,
  name: createWarehouseSchema.shape.name,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

const obstacleSchema = z.strictObject({
  id: warehouseIdSchema,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
});

const stationSchema = z.strictObject({
  id: warehouseIdSchema,
  name: createWarehouseSchema.shape.name,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  direction: z.enum(['north', 'south', 'east', 'west']),
});

export const warehouseDetailsSchema = z
  .object({
    id: warehouseIdSchema,
    name: createWarehouseSchema.shape.name,
    width: createWarehouseSchema.shape.width,
    height: createWarehouseSchema.shape.height,
    robots: z.array(robotSchema),
    obstacles: z.array(obstacleSchema),
    stations: z.array(stationSchema),
    ownerId: warehouseIdSchema,
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .meta({ id: 'WarehouseDetails' });

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type ListWarehousesQuery = z.infer<typeof listWarehousesQuerySchema>;
