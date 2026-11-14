'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWarehouseMockApi, type WarehouseDemoScenario } from '@/entities/warehouse';
import { WarehousesContent } from './warehouses-content';

function readDemoScenario(): WarehouseDemoScenario {
  if (typeof window === 'undefined') return 'default';
  const scenario = new URLSearchParams(window.location.search).get('demo');
  switch (scenario) {
    case 'empty':
    case 'error':
    case 'mutation-error':
    case 'forbidden':
      return scenario;
    default:
      return 'default';
  }
}

export function WarehousesPage() {
  // Scope both the cache and mutable demo data to this mounted page.
  const [services] = useState(() => ({
    queryClient: new QueryClient({
      defaultOptions: {
        queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    }),
    api: createWarehouseMockApi(readDemoScenario()),
  }));

  return (
    <QueryClientProvider client={services.queryClient}>
      <WarehousesContent api={services.api} />
    </QueryClientProvider>
  );
}
