import { z } from 'zod';

export const paginationSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(2_147_483_647).default(0),
});

export type Pagination = z.infer<typeof paginationSchema>;
