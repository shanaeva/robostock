import type { DemoWarehouse } from '../model/types';

export const warehousesMock: readonly DemoWarehouse[] = [
  {
    id: 'warehouse-1',
    name: 'Основной склад',
    width: 20,
    height: 20,
    currentUserRole: 'Owner',
  },
  {
    id: 'warehouse-2',
    name: 'Резервный склад',
    width: 30,
    height: 15,
    currentUserRole: 'Observer',
  },
  {
    id: 'warehouse-3',
    name: 'Центральный склад',
    width: 40,
    height: 25,
    currentUserRole: 'Owner',
  },
  {
    id: 'warehouse-4',
    name: 'Склад комплектующих',
    width: 12,
    height: 18,
    currentUserRole: 'Observer',
  },
];
