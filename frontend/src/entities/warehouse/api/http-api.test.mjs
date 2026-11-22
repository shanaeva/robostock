import { warehouseMockFallback } from './mocks/handlers';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createWarehouseNodeRuntime } from './mocks/node';
import { createWarehouseDataSource } from './data-source';
import { createWarehouseHttpApi } from './http-api';
import { defaultWarehouseListParams } from './types';
import { warehousesMock } from './mock-data';
import { warehouseCreateSchema } from '../model/schemas';
import {
  WarehouseApiError,
  getHttpErrorMessage,
  getWarehouseErrorMessage,
} from './errors';
import {
  warehouseSummarySchema,
  warehouseErrorSchema,
} from '../model/api-contract';

const warehouseId = '10000000-0000-4000-8000-000000000001';
const summary = { id: warehouseId, name: 'Основной', width: 32, height: 12 };
const listBody = { list: [summary], total: 41, page: 2, limit: 20 };
const api = () => createWarehouseHttpApi('https://api.example.test/v1');

const server = setupServer();
const requests = [];
const unhandled = [];
let runtime;

beforeAll(() => {
  server.events.on('request:start', ({ request }) => requests.push(request));
  server.events.on('request:unhandled', ({ request }) =>
    unhandled.push(request.url),
  );
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  runtime = createWarehouseNodeRuntime(server);
});
afterAll(() => server.close());

function mockSource(options = {}) {
  return createWarehouseDataSource({ ...options, mockRuntime: runtime });
}

function respondWith(response) {
  const handler = vi.fn(() => response.clone());
  server.use(
    http.all(
      /^https:\/\/api\.example\.test\/(?:v1\/)?warehouses(?:\/[^/?]+)?(?:\?.*)?$/,
      ({ request }) => handler(request),
    ),
  );

  return handler;
}

afterEach(async () => {
  await runtime.deactivate();
  server.resetHandlers(warehouseMockFallback);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  requests.length = 0;
  expect(unhandled.splice(0)).toEqual([]);
});

describe('warehouse contract fixtures and errors', () => {
  it.each([
    [1, true],
    [500, true],
    [0, false],
    [501, false],
    [1.5, false],
  ])('validates creation dimensions %s (valid: %s)', async (value, valid) => {
    const source = mockSource({ demoScenario: 'empty' });
    for (const field of ['width', 'height']) {
      const input = { name: 'Boundary', width: 20, height: 20, [field]: value };
      expect(warehouseCreateSchema.safeParse(input).success).toBe(valid);
      const result = source.create(input);
      const assertion = valid
        ? expect(result).resolves.toHaveProperty('warehouseId')
        : expect(result).rejects.toMatchObject({ status: 400 });

      await assertion;
    }
    const list = source.list(defaultWarehouseListParams);

    expect((await list).total).toBe(valid ? 2 : 0);
  });

  it('validates every initial mock warehouse and keeps IDs unique', () => {
    for (const warehouse of warehousesMock) {
      expect(warehouseSummarySchema.safeParse(warehouse).success).toBe(true);
    }
    expect(new Set(warehousesMock.map(({ id }) => id)).size).toBe(
      warehousesMock.length,
    );
  });

  it.each(['', ' \t\n '])(
    'accepts an error message %j without normalizing the server DTO',
    (message) => {
      const body = { statusCode: 400, message };
      expect(warehouseErrorSchema.parse(body)).toEqual(body);
    },
  );

  it('rejects missing and non-string error messages', () => {
    expect(warehouseErrorSchema.safeParse({ statusCode: 400 }).success).toBe(
      false,
    );
    for (const message of [undefined, null, 42, {}, []]) {
      expect(
        warehouseErrorSchema.safeParse({ statusCode: 400, message }).success,
      ).toBe(false);
    }
  });

  it('normalizes a nonempty error message only for display', () => {
    const body = { statusCode: 400, message: '  Недопустимое название  ' };
    expect(warehouseErrorSchema.parse(body)).toEqual(body);
    expect(
      getWarehouseErrorMessage(
        new WarehouseApiError(body.statusCode, body.message),
      ),
    ).toBe('Недопустимое название');
  });
});

