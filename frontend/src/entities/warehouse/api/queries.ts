import { useQuery } from '@tanstack/react-query';
import type { WarehouseMockApi } from './mock-api';

export const warehousesQueryKey = ['warehouses'] as const;

export function useWarehouses(api: WarehouseMockApi) {
  return useQuery({ queryKey: warehousesQueryKey, queryFn: () => api.list() });
}
