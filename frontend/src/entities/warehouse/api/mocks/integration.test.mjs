import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { mockApiOrigin } from '@/shared/api';
import { createWarehouseHttpApi } from '../http-api';
import { defaultWarehouseListParams } from '../types';
import { warehouseMockHandlers } from './handlers';

const server = setupServer(...warehouseMockHandlers);
const endpoint = mockApiOrigin + '/warehouses';
const api = createWarehouseHttpApi(mockApiOrigin);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('uses valid fixed responses and leaves the fixture unchanged after CRUD and list parameters', async () => {
  const original = await api.list(defaultWarehouseListParams);
  expect(original.list).toHaveLength(4);
  expect(new Set(original.list.map(({ id }) => id)).size).toBe(original.total);
  expect(original.list.every((item) => !('currentUserRole' in item))).toBe(
    true,
  );
  const id = original.list[0].id;
  await expect(
    api.create({ name: 'Новый склад', width: 20, height: 20 }),
  ).resolves.toEqual({ warehouseId: '10000000-0000-4000-8000-000000000005' });
  await expect(
    api.rename(id, { name: 'Другое название' }),
  ).resolves.toBeUndefined();
  await expect(api.remove(id)).resolves.toBeUndefined();
  await expect(
    api.list({
      ...defaultWarehouseListParams,
      search: 'Нет такого склада',
      page: 2,
      limit: 50,
      sortBy: 'width',
      sortOrder: 'desc',
    }),
  ).resolves.toEqual(original);
  expect(api.invite).toBeUndefined();
});

it('supports an empty response through a test-only handler override', async () => {
  server.use(
    http.get(endpoint, () =>
      HttpResponse.json({ list: [], total: 0, page: 1, limit: 20 }),
    ),
  );
  await expect(api.list(defaultWarehouseListParams)).resolves.toEqual({
    list: [],
    total: 0,
    page: 1,
    limit: 20,
  });
});

it.each([401, 403, 404, 500])(
  'handles overridden HTTP %s without returning the fixture',
  async (status) => {
    server.use(
      http.get(endpoint, () =>
        HttpResponse.json(
          { statusCode: status, message: 'Scenario error' },
          { status },
        ),
      ),
    );
    await expect(api.list(defaultWarehouseListParams)).rejects.toMatchObject({
      status,
    });
  },
);

it('preserves mutation API errors supplied by a test override', async () => {
  server.use(
    http.post(endpoint, () =>
      HttpResponse.json(
        { statusCode: 400, message: 'Не удалось сохранить склад' },
        { status: 400 },
      ),
    ),
  );
  await expect(
    api.create({ name: 'Новый', width: 20, height: 20 }),
  ).rejects.toMatchObject({
    status: 400,
    message: 'Не удалось сохранить склад',
  });
});

it('rejects an invalid success body instead of replacing it with fixture data', async () => {
  server.use(
    http.get(endpoint, () =>
      HttpResponse.json({
        list: [{ id: 'invalid' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
  );
  await expect(api.list(defaultWarehouseListParams)).rejects.toThrow(
    'не соответствует контракту',
  );
});

it('restores the common handlers between tests', async () => {
  await expect(api.list(defaultWarehouseListParams)).resolves.toHaveProperty(
    'total',
    4,
  );
});
