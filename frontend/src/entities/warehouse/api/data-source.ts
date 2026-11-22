import { createWarehouseMockApi } from './mock-api';
import { createWarehouseHttpApi } from './http-api';
import { WarehouseApiError } from './errors';
import type { WarehouseDataSource, WarehouseDemoScenario } from './types';

export function createWarehouseDataSource(options: {
  mode?: string;
  baseUrl?: string;
  demoScenario?: WarehouseDemoScenario;
}): WarehouseDataSource {
  switch (options.mode ?? 'mock') {
    case 'mock':
      return createWarehouseMockApi(options.demoScenario);
    case 'http':
      return createWarehouseHttpApi(options.baseUrl);
    default:
      throw new WarehouseApiError(
        null,
        'NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE: используйте mock или http.',
      );
  }
}
