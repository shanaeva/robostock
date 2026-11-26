'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@/entities/user';
import { apiFetch } from '@/shared/api';

type AuthResponse = {
  user: CurrentUser;
};

type MessageResponse = {
  message: string;
};

export type { AuthResponse, MessageResponse };

export function useGetSettings() {
  return useQuery({
    queryKey: ['auth-settings'],
    queryFn: () => apiFetch<{ emailEnabled: boolean }>('/auth/settings'),
    staleTime: Infinity,
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiFetch<MessageResponse>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { email: string; code: string; password: string }) =>
      apiFetch<MessageResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      apiFetch<MessageResponse>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: { email: string; code: string; newPassword: string }) =>
      apiFetch<MessageResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}
