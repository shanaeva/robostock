import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/shared/api';
import type { CurrentUser } from '../model';

export function useGetMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ user: CurrentUser }>('/auth/me'),
    retry: false,
  });
}
