export { createWarehouseHttpApi } from './api/http-api';
export {
  WarehouseApiError,
  getWarehouseErrorMessage,
  getHttpErrorMessage,
} from './api/errors';
export { useWarehouses, warehousesQueryKey } from './api/queries';
export { defaultWarehouseListParams } from './api/types';
export type { WarehouseDataSource, WarehouseListParams } from './api/types';
export { warehouseNameSchema, warehouseCreateSchema } from './model/schemas';
export type {
  WarehouseCreateInput,
  WarehouseRenameInput,
} from './model/schemas';
export { warehouseRoleLabels } from './model/types';
export type {
  Warehouse,
  WarehouseRole,
  WarehouseListResult,
} from './model/types';
export {
  WAREHOUSE_NAME_MIN_LENGTH,
  WAREHOUSE_NAME_MAX_LENGTH,
  WAREHOUSE_DIMENSION_MIN,
  WAREHOUSE_DIMENSION_MAX,
} from './model/constants';

const isDevelopment = process.env.NODE_ENV === 'development';
export const warehouseDataSourceMode =
  process.env.NEXT_PUBLIC_WAREHOUSE_DATA_SOURCE ??
  (isDevelopment ? 'mock' : 'http');
export const warehouseMocksEnabled =
  isDevelopment && warehouseDataSourceMode === 'mock';

export async function loadWarehouseMockHandlers() {
  const { warehouseMockHandlers } = await import('./api/mocks/handlers');

  return warehouseMockHandlers;
}
