import { warehouseMockFallback } from './handlers';
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
import { createWarehouseDataSource } from '../data-source';
import { createWarehouseHttpApi } from '../http-api';
import { defaultWarehouseListParams as params } from '../types';
import { warehousesMock } from '../mock-data';
import { createWarehouseNodeRuntime } from './node';
import { createWarehouseMockSession } from './session';

const server = setupServer();
let runtime;
const requests = [];
const responses = [];
const unhandled = [];
beforeAll(() => {
  server.events.on('request:start', ({ request }) =>
    requests.push(request.clone()),
  );
  server.events.on('response:mocked', ({ response }) =>
    responses.push(response.clone()),
  );
  server.events.on('request:unhandled', ({ request }) =>
    unhandled.push(request.url),
  );
  server.listen({ onUnhandledRequest: 'error' });
});
beforeEach(() => {
  runtime = createWarehouseNodeRuntime(server);
});
afterEach(async () => {
  await runtime.deactivate();
  server.resetHandlers(warehouseMockFallback);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  requests.length = 0;
  responses.length = 0;
  expect(unhandled.splice(0)).toEqual([]);
});
afterAll(() => server.close());
const source = (demoScenario = 'default') =>
  createWarehouseDataSource({
    mode: 'mock',
    demoScenario,
    mockRuntime: runtime,
  });
const input = { name: '  New warehouse  ', width: 20, height: 20 };
const ownerId = warehousesMock.find(
  ({ currentUserRole }) => currentUserRole === 'Owner',
).id;
const observerId = warehousesMock.find(
  ({ currentUserRole }) => currentUserRole === 'Observer',
).id;

