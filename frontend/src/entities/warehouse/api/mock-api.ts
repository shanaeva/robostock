import type { Warehouse } from '../model/types';
import { warehousesMock } from './mock-data';

export type WarehouseDemoScenario = 'default' | 'empty' | 'error' | 'mutation-error' | 'forbidden';

export class WarehouseApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'WarehouseApiError';
  }
}

export function getWarehouseErrorMessage(error: unknown) {
  if (error instanceof WarehouseApiError) return error.message;
  return 'Не удалось выполнить действие. Попробуйте ещё раз.';
}

// Each mounted page owns its own instance. No shared mutable fixture or persistence.
export function createWarehouseMockApi(scenario: WarehouseDemoScenario = 'default') {
  let warehouses = scenario === 'empty' ? [] : warehousesMock.map((warehouse) => ({ ...warehouse }));
  let failNextList = scenario === 'error';
  const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 450));

  function checkMutation() {
    if (scenario === 'mutation-error') {
      throw new WarehouseApiError(500, 'Не удалось сохранить изменения. Попробуйте ещё раз.');
    }
  }

  function requireOwner(id: string) {
    const warehouse = warehouses.find((item) => item.id === id);
    if (!warehouse) throw new WarehouseApiError(404, 'Склад не найден. Обновите список.');
    if (scenario === 'forbidden' || warehouse.currentUserRole !== 'Owner') {
      throw new WarehouseApiError(403, 'Недостаточно прав для этого действия. Доступ разрешён только владельцу склада.');
    }
    return warehouse;
  }

  function validateName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new WarehouseApiError(400, 'Введите название склада.');
    return trimmed;
  }

  return {
    async list(): Promise<Warehouse[]> {
      await wait();
      if (failNextList) {
        failNextList = false;
        throw new WarehouseApiError(500, 'Не удалось загрузить склады. Попробуйте ещё раз.');
      }
      return warehouses.map((warehouse) => ({ ...warehouse }));
    },
    async create(name: string): Promise<Warehouse> {
      await wait();
      checkMutation();
      const warehouse: Warehouse = {
        id: crypto.randomUUID(),
        name: validateName(name),
        currentUserRole: 'Owner',
      };
      warehouses = [...warehouses, warehouse];
      return { ...warehouse };
    },
    async rename(id: string, name: string): Promise<Warehouse> {
      await wait();
      const warehouse = requireOwner(id);
      checkMutation();
      const renamed = { ...warehouse, name: validateName(name) };
      warehouses = warehouses.map((warehouse) => warehouse.id === id ? renamed : warehouse);
      return { ...renamed };
    },
    async remove(id: string): Promise<void> {
      await wait();
      requireOwner(id);
      checkMutation();
      warehouses = warehouses.filter((warehouse) => warehouse.id !== id);
    },
    async invite(id: string, email: string) {
      await wait();
      requireOwner(id);
      checkMutation();
      // Demo acknowledgement only: no email is sent and no membership is created.
      return { email: email.trim(), role: 'Observer' as const };
    },
  };
}

export type WarehouseMockApi = ReturnType<typeof createWarehouseMockApi>;
