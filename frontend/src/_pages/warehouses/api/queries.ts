import { useQuery } from '@tanstack/react-query';
import type { WarehouseDataSource, WarehouseListParams } from './types';

export const warehousesQueryKey = ['warehouses'] as const;

export function useWarehouses(
  api: WarehouseDataSource,
  params: WarehouseListParams,
) {
  const normalized = { ...params, search: params.search.trim() };

  return useQuery({
    queryKey: [...warehousesQueryKey, api.mode, normalized],
    queryFn: ({ signal }) => api.list(normalized, signal),
  });
}
