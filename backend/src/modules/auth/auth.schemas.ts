import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from './auth.constants.js';

const normalizedEmail = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Введите корректную почту').max(EMAIL_MAX_LENGTH),
);

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Пароль должен содержать от 8 до 128 символов')
  .max(PASSWORD_MAX_LENGTH, 'Пароль должен содержать от 8 до 128 символов');

const code = z.string().regex(/^\d{6}$/, 'Введите шестизначный код');

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(NAME_MIN_LENGTH, 'Введите имя от 2 до 80 символов')
      .max(NAME_MAX_LENGTH),
    email: normalizedEmail,
  })
  .strict();

export const loginSchema = z
  .object({
    email: normalizedEmail,
    password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const verifyEmailSchema = z
  .object({ email: normalizedEmail, code, password })
  .strict();

export const resendVerificationSchema = z
  .object({ email: normalizedEmail })
  .strict();

export const forgotPasswordSchema = z
  .object({ email: normalizedEmail })
  .strict();

export const resetPasswordSchema = z
  .object({ email: normalizedEmail, code, newPassword: password })
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
