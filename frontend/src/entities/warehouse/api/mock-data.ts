import type { Warehouse } from '../model/types';

export const warehousesMock: readonly Warehouse[] = [
  {
    id: 'warehouse-1',
    name: 'Основной склад',
    currentUserRole: 'Owner',
  },
  {
    id: 'warehouse-2',
    name: 'Резервный склад',
    currentUserRole: 'Observer',
  },
  {
    id: 'warehouse-3',
    name: 'Центральный склад',
    currentUserRole: 'Owner',
  },
  {
    id: 'warehouse-4',
    name: 'Склад комплектующих',
    currentUserRole: 'Observer',
  },
];
