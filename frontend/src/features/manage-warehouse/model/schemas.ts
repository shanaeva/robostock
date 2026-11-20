import { z } from 'zod';

export const warehouseInviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Введите email')
    .pipe(z.email('Введите корректный email')),
});

export type WarehouseInviteValues = z.infer<typeof warehouseInviteSchema>;
