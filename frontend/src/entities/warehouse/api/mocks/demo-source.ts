import { createWarehouseHttpApi } from '../http-api';
import { WarehouseApiError } from '../errors';
import type { WarehouseDataSource, WarehouseDemoScenario } from '../types';
import type { WarehouseMockRuntime } from './runtime';
import {
  createWarehouseMockSession,
  warehouseDemoRoleHeader,
  warehouseMockDelayMs,
} from './session';
import { warehouseDemoOwnerError } from './store';

export function createWarehouseDemoSource(
  runtime: WarehouseMockRuntime,
  scenario: WarehouseDemoScenario = 'default',
): WarehouseDataSource {
  const session = createWarehouseMockSession(scenario);

  async function ready() {
    try {
      await runtime.activate(session);
    } catch {
      throw new WarehouseApiError(
        null,
        'Не удалось запустить моки складов (MSW). Перезагрузите страницу и проверьте доступность mockServiceWorker.js.',
      );
    }
  }

  const http = createWarehouseHttpApi(session.baseUrl, {
    beforeRequest: ready,
    listHeaders: ({ role }) =>
      new Headers(role ? [[warehouseDemoRoleHeader, role]] : []),
    errorMessage: (status) =>
      status === 403 ? warehouseDemoOwnerError : undefined,
  });

  return {
    ...http,
    mode: 'mock',
    async list(params, signal) {
      const result = await http.list(params, signal);

      // The HTTP DTO remains unchanged and strictly validated. Roles are local demo metadata.
      return {
        ...result,
        list: result.list.map((warehouse) => ({
          ...warehouse,
          currentUserRole: session.store.getRole(warehouse.id),
        })),
      };
    },
    async invite(id, email) {
      await ready();
      await new Promise<void>((resolve) =>
        setTimeout(resolve, warehouseMockDelayMs),
      );

      // No server endpoint exists: this only acknowledges a demo, not an email or membership.
      return session.store.invite(id, email);
    },
    dispose() {
      runtime.release(session.id);
    },
  };
}
