'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage, useLogin } from '../model';

type FormValues = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  const { register, handleSubmit, reset, control } = useForm<FormValues>({
    defaultValues: { rememberMe: false },
  });

  const email = useWatch({ control, name: 'email', defaultValue: '' });

  useEffect(() => {
    if (defaultEmail) {
      reset({ email: defaultEmail, rememberMe: false });
    }
  }, [defaultEmail, reset]);

  const { mutate: login, isPending, error } = useLogin();

  const errorMessage = getErrorMessage(error);

  return (
    <form
      onSubmit={handleSubmit((data) => login(data))}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold">Вход</h1>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

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
          {...register('password', { required: true })}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...register('rememberMe')} />
        Запомнить меня
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {isPending ? 'Входим...' : 'Войти'}
      </button>

      <p className="text-sm text-center text-zinc-500">
        <Link
          href={
            email
              ? `/auth/forgot-password?email=${encodeURIComponent(email)}`
              : '/auth/forgot-password'
          }
          className="text-black dark:text-white underline"
        >
          Забыли пароль?
        </Link>
      </p>

      <p className="text-sm text-center text-zinc-500">
        Нет аккаунта?{' '}
        <Link
          href={
            email
              ? `/auth/register?email=${encodeURIComponent(email)}`
              : '/auth/register'
          }
          className="text-black dark:text-white underline"
        >
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}
