'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { useResendVerification, useVerifyEmail } from '../api';

interface FormValues {
  code: string;
}

export function VerifyEmailForm({
  email,
  name,
}: {
  email: string;
  name: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  const { mutate: verify, isPending, error } = useVerifyEmail();
  const {
    mutate: resend,
    isPending: resending,
    isSuccess: resent,
  } = useResendVerification();

  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);

    return () => clearTimeout(id);
  }, [cooldown]);

  const handleResend = () => {
    resend({ email });
    setCooldown(60);
  };

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'Что-то пошло не так'
        : null;

  return (
    <form
      onSubmit={handleSubmit((data) => verify({ email, code: data.code }))}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold">Подтверждение email</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        На почту{' '}
        <strong className="text-zinc-900 dark:text-zinc-100">{email}</strong>{' '}
        отправлен код подтверждения. Введите его для завершения регистрации.
      </p>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between">
          <span>Код из письма</span>
          {resent && cooldown > 0 && (
            <span className="text-green-600 dark:text-green-400 text-xs">
              Письмо отправлено.
            </span>
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          className="border rounded px-3 py-2 text-base tracking-widest dark:bg-zinc-900 dark:border-zinc-700"
          {...register('code', {
            required: 'Введите код',
            minLength: { value: 6, message: 'Код — 6 цифр' },
            maxLength: { value: 6, message: 'Код — 6 цифр' },
          })}
        />
        {errors.code && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.code.message}
          </span>
        )}
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="self-start text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200 disabled:no-underline disabled:cursor-default disabled:opacity-100"
        >
          {cooldown > 0
            ? `Повторная отправка через ${cooldown} с.`
            : 'Отправить повторно'}
        </button>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isPending ? 'Проверяем...' : 'Подтвердить'}
      </button>

      <p className="text-sm text-center text-zinc-500">
        <Link
          href={`/auth/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`}
          className="text-black dark:text-white underline"
        >
          Указать другую почту
        </Link>
      </p>

      <p className="text-sm text-center text-zinc-500">
        Уже есть аккаунт?{' '}
        <Link
          href={`/auth/login?email=${encodeURIComponent(email)}`}
          className="text-black dark:text-white underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
