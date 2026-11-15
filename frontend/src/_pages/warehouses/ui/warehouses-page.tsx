'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createWarehouseDataSource } from '../api/data-source';
import type { WarehouseDemoScenario } from '../api/types';
import { getWarehouseErrorMessage } from '../api/errors';
import { WarehousesContent } from './warehouses-content';

function readDemoScenario(): WarehouseDemoScenario {
  if (typeof window === 'undefined') {
    return 'default';
  }
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
  const [services] = useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
          staleTime: Infinity,
          networkMode: 'always',
        },
        mutations: { retry: false, networkMode: 'always' },
      },
    });
    const mode = process.env.NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE ?? 'mock';
    try {
      const api = createWarehouseDataSource({
        mode,
        baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
        demoScenario: mode === 'mock' ? readDemoScenario() : undefined,
      });

      return { queryClient, api, error: null };
    } catch (error) {
      return { queryClient, api: null, error: getWarehouseErrorMessage(error) };
    }
  });

  if (!services.api) {
    return (
      <main lang="ru" className="mx-auto w-full max-w-6xl p-6 text-slate-900">
        <h1 className="text-2xl font-semibold">Мои склады</h1>
        <p role="alert" className="mt-4 text-red-700">
          {services.error}
        </p>
      </main>
    );
  }

  return (
    <QueryClientProvider client={services.queryClient}>
      <WarehousesContent api={services.api} />
    </QueryClientProvider>
  );
}
