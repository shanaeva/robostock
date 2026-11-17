'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { CurrentUser } from '@/entities/user';
import { apiFetch } from '@/shared/api';

interface AuthResponse {
  user: CurrentUser;
}

interface MessageResponse {
  message: string;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; password: string; rememberMe: boolean }) =>
      apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(['me'], { user: result.user });
      router.push('/dashboard');
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
    mutationFn: () =>
      apiFetch<MessageResponse>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
      router.push('/');
    },
    onError: () => {
      queryClient.clear();
      router.push('/');
    },
  });
}
