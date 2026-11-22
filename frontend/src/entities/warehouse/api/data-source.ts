import { createWarehouseHttpApi } from './http-api';
import { WarehouseApiError } from './errors';
import type { WarehouseDataSource, WarehouseDemoScenario } from './types';
import { createWarehouseDemoSource } from './mocks/demo-source';
import type { WarehouseMockRuntime } from './mocks/runtime';

export function createWarehouseDataSource(options: {
  mode?: string;
  baseUrl?: string;
  demoScenario?: WarehouseDemoScenario;
  mockRuntime?: WarehouseMockRuntime;
}): WarehouseDataSource {
  switch (options.mode ?? 'mock') {
    case 'mock':
      if (process.env.NODE_ENV === 'production') {
        throw new WarehouseApiError(
          null,
          'Моковый режим доступен только при разработке и в тестах. Для production задайте NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE=http и адрес API.',
        );
      }

      if (!options.mockRuntime) {
        throw new WarehouseApiError(
          null,
          'Для mock-режима не настроен перехват MSW.',
        );
      }

      return createWarehouseDemoSource(
        options.mockRuntime,
        options.demoScenario,
      );
    case 'http': {
      let ready: Promise<void> | undefined;
      const runtime = options.mockRuntime;

      return createWarehouseHttpApi(options.baseUrl, {
        beforeRequest: runtime
          ? () => (ready ??= runtime.deactivate())
          : undefined,
      });
    }
    default:
      throw new WarehouseApiError(
        null,
        'NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE: используйте mock или http.',
      );
  }
}
