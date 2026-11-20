'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useForgotPassword } from '../api';
import { getErrorMessage } from '../model';

type FormValues = {
  email: string;
};

export function ForgotPasswordForm({
  defaultEmail,
}: {
  defaultEmail?: string;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { email: defaultEmail ?? '' } });

  const { mutate: forgot, isPending, error, isSuccess } = useForgotPassword();

  const errorMessage = getErrorMessage(error);

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Проверьте почту</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Если аккаунт с адресом <strong>{getValues('email')}</strong>{' '}
          существует, мы отправили код для сброса пароля.
        </p>
        <Link
          href={`/auth/reset-password?email=${encodeURIComponent(getValues('email'))}`}
          className="bg-black text-white rounded px-4 py-2 font-medium text-center hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Ввести код
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((data) => forgot(data))}
      className="flex flex-col gap-4 w-full max-w-sm"
    >
      <h1 className="text-2xl font-semibold">Восстановление пароля</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Введите email, на который зарегистрирован аккаунт.
      </p>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          autoComplete="email"
          autoFocus
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
        {isPending ? 'Отправляем...' : 'Отправить код'}
      </button>

      <p className="text-sm text-center text-zinc-500">
        Вспомнили пароль?{' '}
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
