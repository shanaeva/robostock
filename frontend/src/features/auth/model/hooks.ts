'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@/entities/user';
import { ApiError, apiFetch } from '@/shared/api';
import { getSafeRedirectPath } from './safe-redirect';

type AuthResponse = {
  user: CurrentUser;
};

type MessageResponse = {
  message: string;
};

export function useLogin(from?: string | null) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      rememberMe: boolean;
    }) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      // A login may be an account switch: every cached query belongs to the
      // previous user, so drop them all before seeding the new profile.
      queryClient.clear();
      queryClient.setQueryData(['me'], { user: result.user });
      router.push(getSafeRedirectPath(from));
    },
  });
}

export function useRegister() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      apiFetch<MessageResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      router.push(
        `/auth/verify-email?email=${encodeURIComponent(variables.email)}&name=${encodeURIComponent(variables.name)}`,
      );
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      try {
        return await apiFetch<MessageResponse>('/auth/logout', {
          method: 'POST',
        });
      } catch (error) {
        // 401 means the session is already gone — the user's intent is
        // satisfied, so don't strand them on an endless "retry logout".
        if (error instanceof ApiError && error.status === 401) {
          return { message: 'ok' };
        }

        throw error;
      }
    },
    // On any other failure the server-side session may still be active, so the
    // cache and navigation stay intact until the user retries successfully.
    onSuccess: () => {
      queryClient.clear();
      router.push('/');
    },
  });
}
