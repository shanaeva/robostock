'use client';

import { useEffect, useState } from 'react';
import { WarehousesPage } from '@/_pages/warehouses';
import {
  warehouseDataSourceMode,
  warehouseMocksEnabled,
} from '@/entities/warehouse';

export function WarehousesRoute() {
  const [startup, setStartup] = useState<'pending' | 'ready' | 'failed'>(
    'pending',
  );

  useEffect(() => {
    if (!warehouseMocksEnabled) {
      return;
    }

    let active = true;
    void import('../mocks/browser')
      .then(({ startMockWorker }) => startMockWorker())
      .then(
        () => {
          if (active) {
            setStartup('ready');
          }
        },
        () => {
          if (active) {
            setStartup('failed');
          }
        },
      );

    return () => {
      active = false;
    };
  }, []);

  let error: string | undefined;

  if (warehouseDataSourceMode === 'mock' && !warehouseMocksEnabled) {
    error =
      'Моковый режим доступен в разработке. Для production используйте режим http и задайте адрес API.';
  } else if (
    warehouseDataSourceMode !== 'mock' &&
    warehouseDataSourceMode !== 'http'
  ) {
    error = 'NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE: используйте mock или http.';
  } else if (startup === 'failed') {
    error =
      'Не удалось запустить MSW. Проверьте доступность mockServiceWorker.js и перезагрузите страницу.';
  }

  if (error || (warehouseMocksEnabled && startup === 'pending')) {
    return (
      <main lang="ru" className="mx-auto w-full max-w-6xl p-6 text-slate-900">
        <h1 className="text-2xl font-semibold">Мои склады</h1>
        {error ? (
          <p role="alert" className="mt-4 text-red-700">
            {error}
          </p>
        ) : (
          <p role="status" className="mt-4">
            Загружаем склады…
          </p>
        )}
      </main>
    );
  }

  return <WarehousesPage />;
}
