'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { useResetPassword } from '../api';

interface FormValues {
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export function ResetPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>();

  const { mutate: reset, isPending, error, isSuccess } = useResetPassword();

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'Что-то пошло не так'
        : null;

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Пароль изменён</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Все сессии завершены. Войдите с новым паролем.
        </p>
        <button
          type="button"
          onClick={() =>
            router.push(`/auth/login?email=${encodeURIComponent(email)}`)
          }
          className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Войти
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) =>
        reset({ email, code: data.code, newPassword: data.newPassword }),
      )}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold">Новый пароль</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Введите код из письма и придумайте новый пароль.
      </p>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Код из письма
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
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Новый пароль
        <input
          type="password"
          autoComplete="new-password"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('newPassword', {
            required: 'Введите пароль',
            minLength: { value: 8, message: 'Пароль от 8 до 128 символов' },
            maxLength: { value: 128, message: 'Пароль от 8 до 128 символов' },
          })}
        />
        {errors.newPassword && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.newPassword.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Повторите пароль
        <input
          type="password"
          autoComplete="new-password"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('confirmPassword', {
            required: 'Повторите пароль',
            validate: (v) =>
              v === getValues('newPassword') || 'Пароли не совпадают',
          })}
        />
        {errors.confirmPassword && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.confirmPassword.message}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить пароль'}
      </button>

      <p className="text-sm text-center text-zinc-500">
        <Link
          href={`/auth/forgot-password?email=${encodeURIComponent(email)}`}
          className="text-black dark:text-white underline"
        >
          Запросить новый код
        </Link>
      </p>
    </form>
  );
}
