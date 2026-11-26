import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createWarehouseHttpApi } from './http-api';
import { invalidateCsrf } from '@/shared/api';
import { defaultWarehouseListParams } from './types';
import { warehouseCreateSchema } from '../model/schemas';
import {
  WarehouseApiError,
  getHttpErrorMessage,
  getWarehouseErrorMessage,
} from './errors';
import { warehouseErrorSchema } from '../model/api-contract';

const warehouseId = '10000000-0000-4000-8000-000000000001';
const summary = { id: warehouseId, name: 'Основной', width: 32, height: 12 };
const listBody = { list: [summary], total: 41, page: 2, limit: 20 };
const api = () => createWarehouseHttpApi('https://api.example.test/v1');
const csrfToken = 'test-csrf-token';

const server = setupServer(
  http.get('https://api.example.test/auth/csrf', () =>
    HttpResponse.json({ csrfToken }),
  ),
  // No active session in these fixtures: refresh-on-401 always fails,
  // and the original warehouse response should propagate unchanged.
  http.get(
    'https://api.example.test/auth/me',
    () => new HttpResponse(null, { status: 401 }),
  ),
  http.post(
    'https://api.example.test/auth/refresh',
    () => new HttpResponse(null, { status: 401 }),
  ),
);
const requests = [];
const unhandled = [];

beforeAll(() => {
  server.events.on('request:start', ({ request }) => requests.push(request));
  server.events.on('request:unhandled', ({ request }) =>
    unhandled.push(request.url),
  );
  server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => server.close());

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

afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  invalidateCsrf('https://api.example.test');
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
  ])('validates creation dimensions %s (valid: %s)', (value, valid) => {
    for (const field of ['width', 'height']) {
      const input = { name: 'Boundary', width: 20, height: 20, [field]: value };
      expect(warehouseCreateSchema.safeParse(input).success).toBe(valid);
    }
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

  it('reports a missing API URL before sending a request', async () => {
    const handler = respondWith(Response.json(listBody));
    await expect(
      createWarehouseHttpApi().list(defaultWarehouseListParams),
    ).rejects.toThrow('NEXT_PUBLIC_API_BASE_URL');
    expect(handler).not.toHaveBeenCalled();
  });
});
