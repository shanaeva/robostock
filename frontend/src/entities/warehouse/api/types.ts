import type {
  WarehouseCreateInput,
  WarehouseRenameInput,
} from '../model/schemas';
import type { WarehouseListResult, WarehouseRole } from '../model/types';

export type WarehouseDemoScenario =
  'default' | 'empty' | 'error' | 'mutation-error' | 'forbidden';

export type WarehouseListParams = {
  search: string;
  page: number;
  limit: number;
  sortBy: 'id' | 'name' | 'width' | 'height';
  sortOrder: 'asc' | 'desc';
  // Demo-only. The HTTP adapter never sends this parameter.
  role?: WarehouseRole;
};

export const defaultWarehouseListParams: WarehouseListParams = {
  search: '',
  page: 1,
  limit: 20,
  sortBy: 'name',
  sortOrder: 'asc',
};

export type WarehouseDataSource = {
  readonly mode: 'mock' | 'http';
  list(
    params: WarehouseListParams,
    signal?: AbortSignal,
  ): Promise<WarehouseListResult>;
  create(input: WarehouseCreateInput): Promise<{ warehouseId: string }>;
  rename(id: string, input: WarehouseRenameInput): Promise<void>;
  remove(id: string): Promise<void>;
  // Only mocks implement invitations: there is no invitation endpoint in the draft.
  invite?: (
    id: string,
    email: string,
  ) => Promise<{ email: string; role: 'Observer' }>;
};
