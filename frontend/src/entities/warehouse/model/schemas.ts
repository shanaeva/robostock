import { z } from 'zod';

export const warehouseNameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название склада')
    .max(100, 'Название должно содержать не больше 100 символов'),
});

const warehouseDimensionSchema = z
  .number({ error: 'Введите целое число от 1 до 500' })
  .min(1, 'Значение должно быть не меньше 1')
  .max(500, 'Значение должно быть не больше 500')
  .refine(Number.isInteger, 'Введите целое число');

export const warehouseCreateSchema = warehouseNameSchema.extend({
  width: warehouseDimensionSchema,
  height: warehouseDimensionSchema,
});

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
export type WarehouseRenameInput = z.infer<typeof warehouseNameSchema>;
