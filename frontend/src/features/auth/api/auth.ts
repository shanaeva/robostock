import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useUserStore, type CurrentUser } from '@/entities/user';
import { apiFetch } from '@/shared/api';

interface AuthResponse {
  user: CurrentUser;
}

interface MessageResponse {
  message: string;
}

export function useGetSettings() {
  return useQuery({
    queryKey: ['auth-settings'],
    queryFn: () => apiFetch<{ emailEnabled: boolean }>('/auth/settings'),
    staleTime: Infinity,
  });
}

export function useLogin() {
  const setUser = useUserStore((s) => s.setUser);
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
      setUser(result.user);
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

export function useGetMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ user: CurrentUser }>('/auth/me'),
    retry: false,
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
  const setUser = useUserStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; code: string; password: string }) =>
      apiFetch<AuthResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      setUser(result.user);
      router.push('/dashboard');
    },
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
  const setUser = useUserStore((s) => s.setUser);
  const router = useRouter();

  return useMutation({
    mutationFn: (data: { email: string; code: string; newPassword: string }) =>
      apiFetch<AuthResponse>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (result) => {
      setUser(result.user);
      router.push('/dashboard');
    },
  });
}

export function useLogout() {
  const clearUser = useUserStore((s) => s.clearUser);
  const router = useRouter();

  return useMutation({
    mutationFn: () =>
      apiFetch<MessageResponse>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      clearUser();
      router.push('/');
    },
    onError: () => {
      clearUser();
      router.push('/');
    },
  });
}
