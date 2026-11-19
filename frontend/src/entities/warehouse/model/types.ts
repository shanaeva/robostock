import type { WarehouseSummary, WarehouseListDto } from './api-contract';

export type WarehouseRole = 'Owner' | 'Observer';

// UI model: absent role means unconfirmed permissions, never Owner by default.
export type Warehouse = WarehouseSummary & {
  currentUserRole?: WarehouseRole;
};

export type DemoWarehouse = WarehouseSummary & {
  currentUserRole: WarehouseRole;
};

export type WarehouseListResult = Omit<WarehouseListDto, 'list'> & {
  list: Warehouse[];
};

export const warehouseRoleLabels: Record<WarehouseRole, string> = {
  Owner: 'Владелец',
  Observer: 'Наблюдатель',
};
