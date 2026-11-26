'use client';

import { useGetMe } from '@/entities/user';
import { getErrorMessage, useLogout } from '@/features/auth';

export function DashboardPage() {
  const { data, isLoading, isError } = useGetMe();
  const { mutate: logout, isPending, error: logoutError } = useLogout();
  const logoutErrorMessage = getErrorMessage(logoutError);

  if (isLoading) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-zinc-500">Загрузка...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <p className="text-zinc-500">
          Не удалось загрузить профиль. Попробуйте обновить страницу.
        </p>
      </main>
    );
  }

  const user = data?.user;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <h1 className="text-2xl font-semibold">Профиль</h1>

        <table className="w-full text-sm border-collapse">
          <tbody>
            <tr className="border-b dark:border-zinc-800">
              <td className="py-3 pr-4 text-zinc-500 w-1/3">Имя</td>
              <td className="py-3 font-medium">{user?.name}</td>
            </tr>
            <tr className="border-b dark:border-zinc-800">
              <td className="py-3 pr-4 text-zinc-500">Email</td>
              <td className="py-3 font-medium">{user?.email}</td>
            </tr>
            <tr className="border-b dark:border-zinc-800">
              <td className="py-3 pr-4 text-zinc-500">Пароль</td>
              <td className="py-3 font-medium tracking-widest">••••••••</td>
            </tr>
            <tr className="border-b dark:border-zinc-800">
              <td className="py-3 pr-4 text-zinc-500">Роль</td>
              <td className="py-3 font-medium">
                {user?.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
              </td>
            </tr>
            <tr>
              <td className="py-3 pr-4 text-zinc-500">Почта</td>
              <td className="py-3">
                {user?.emailVerified ? (
                  <span className="text-green-600 dark:text-green-400">
                    Подтверждена
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Не подтверждена
                  </span>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {logoutErrorMessage && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {logoutErrorMessage}
          </p>
        )}

        <button
          onClick={() => logout()}
          disabled={isPending}
          className="bg-black text-white rounded px-4 py-2 font-medium hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          {isPending && 'Выходим...'}
          {!isPending && logoutError && 'Повторить выход'}
          {!isPending && !logoutError && 'Выйти'}
        </button>
      </div>
    </main>
  );
}
