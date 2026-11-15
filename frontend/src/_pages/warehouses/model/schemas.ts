import { z } from 'zod';

export const warehouseNameSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, 'Введите название склада')
    .max(100, 'Название должно содержать не больше 100 символов'),
});

const warehouseDimensionSchema = z
  .number({ error: 'Введите целое число не меньше 1' })
  .min(1, 'Значение должно быть не меньше 1')
  .refine(Number.isInteger, 'Введите целое число');

export const warehouseCreateSchema = warehouseNameSchema.extend({
  width: warehouseDimensionSchema,
  height: warehouseDimensionSchema,
});

export const warehouseInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Введите email')
    .pipe(z.email('Введите корректный email')),
});

export type WarehouseNameValues = z.infer<typeof warehouseNameSchema>;
export type WarehouseCreateValues = z.infer<typeof warehouseCreateSchema>;
export type WarehouseInviteValues = z.infer<typeof warehouseInviteSchema>;
