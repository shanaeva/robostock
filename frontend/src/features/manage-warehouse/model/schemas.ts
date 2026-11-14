import { z } from 'zod';

export const warehouseNameSchema = z.object({
  name: z.string().trim().min(1, 'Введите название склада'),
});

export const warehouseInviteSchema = z.object({
  email: z.string().trim().min(1, 'Введите email').pipe(z.email('Введите корректный email')),
});

export type WarehouseNameValues = z.infer<typeof warehouseNameSchema>;
export type WarehouseInviteValues = z.infer<typeof warehouseInviteSchema>;
