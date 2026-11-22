import type { DemoWarehouse } from '../../model/types';
import type { WarehouseListParams, WarehouseDemoScenario } from '../types';
import { WarehouseApiError } from '../errors';
import {
  warehouseCreateSchema,
  warehouseNameSchema,
} from '../../model/schemas';
import { warehousesMock } from '../mock-data';

export const warehouseDemoOwnerError =
  'Недостаточно прав для этого действия. Доступ разрешён только владельцу склада.';

// Only handlers execute CRUD. The demo layer can read roles and acknowledge invitations.
export function createWarehouseMockStore(
  scenario: WarehouseDemoScenario = 'default',
) {
  let warehouses =
    scenario === 'empty'
      ? []
      : warehousesMock.map((warehouse) => ({ ...warehouse }));
  let failNextList = scenario === 'error';

  function checkMutation() {
    if (scenario === 'mutation-error') {
      throw new WarehouseApiError(
        500,
        'Не удалось сохранить изменения. Попробуйте ещё раз.',
      );
    }
  }

  function requireOwner(id: string) {
    const warehouse = warehouses.find((item) => item.id === id);

    if (!warehouse) {
      throw new WarehouseApiError(404, 'Склад не найден. Обновите список.');
    }

    if (scenario === 'forbidden' || warehouse.currentUserRole !== 'Owner') {
      throw new WarehouseApiError(403, warehouseDemoOwnerError);
    }

    return warehouse;
  }

  return {
    list(params: WarehouseListParams) {
      if (failNextList) {
        failNextList = false;
        throw new WarehouseApiError(
          500,
          'Не удалось загрузить склады. Попробуйте ещё раз.',
        );
      }

      const matching = warehouses.filter(
        (warehouse) =>
          warehouse.name
            .toLocaleLowerCase('ru')
            .includes(params.search.trim().toLocaleLowerCase('ru')) &&
          (!params.role || warehouse.currentUserRole === params.role),
      );
      matching.sort((left, right) => {
        const a = left[params.sortBy];
        const b = right[params.sortBy];
        const comparison =
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a).localeCompare(String(b), 'ru');
        const directed = params.sortOrder === 'asc' ? comparison : -comparison;

        return directed || left.id.localeCompare(right.id);
      });
      const start = (params.page - 1) * params.limit;

      return {
        list: matching
          .slice(start, start + params.limit)
          .map((warehouse) => ({ ...warehouse })),
        total: matching.length,
        page: params.page,
        limit: params.limit,
      };
    },
    create(input: unknown): { warehouseId: string } {
      checkMutation();
      const parsed = warehouseCreateSchema.safeParse(input);

      if (!parsed.success) {
        throw new WarehouseApiError(400, parsed.error.issues[0].message);
      }
      const warehouseId = crypto.randomUUID();
      const warehouse: DemoWarehouse = {
        id: warehouseId,
        ...parsed.data,
        // Creation ownership is simulated; roles of existing warehouses stay intact.
        currentUserRole: 'Owner',
      };
      warehouses = [...warehouses, warehouse];

      return { warehouseId };
    },
    rename(id: string, input: unknown): void {
      const warehouse = requireOwner(id);
      checkMutation();
      const parsed = warehouseNameSchema.safeParse(input);

      if (!parsed.success) {
        throw new WarehouseApiError(400, parsed.error.issues[0].message);
      }
      const renamed = { ...warehouse, name: parsed.data.name };
      warehouses = warehouses.map((warehouse) =>
        warehouse.id === id ? renamed : warehouse,
      );
    },
    remove(id: string): void {
      requireOwner(id);
      checkMutation();
      warehouses = warehouses.filter((warehouse) => warehouse.id !== id);
    },
    getRole(id: string) {
      return warehouses.find((warehouse) => warehouse.id === id)
        ?.currentUserRole;
    },
    invite(id: string, email: string) {
      requireOwner(id);
      checkMutation();

      // Demo acknowledgement only: no email is sent and no membership is created.
      return { email: email.trim(), role: 'Observer' as const };
    },
  };
}
