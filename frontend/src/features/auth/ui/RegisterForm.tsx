'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getErrorMessage, useRegister } from '../model';

type FormValues = {
  name: string;
  email: string;
};

export function RegisterForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail?: string;
  defaultName?: string;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>();
  const email = useWatch({ control, name: 'email', defaultValue: '' });

  useEffect(() => {
    if (defaultEmail || defaultName) {
      reset({
        name: defaultName ?? '',
        email: defaultEmail ?? '',
      });
    }
  }, [defaultEmail, defaultName, reset]);

  const { mutate: registerUser, isPending, error, isSuccess } = useRegister();

  const errorMessage = getErrorMessage(error);

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
          {...register('name', {
            required: 'Введите имя',
            minLength: { value: 2, message: 'Имя от 2 до 80 символов' },
            maxLength: { value: 80, message: 'Имя от 2 до 80 символов' },
          })}
        />
        {errors.name && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.name.message}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          autoComplete="email"
          className="border rounded px-3 py-2 text-base dark:bg-zinc-900 dark:border-zinc-700"
          {...register('email', { required: 'Введите email' })}
        />
        {errors.email && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {errors.email.message}
          </span>
        )}
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
          href={
            email
              ? `/auth/login?email=${encodeURIComponent(email)}`
              : '/auth/login'
          }
          className="text-black dark:text-white underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