describe('HTTP warehouse operations (OpenAPI 0.3.0-draft)', () => {
  it('reads the paginated DTO and sends server search/sort, without demo roles', async () => {
    const handler = respondWith(
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
    const [request] = handler.mock.calls[0];
    const url = new URL(request.url);
    expect(url.pathname).toBe('/v1/warehouses');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'Основной',
      page: '2',
      limit: '20',
      sortBy: 'width',
      sortOrder: 'desc',
    });
    expect(request.method).toBe('GET');
    expect(request.credentials).toBe('include');
  });

  it('rejects a successful response with an unexpected or missing body', async () => {
    const handler = respondWith(Response.json([summary]));
    await expect(api().list(defaultWarehouseListParams)).rejects.toThrow(
      'не соответствует контракту',
    );
    handler.mockReturnValueOnce(new Response(null, { status: 200 }));
    await expect(api().list(defaultWarehouseListParams)).rejects.toThrow(
      'пустой или некорректный ответ',
    );
  });

  it('creates with exactly name and dimensions and returns only the ID', async () => {
    const handler = respondWith(
      Response.json({ warehouseId }, { status: 201 }),
    );
    await expect(
      api().create({ name: 'Новый', width: 17, height: 9 }),
    ).resolves.toEqual({ warehouseId });
    const [request] = handler.mock.calls[0];
    expect(request.method).toBe('POST');
    expect(await request.json()).toEqual({
      name: 'Новый',
      width: 17,
      height: 9,
    });
  });

  it('renames and deletes on 204 without reading JSON', async () => {
    const response = new Response(null, { status: 204 });
    const handler = respondWith(response);
    await expect(
      api().rename(warehouseId, { name: 'Новое' }),
    ).resolves.toBeUndefined();
    await expect(api().remove(warehouseId)).resolves.toBeUndefined();
    expect(
      handler.mock.calls.map(([request]) => [
        new URL(request.url).pathname,
        request.method,
      ]),
    ).toEqual([
      [`/v1/warehouses/${warehouseId}`, 'PATCH'],
      [`/v1/warehouses/${warehouseId}`, 'DELETE'],
    ]);
    expect(await handler.mock.calls[0][0].json()).toEqual({
      name: 'Новое',
    });
  });

  it('preserves a server ApiError and never retries a failed mutation', async () => {
    const handler = respondWith(
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
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, 'Необходимо войти в систему'],
    [403, 'Недостаточно прав'],
  ])(
    'explains HTTP %s without inventing an auth redirect',
    async (status, message) => {
      respondWith(
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

  it.each([400, 401, 403, 404, 500])(
    'displays the HTTP %s fallback when the server message is blank',
    async (status) => {
      for (const message of ['', ' \t\n ']) {
        respondWith(Response.json({ statusCode: status, message }, { status }));
        const error = await api()
          .remove(warehouseId)
          .catch((error) => error);
        expect(error).toMatchObject({ status });
        expect(getWarehouseErrorMessage(error)).toBe(
          getHttpErrorMessage(status),
        );
        expect(getWarehouseErrorMessage(error).trim()).not.toBe('');
      }
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
      respondWith(new Response(body, { status }));
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
    server.use(
      http.get('https://api.example.test/v1/warehouses', () =>
        HttpResponse.error(),
      ),
    );
    await expect(api().list(defaultWarehouseListParams)).rejects.toMatchObject({
      status: null,
      message: expect.stringContaining('Не удалось связаться с сервером'),
    });
  });
});

describe('explicit data-source selection', () => {
  it.each(['name', 'width', 'height'])(
    'uses ID ASC to break %s ties in either primary direction',
    async (sortBy) => {
      const source = mockSource({ demoScenario: 'empty' });
      const ids = [];
      for (let index = 0; index < 4; index++) {
        const higher = index === 3;
        const created = source.create({
          name: higher ? 'Z' : 'A',
          width: higher ? 40 : 20,
          height: higher ? 40 : 20,
        });

        ids.push((await created).warehouseId);
      }
      const tiedIds = ids.slice(0, 3).sort((a, b) => a.localeCompare(b));
      for (const sortOrder of ['asc', 'desc']) {
        const list = source.list({
          ...defaultWarehouseListParams,
          sortBy,
          sortOrder,
        });

        expect((await list).list.map(({ id }) => id)).toEqual(
          sortOrder === 'asc' ? [...tiedIds, ids[3]] : [ids[3], ...tiedIds],
        );
        const byId = source.list({
          ...defaultWarehouseListParams,
          sortBy: 'id',
          sortOrder,
        });

        const sortedIds = [...ids].sort((a, b) => a.localeCompare(b));
        expect((await byId).list.map(({ id }) => id)).toEqual(
          sortOrder === 'asc' ? sortedIds : sortedIds.reverse(),
        );
      }
    },
  );

  it('keeps HTTP errors, without falling back to mock data or enabling demo invitations', async () => {
    const handler = respondWith(new Response(null, { status: 503 }));
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
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('ignores demo scenarios in HTTP mode even on a successful response', async () => {
    respondWith(Response.json(listBody));
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
    const handler = respondWith(Response.json(listBody));
    const source = createWarehouseDataSource({ mode: 'http' });
    await expect(source.list(defaultWarehouseListParams)).rejects.toThrow(
      'NEXT_PUBLIC_API_BASE_URL',
    );
    expect(handler).not.toHaveBeenCalled();
    expect(() => createWarehouseDataSource({ mode: 'typo' })).toThrow(
      'используйте mock или http',
    );
  });

  it('defaults to isolated HTTP mocks and filters demo roles before pagination', async () => {
    const source = mockSource();
    expect(source.mode).toBe('mock');
    const result = await source.list({
      ...defaultWarehouseListParams,
      role: 'Observer',
      limit: 1,
      page: 2,
    });
    expect(result).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(result.list).toHaveLength(1);
    expect(result.list[0].currentUserRole).toBe('Observer');
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).origin).toBe(
      'https://warehouse-mocks.invalid',
    );
    expect(requests[0].headers.get('X-Warehouse-Demo-Role')).toBe('Observer');
    expect(new URL(requests[0].url).searchParams.has('role')).toBe(false);
  });
});
