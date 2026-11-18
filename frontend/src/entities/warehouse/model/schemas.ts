import { z } from 'zod';
import {
  WAREHOUSE_NAME_MIN_LENGTH,
  WAREHOUSE_NAME_MAX_LENGTH,
  WAREHOUSE_DIMENSION_MIN,
  WAREHOUSE_DIMENSION_MAX,
} from './constants';

export const warehouseNameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(WAREHOUSE_NAME_MIN_LENGTH, 'Введите название склада')
    .max(
      WAREHOUSE_NAME_MAX_LENGTH,
      `Название должно содержать не больше ${WAREHOUSE_NAME_MAX_LENGTH} символов`,
    ),
});

const warehouseDimensionSchema = z
  .number({
    error: `Введите целое число от ${WAREHOUSE_DIMENSION_MIN} до ${WAREHOUSE_DIMENSION_MAX}`,
  })
  .min(
    WAREHOUSE_DIMENSION_MIN,
    `Значение должно быть не меньше ${WAREHOUSE_DIMENSION_MIN}`,
  )
  .max(
    WAREHOUSE_DIMENSION_MAX,
    `Значение должно быть не больше ${WAREHOUSE_DIMENSION_MAX}`,
  )
  .refine(Number.isInteger, 'Введите целое число');

export const warehouseCreateSchema = warehouseNameSchema.extend({
  width: warehouseDimensionSchema,
  height: warehouseDimensionSchema,
});

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
export type WarehouseRenameInput = z.infer<typeof warehouseNameSchema>;
