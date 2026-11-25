'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createWarehouseHttpApi,
  warehouseMocksEnabled,
} from '@/entities/warehouse';
import { mockApiOrigin } from '@/shared/api';
import { WarehousesContent } from './warehouses-content';

export function WarehouseManagement() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
            networkMode: 'always',
          },
          mutations: { retry: false, networkMode: 'always' },
        },
      }),
  );
  const [api] = useState(() =>
    createWarehouseHttpApi(
      warehouseMocksEnabled
        ? mockApiOrigin
        : process.env.NEXT_PUBLIC_API_BASE_URL,
    ),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <WarehousesContent api={api} />
    </QueryClientProvider>
  );
}
