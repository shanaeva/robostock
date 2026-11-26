// @vitest-environment jsdom
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '@/shared/api';
import { useLogin, useLogout } from './hooks';

// ApiError is the real class: useLogout branches on `instanceof ApiError`.
vi.mock('@/shared/api', async (importOriginal) => {
  const { ApiError: RealApiError } = await importOriginal();

  return { ApiError: RealApiError, apiFetch: vi.fn() };
});

const push = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function renderWithQueryClient(hook, queryClient) {
  return renderHook(hook, {
    wrapper: ({ children }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useLogout', () => {
  it('keeps the cache and does not navigate away when logout fails', async () => {
    const queryClient = new QueryClient();
    const staleUser = { id: '1', name: 'A', email: 'a@test.local' };
    queryClient.setQueryData(['me'], { user: staleUser });
    apiFetch.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderWithQueryClient(() => useLogout(), queryClient);

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Server-side session may still be active — don't clear or navigate.
    expect(queryClient.getQueryData(['me'])).toEqual({ user: staleUser });
    expect(push).not.toHaveBeenCalled();
  });

  it('clears the cache and navigates away once a retry succeeds', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['me'], {
      user: { id: '1', name: 'A', email: 'a@test.local' },
    });
    apiFetch
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce({ message: 'ok' });

    const { result } = renderWithQueryClient(() => useLogout(), queryClient);

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(push).toHaveBeenCalledWith('/');
  });

  it('treats a 401 as a completed logout instead of an endless retry', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['me'], { user: { id: '1' } });
    // The session is already gone server-side — the user's intent is satisfied.
    apiFetch.mockRejectedValueOnce(
      new ApiError(401, 'Сессия истекла. Войдите заново.'),
    );

    const { result } = renderWithQueryClient(() => useLogout(), queryClient);

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(push).toHaveBeenCalledWith('/');
  });
});

describe('useLogin — account switch', () => {
  it('replaces the cached user entirely on a second login, with no stale fields', async () => {
    const queryClient = new QueryClient();
    const userA = {
      id: '1',
      name: 'Alice',
      email: 'alice@test.local',
      role: 'USER',
      emailVerified: true,
    };
    const userB = {
      id: '2',
      name: 'Bob',
      email: 'bob@test.local',
      role: 'ADMIN',
      emailVerified: false,
    };
    apiFetch
      .mockResolvedValueOnce({ user: userA })
      .mockResolvedValueOnce({ user: userB });

    const { result } = renderWithQueryClient(() => useLogin(), queryClient);

    result.current.mutate({
      email: userA.email,
      password: 'pw',
      rememberMe: false,
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(['me'])).toEqual({ user: userA }),
    );

    result.current.mutate({
      email: userB.email,
      password: 'pw',
      rememberMe: false,
    });
    await waitFor(() =>
      expect(queryClient.getQueryData(['me'])).toEqual({ user: userB }),
    );

    expect(queryClient.getQueryData(['me'])).not.toEqual({ user: userA });
  });

  it('drops other cached queries so no data from the previous account leaks', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['warehouses'], { list: [{ id: 'alice-wh' }] });
    apiFetch.mockResolvedValueOnce({ user: { id: '2', name: 'Bob' } });

    const { result } = renderWithQueryClient(() => useLogin(), queryClient);

    result.current.mutate({
      email: 'bob@test.local',
      password: 'pw',
      rememberMe: false,
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['warehouses'])).toBeUndefined();
    expect(queryClient.getQueryData(['me'])).toEqual({
      user: { id: '2', name: 'Bob' },
    });
  });
});
