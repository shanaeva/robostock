import type { DemoWarehouse } from '../model/types';

export const warehousesMock: readonly DemoWarehouse[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Основной склад',
    width: 20,
    height: 20,
    currentUserRole: 'Owner',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Резервный склад',
    width: 30,
    height: 15,
    currentUserRole: 'Observer',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Центральный склад',
    width: 40,
    height: 25,
    currentUserRole: 'Owner',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Склад комплектующих',
    width: 12,
    height: 18,
    currentUserRole: 'Observer',
  },
];
