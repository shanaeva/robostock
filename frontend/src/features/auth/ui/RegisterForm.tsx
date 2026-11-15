'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/shared/api';
import { useRegister } from '../api';

interface FormValues {
  name: string;
  email: string;
  password: string;
}

export function RegisterForm() {
  const { register, handleSubmit, getValues } = useForm<FormValues>();

  const { mutate: registerUser, isPending, error, isSuccess } = useRegister();

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? 'Что-то пошло не так'
        : null;

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Проверьте почту</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Мы отправили код подтверждения на{' '}
          <strong>{getValues('email')}</strong>. Проверьте входящие и введите
          код на следующей странице.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => registerUser(data))}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold">Регистрация</h1>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Имя
        <input
          type="text"
          autoComplete="name"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('name', { required: true, minLength: 2, maxLength: 80 })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          autoComplete="email"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('email', { required: true })}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Пароль
        <input
          type="password"
          autoComplete="new-password"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('password', {
            required: true,
            minLength: 8,
            maxLength: 128,
          })}
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isPending ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
      </button>

      <p className="text-sm text-center text-zinc-500">
        Уже есть аккаунт?{' '}
        <Link
          href="/auth/login"
          className="text-black dark:text-white underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
