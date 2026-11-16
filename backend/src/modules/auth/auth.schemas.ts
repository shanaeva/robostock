import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const normalizedEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Введите корректную почту').max(254),
);

const password = z
  .string()
  .min(8, 'Пароль должен содержать от 8 до 128 символов')
  .max(128, 'Пароль должен содержать от 8 до 128 символов');

const code = z.string().regex(/^\d{6}$/, 'Введите шестизначный код');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Введите имя от 2 до 80 символов').max(80),
    email: normalizedEmail,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    email: normalizedEmail,
    password: z.string().min(1).max(128),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const verifyEmailSchema = z
  .object({ email: normalizedEmail, code })
  .strict();

export const resendVerificationSchema = z
  .object({ email: normalizedEmail })
  .strict();

export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      message: result.error.issues[0]?.message ?? 'Некорректные данные',
      code: 'INVALID_INPUT',
    });
  }
  return result.data;
}
