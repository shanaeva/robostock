import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWarehouseDataSource } from './data-source';
import { createWarehouseHttpApi } from './http-api';
import { defaultWarehouseListParams } from './types';

const warehouseId = '10000000-0000-4000-8000-000000000001';
const summary = { id: warehouseId, name: 'Основной', width: 32, height: 12 };
const listBody = { list: [summary], total: 41, page: 2, limit: 20 };
const api = () => createWarehouseHttpApi('https://api.example.test/v1');

function mockFetch(response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('HTTP warehouse operations (OpenAPI 0.3.0-draft)', () => {
  it('reads the paginated DTO and sends server search/sort, without demo roles', async () => {
    const fetchMock = mockFetch(
      Response.json({
        ...listBody,
        list: [{ ...summary, currentUserRole: 'Owner' }],
      }),
    );
    const result = await api().list({
      ...defaultWarehouseListParams,
      search: '  Основной  ',
      page: 2,
      sortBy: 'width',
      sortOrder: 'desc',
      role: 'Owner',
    });
    expect(result).toEqual(listBody);
    expect(result.list[0]).not.toHaveProperty('currentUserRole');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url.pathname).toBe('/v1/warehouses');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'Основной',
      page: '2',
      limit: '20',
      sortBy: 'width',
      sortOrder: 'desc',
    });
    expect(options).toMatchObject({ method: 'GET', credentials: 'include' });
  });

  it('rejects a successful response with an unexpected or missing body', async () => {
    const fetchMock = mockFetch(Response.json([summary]));
    await expect(api().list(defaultWarehouseListParams)).rejects.toThrow(
      'не соответствует контракту',
    );
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    await expect(api().list(defaultWarehouseListParams)).rejects.toThrow(
      'пустой или некорректный ответ',
    );
  });

  it('creates with exactly name and dimensions and returns only the ID', async () => {
    const fetchMock = mockFetch(
      Response.json({ warehouseId }, { status: 201 }),
    );
    await expect(
      api().create({ name: 'Новый', width: 17, height: 9 }),
    ).resolves.toEqual({ warehouseId });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Новый',
      width: 17,
      height: 9,
    });
  });

  it('renames and deletes on 204 without reading JSON', async () => {
    const response = new Response(null, { status: 204 });
    const json = vi.spyOn(response, 'json');
    const fetchMock = mockFetch(response);
    await expect(
      api().rename(warehouseId, { name: 'Новое' }),
    ).resolves.toBeUndefined();
    await expect(api().remove(warehouseId)).resolves.toBeUndefined();
    expect(json).not.toHaveBeenCalled();
    expect(
      fetchMock.mock.calls.map(([url, options]) => [
        url.pathname,
        options.method,
      ]),
    ).toEqual([
      [`/v1/warehouses/${warehouseId}`, 'PATCH'],
      [`/v1/warehouses/${warehouseId}`, 'DELETE'],
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Новое',
    });
  });

  it('preserves a server ApiError and never retries a failed mutation', async () => {
    const fetchMock = mockFetch(
      Response.json(
        { statusCode: 400, message: 'Недопустимое название' },
        { status: 400 },
      ),
    );
    await expect(
      api().create({ name: 'Новый', width: 20, height: 20 }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Недопустимое название',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 'Необходимо войти в систему'],
    [403, 'Недостаточно прав'],
  ])(
    'explains HTTP %s without inventing an auth redirect',
    async (status, message) => {
      mockFetch(
        Response.json(
          { statusCode: status, message: 'Technical details' },
          { status },
        ),
      );
      await expect(api().remove(warehouseId)).rejects.toMatchObject({
        status,
        message: expect.stringContaining(message),
      });
    },
  );

  it.each([
    [404, ''],
    [500, '<html>upstream error</html>'],
    [500, JSON.stringify({ unexpected: 'body' })],
    [404, JSON.stringify({ statusCode: 400, message: 'Mismatched status' })],
  ])(
    'handles HTTP %s with an empty or unrecognized error body',
    async (status, body) => {
      mockFetch(new Response(body, { status }));
      await expect(api().remove(warehouseId)).rejects.toMatchObject({
        status,
        message: expect.stringContaining(
          status === 404
            ? 'Склад не найден'
            : 'Сервер не смог выполнить запрос',
        ),
      });
    },
  );

  it('reports a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );
    await expect(api().list(defaultWarehouseListParams)).rejects.toMatchObject({
      status: null,
      message: expect.stringContaining('Не удалось связаться с сервером'),
    });
  });
});

describe('explicit data-source selection', () => {
  it('keeps HTTP errors, without falling back to mock data or enabling demo invitations', async () => {
    const fetchMock = mockFetch(new Response(null, { status: 503 }));
    const source = createWarehouseDataSource({
      mode: 'http',
      baseUrl: 'https://api.example.test',
      demoScenario: 'empty',
    });
    expect(source.mode).toBe('http');
    expect(source.invite).toBeUndefined();
    await expect(source.list(defaultWarehouseListParams)).rejects.toMatchObject(
      { status: 503 },
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores demo scenarios in HTTP mode even on a successful response', async () => {
    mockFetch(Response.json(listBody));
    const source = createWarehouseDataSource({
      mode: 'http',
      baseUrl: 'https://api.example.test',
      demoScenario: 'error',
    });
    await expect(source.list(defaultWarehouseListParams)).resolves.toEqual(
      listBody,
    );
  });

  it('reports missing URL and invalid mode instead of silently using mocks', async () => {
    const fetchMock = mockFetch(Response.json(listBody));
    const source = createWarehouseDataSource({ mode: 'http' });
    await expect(source.list(defaultWarehouseListParams)).rejects.toThrow(
      'NEXT_PUBLIC_API_BASE_URL',
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(() => createWarehouseDataSource({ mode: 'typo' })).toThrow(
      'используйте mock или http',
    );
  });

  it('defaults to isolated async mocks and filters before pagination', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch(Response.json(listBody));
    const source = createWarehouseDataSource({});
    expect(source.mode).toBe('mock');
    const request = source.list({
      ...defaultWarehouseListParams,
      role: 'Observer',
      limit: 1,
      page: 2,
    });
    await vi.runAllTimersAsync();
    const result = await request;
    expect(result).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(result.list).toHaveLength(1);
    expect(result.list[0].currentUserRole).toBe('Observer');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
