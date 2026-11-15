import { z } from 'zod';

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .url({
      protocol: /^postgres(ql)?$/,
      error: 'DATABASE_URL must be a valid PostgreSQL URL',
    })
    .refine(
      (value) => {
        if (!URL.canParse(value)) {
          return false;
        }
        const url = new URL(value);
        return url.hostname.length > 0 && url.pathname.length > 1;
      },
      { error: 'DATABASE_URL must include a host and database name' },
    ),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  AUTH_CODE_SECRET: z
    .string()
    .min(32, 'AUTH_CODE_SECRET must be at least 32 characters'),
  AUTH_EMAIL_ENABLED: z.enum(['true', 'false']).default('true'),
});

export type Environment = z.infer<typeof environmentSchema>;
