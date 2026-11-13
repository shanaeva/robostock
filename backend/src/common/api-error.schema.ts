import { z } from 'zod';

export const apiErrorSchema = z
  .object({
    statusCode: z.number().int().min(400).max(599),
    message: z.string(),
  })
  .meta({ id: 'ApiError' });

export type ApiError = z.infer<typeof apiErrorSchema>;
