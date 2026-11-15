import { z } from 'zod';

const positiveInteger = z.number().min(1).refine(Number.isInteger);

// WarehouseSummary / WarehouseList from OpenAPI 0.3.0-draft. No role field.
export const warehouseSummarySchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(100),
  width: positiveInteger,
  height: positiveInteger,
});

export const warehouseListSchema = z.object({
  list: z.array(warehouseSummarySchema),
  total: z.number().min(0).refine(Number.isInteger),
  page: positiveInteger,
  limit: positiveInteger,
});

export const warehouseCreatedSchema = z.object({ warehouseId: z.uuid() });

export const warehouseErrorSchema = z.object({
  statusCode: z.number().int().min(400).max(599),
  message: z.string().trim().min(1),
});

export type WarehouseSummary = z.infer<typeof warehouseSummarySchema>;
export type WarehouseListDto = z.infer<typeof warehouseListSchema>;
