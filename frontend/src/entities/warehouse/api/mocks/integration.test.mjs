import { afterAll, beforeAll, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { mockApiOrigin } from '@/shared/api';
import { createWarehouseHttpApi } from '../http-api';
import { defaultWarehouseListParams } from '../types';
import { warehouseMockHandlers } from './handlers';

const server = setupServer(...warehouseMockHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

it('returns the same warehouse fixture after create, rename and delete', async () => {
  const api = createWarehouseHttpApi(mockApiOrigin);
  const original = await api.list(defaultWarehouseListParams);
  const id = original.list[0].id;

  expect(original.total).toBe(original.list.length);
  expect(new Set(original.list.map(({ id }) => id)).size).toBe(original.total);
  await expect(
    api.create({ name: 'Новый склад', width: 20, height: 20 }),
  ).resolves.toEqual({
    warehouseId: '10000000-0000-4000-8000-000000000005',
  });
  await expect(
    api.rename(id, { name: 'Другое название' }),
  ).resolves.toBeUndefined();
  await expect(api.remove(id)).resolves.toBeUndefined();
  await expect(
    api.list({ ...defaultWarehouseListParams, search: 'Нет такого склада' }),
  ).resolves.toEqual(original);
});
