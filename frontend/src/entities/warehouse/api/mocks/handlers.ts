import { http, HttpResponse } from 'msw';
import { mockApiOrigin } from '@/shared/api';
import type { WarehouseListDto } from '../../model/api-contract';

const warehousesUrl = `${mockApiOrigin}/warehouses`;
const warehouses = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Основной склад',
    width: 20,
    height: 20,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Резервный склад',
    width: 30,
    height: 15,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Центральный склад',
    width: 40,
    height: 25,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Склад комплектующих',
    width: 12,
    height: 18,
  },
];

const listResponse = {
  list: warehouses,
  total: warehouses.length,
  page: 1,
  limit: 20,
} satisfies WarehouseListDto;

export const warehouseMockHandlers = [
  http.get(warehousesUrl, () => HttpResponse.json(listResponse)),
  http.post(warehousesUrl, () =>
    HttpResponse.json(
      { warehouseId: '10000000-0000-4000-8000-000000000005' },
      { status: 201 },
    ),
  ),
  http.patch(
    `${warehousesUrl}/:warehouseId`,
    () => new HttpResponse(null, { status: 204 }),
  ),
  http.delete(
    `${warehousesUrl}/:warehouseId`,
    () => new HttpResponse(null, { status: 204 }),
  ),
];
