import { z } from 'zod';

/**
 * Machine-readable error codes the client branches on (CSRF recovery,
 * rate-limit and credential messaging). Only codes listed here are sent.
 */
export const API_ERROR_CODES = [
  'CSRF_REJECTED',
  'RATE_LIMITED',
  'INVALID_CREDENTIALS',
  'INVALID_CODE',
  'INVALID_INPUT',
] as const;

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);

export const apiErrorSchema = z
  .object({
    statusCode: z.number().int().min(400).max(599),
    message: z.string(),
    code: apiErrorCodeSchema.optional(),
  })
  .meta({ id: 'ApiError' });

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