describe('warehouse HTTP adapter with shared MSW handlers', () => {
  it('performs CRUD through HTTP with contract-only DTOs and empty 204 responses', async () => {
    const api = source('empty');
    const { warehouseId } = await api.create(input);
    expect(responses[0].status).toBe(201);
    expect(await responses[0].json()).toEqual({ warehouseId });
    expect(await requests[0].clone().json()).toEqual(input);
    expect(requests[0].headers.get('Content-Type')).toBe('application/json');
    let result = await api.list(params);
    expect(result.list).toEqual([
      {
        id: warehouseId,
        name: 'New warehouse',
        width: 20,
        height: 20,
        currentUserRole: 'Owner',
      },
    ]);
    expect(await responses[1].json()).toEqual({
      list: [{ id: warehouseId, name: 'New warehouse', width: 20, height: 20 }],
      total: 1,
      page: 1,
      limit: params.limit,
    });
    await expect(
      api.rename(warehouseId, { name: '  Renamed  ' }),
    ).resolves.toBeUndefined();
    expect(responses[2].status).toBe(204);
    expect(await responses[2].text()).toBe('');
    result = await api.list(params);
    expect(result.list[0].name).toBe('Renamed');
    await expect(api.remove(warehouseId)).resolves.toBeUndefined();
    expect(responses[4].status).toBe(204);
    expect(await responses[4].text()).toBe('');
    expect((await api.list(params)).total).toBe(0);
    expect(requests.map(({ method }) => method)).toEqual([
      'POST',
      'GET',
      'PATCH',
      'GET',
      'DELETE',
      'GET',
    ]);
    expect(
      requests.every(
        ({ url }) => new URL(url).origin === 'https://warehouse-mocks.invalid',
      ),
    ).toBe(true);
  });

  it('searches, sorts and paginates after applying demo role filters', async () => {
    const api = source('empty');
    for (let index = 0; index < 23; index++) {
      await api.create({
        name: `Warehouse ${String(index).padStart(2, '0')}`,
        width: index + 1,
        height: 20,
      });
    }
    const page = await api.list({
      ...params,
      search: ' Warehouse ',
      role: 'Owner',
      sortBy: 'width',
      sortOrder: 'desc',
      page: 2,
      limit: 10,
    });
    expect(page).toMatchObject({ total: 23, page: 2, limit: 10 });
    expect(page.list.map(({ width }) => width)).toEqual([
      13, 12, 11, 10, 9, 8, 7, 6, 5, 4,
    ]);
    expect(
      (await api.list({ ...params, search: 'Warehouse 22' })).list[0].width,
    ).toBe(23);
    expect((await api.list({ ...params, role: 'Observer' })).total).toBe(0);
  });

  it('isolates mounted screens, retains data during reactivation and resets a new screen', async () => {
    const first = source();
    await first.create(input);
    const second = source();
    expect((await second.list(params)).total).toBe(4);
    const disposedUrl = requests[0].url;
    first.dispose();
    expect((await fetch(disposedUrl)).status).toBe(503);
    expect((await first.list(params)).total).toBe(5);
    expect((await second.list(params)).total).toBe(4);
    expect((await source().list(params)).total).toBe(4);
  });

  it('keeps demo roles and invitations outside HTTP response bodies and endpoints', async () => {
    const api = source();
    const result = await api.list(params);
    expect(result.list.find(({ id }) => id === ownerId).currentUserRole).toBe(
      'Owner',
    );
    expect(
      (await responses[0].json()).list.every(
        (item) => !('currentUserRole' in item),
      ),
    ).toBe(true);
    await expect(
      api.invite(ownerId, '  observer@example.test  '),
    ).resolves.toEqual({ email: 'observer@example.test', role: 'Observer' });
    expect(requests).toHaveLength(1);
    await expect(
      api.rename(observerId, { name: 'Denied' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      api.invite(observerId, 'x@example.test'),
    ).rejects.toMatchObject({ status: 403 });
    expect(requests).toHaveLength(2);
  });

  it('retries the error scenario and keeps empty / mutation-error / forbidden scenarios', async () => {
    const retry = source('error');
    await expect(retry.list(params)).rejects.toMatchObject({ status: 500 });
    expect((await retry.list(params)).total).toBe(4);
    expect((await source('empty').list(params)).list).toEqual([]);
    const failing = source('mutation-error');
    await expect(failing.create(input)).rejects.toMatchObject({ status: 500 });
    await expect(
      failing.rename(ownerId, { name: 'Changed' }),
    ).rejects.toMatchObject({ status: 500 });
    await expect(failing.remove(ownerId)).rejects.toMatchObject({
      status: 500,
    });
    await expect(
      failing.invite(ownerId, 'x@example.test'),
    ).rejects.toMatchObject({ status: 500 });
    expect((await failing.list(params)).list).toEqual(
      (await source().list(params)).list,
    );
    const forbidden = source('forbidden');
    await expect(
      forbidden.rename(ownerId, { name: 'Changed' }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(forbidden.remove(ownerId)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      forbidden.invite(ownerId, 'x@example.test'),
    ).rejects.toMatchObject({ status: 403 });
    await expect(forbidden.create(input)).resolves.toHaveProperty(
      'warehouseId',
    );
  });

  it('validates names and reports missing warehouses through contract errors', async () => {
    const api = source();
    for (const name of ['', '  ', 'x'.repeat(101)]) {
      await expect(api.create({ ...input, name })).rejects.toMatchObject({
        status: 400,
      });
      await expect(api.rename(ownerId, { name })).rejects.toMatchObject({
        status: 400,
      });
    }
    await expect(
      api.rename(ownerId, { name: 'x'.repeat(100) }),
    ).resolves.toBeUndefined();
    await expect(
      api.remove('10000000-0000-4000-8000-000000000099'),
    ).rejects.toMatchObject({ status: 404 });
    expect(await responses.at(-1).json()).toMatchObject({
      statusCode: 404,
      message: expect.any(String),
    });
  });

  it('validates raw HTTP parameters and bodies instead of trusting the adapter', async () => {
    const session = createWarehouseMockSession('empty');
    await runtime.activate(session);
    const url = new URL('warehouses', session.baseUrl);
    expect((await fetch(url)).status).toBe(200);
    expect(await responses[0].json()).toEqual({
      list: [],
      total: 0,
      page: 1,
      limit: params.limit,
    });
    for (const query of [
      'page=0',
      'limit=0',
      'sortBy=unknown',
      'sortOrder=up',
    ]) {
      expect((await fetch(`${url}?${query}`)).status).toBe(400);
    }
    expect(
      (await fetch(url, { method: 'POST', body: '{invalid' })).status,
    ).toBe(400);
    expect(
      (
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify({ name: 'X', width: '20', height: 20 }),
        })
      ).status,
    ).toBe(400);
  });

  it.each([
    ['100', 100],
    [undefined, 20],
  ])(
    'accepts HTTP limit=%s and returns page size %s',
    async (limit, expectedLimit) => {
      const session = createWarehouseMockSession('empty');
      await runtime.activate(session);
      const url = new URL('warehouses', session.baseUrl);

      if (limit !== undefined) {
        url.searchParams.set('limit', limit);
      }
      const response = await fetch(url);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        list: [],
        total: 0,
        page: 1,
        limit: expectedLimit,
      });
    },
  );

  it('rejects HTTP limit=101 with an API error', async () => {
    const session = createWarehouseMockSession('empty');
    await runtime.activate(session);
    const url = new URL('warehouses', session.baseUrl);
    url.searchParams.set('limit', '101');
    const response = await fetch(url);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      statusCode: 400,
      message: expect.stringMatching(/\S/),
    });
  });

  it('waits for initialization and never sends requests if MSW fails to start', async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const guarded = {
      ...runtime,
      activate: async (session) => {
        await gate;

        await runtime.activate(session);
      },
    };
    const api = createWarehouseDataSource({
      mode: 'mock',
      mockRuntime: guarded,
    });
    const pending = api.list(params);
    await Promise.resolve();
    expect(requests).toHaveLength(0);
    release();
    await expect(pending).resolves.toHaveProperty('total', 4);
    requests.length = 0;
    const failed = createWarehouseDataSource({
      mode: 'mock',
      baseUrl: 'https://real-backend.example.test',
      mockRuntime: {
        ...runtime,
        activate: async () => {
          throw new Error('No Service Worker');
        },
      },
    });
    for (const operation of [
      () => failed.list(params),
      () => failed.create(input),
      () => failed.rename(ownerId, { name: 'X' }),
      () => failed.remove(ownerId),
      () => failed.invite(ownerId, 'x@example.test'),
    ]) {
      await expect(operation()).rejects.toThrow(
        'Не удалось запустить моки складов (MSW)',
      );
    }
    expect(requests).toHaveLength(0);
  });

  it('does not intercept HTTP mode after mock mode, preserving other handlers', async () => {
    const demo = source();
    await demo.list(params);
    server.use(
      http.get('https://real-api.example.test/warehouses', ({ request }) => {
        expect(request.headers.has('X-Warehouse-Demo-Role')).toBe(false);

        return HttpResponse.json({ list: [], total: 0, page: 1, limit: 20 });
      }),
    );
    const api = createWarehouseDataSource({
      mode: 'http',
      baseUrl: 'https://real-api.example.test',
      mockRuntime: runtime,
    });
    expect(api.invite).toBeUndefined();
    expect(await api.list({ ...params, role: 'Owner' })).toEqual({
      list: [],
      total: 0,
      page: 1,
      limit: 20,
    });
    expect(server.listHandlers()).toEqual([
      expect.anything(),
      warehouseMockFallback,
    ]);
  });

  it('does not enable mock mode in production and keeps HTTP available', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => source()).toThrow('Моковый режим доступен только');
    expect(() => createWarehouseDataSource({ mockRuntime: runtime })).toThrow(
      'Моковый режим доступен только',
    );
    expect(createWarehouseHttpApi('https://api.example.test').mode).toBe(
      'http',
    );
    expect(() => createWarehouseDataSource({ mode: 'mock' })).toThrow();
    expect(requests).toHaveLength(0);
  });
});
