import type { WarehouseDemoScenario } from '../types';
import { createWarehouseMockStore } from './store';

export const warehouseMockOrigin = 'https://warehouse-mocks.invalid';
export const warehouseDemoRoleHeader = 'X-Warehouse-Demo-Role';
export const warehouseMockDelayMs = 450;

export function createWarehouseMockSession(
  scenario: WarehouseDemoScenario = 'default',
) {
  const id = crypto.randomUUID();

  return {
    id,
    baseUrl: `${warehouseMockOrigin}/${id}/`,
    store: createWarehouseMockStore(scenario),
  };
}

export type WarehouseMockSession = ReturnType<
  typeof createWarehouseMockSession
>;
