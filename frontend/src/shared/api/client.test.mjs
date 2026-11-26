import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  authorizedFetch,
  createHttpClient,
  HttpClientConfigurationError,
} from './client';
import { getCsrfToken, invalidateCsrf } from './csrf';

const ORIGIN = 'https://api.example.test';
const CSRF_TOKEN = 'test-csrf-token';

afterEach(() => {
  vi.unstubAllGlobals();
  invalidateCsrf(ORIGIN);
});

// Stubs fetch so any /auth/csrf request resolves with a token, and every
// other request resolves with `mainResponse`. Returns the mock so callers
// can inspect the main request specifically (always the last call).
function stubFetch(mainResponse) {
  const fetchMock = vi.fn((input) => {
    const href = input instanceof Request ? input.url : String(input);

    if (href.endsWith('/auth/csrf')) {
      return Promise.resolve(Response.json({ csrfToken: CSRF_TOKEN }));
    }

    return Promise.resolve(mainResponse);
  });

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

describe('shared HTTP transport', () => {
  it.each(['https://api.example.test/v1', 'https://api.example.test/v1/'])(
    'preserves the API prefix for %s',
    (baseUrl) => {
      expect(createHttpClient(baseUrl).url('warehouses').href).toBe(
        'https://api.example.test/v1/warehouses',
      );
    },
  );

  it.each([
    undefined,
    'not-a-url',
    'ftp://api.example.test',
    'https://user:password@api.example.test',
    'https://api.example.test?token=value',
    'https://api.example.test#fragment',
  ])('rejects an invalid base URL lazily: %s', (baseUrl) => {
    const client = createHttpClient(baseUrl);
    expect(() => client.url('warehouses')).toThrow(
      HttpClientConfigurationError,
    );
  });

  it('fetches a CSRF token before an unsafe request and sends it as a header', async () => {
    const response = new Response(null, { status: 204 });
    const fetchMock = stubFetch(response);
    const client = createHttpClient(ORIGIN);
    const url = client.url('example');
    const controller = new AbortController();
    const body = JSON.stringify({ name: 'Example' });

    await expect(
      client.request(url, { method: 'POST', body, signal: controller.signal }),
    ).resolves.toBe(response);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ORIGIN}/auth/csrf`);

    const [mainUrl, mainInit] = fetchMock.mock.calls[1];
    expect(mainUrl).toBe(url);
    expect(mainInit).toEqual({
      method: 'POST',
      body,
      signal: controller.signal,
      credentials: 'include',
      cache: 'no-store',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-Token': CSRF_TOKEN,
      }),
    });
  });

  it('skips the CSRF header for safe methods', async () => {
    const response = new Response(null, { status: 204 });
    const fetchMock = stubFetch(response);
    const client = createHttpClient(ORIGIN);

    await client.request(client.url('example'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.has('X-CSRF-Token')).toBe(false);
  });

  it('preserves authorization and custom headers alongside JSON defaults', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    const client = createHttpClient(ORIGIN);

    await client.request(client.url('example'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Example' }),
      headers: {
        Authorization: 'Bearer test-token',
        'X-Request-ID': 'request-1',
      },
    });

    const headers = new Headers(fetchMock.mock.calls.at(-1)[1].headers);
    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('X-Request-ID')).toBe('request-1');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it.each([
    [
      'object',
      () => ({
        authorization: 'Bearer test-token',
        accept: 'application/problem+json',
        'content-type': 'application/merge-patch+json',
      }),
    ],
    [
      'Headers',
      () =>
        new Headers({
          authorization: 'Bearer test-token',
          accept: 'application/problem+json',
          'content-type': 'application/merge-patch+json',
        }),
    ],
    [
      'tuples',
      () => [
        ['aUtHoRiZaTiOn', 'Bearer test-token'],
        ['aCcEpT', 'application/problem+json'],
        ['cOnTeNt-TyPe', 'application/merge-patch+json'],
      ],
    ],
  ])(
    'preserves overridden standard headers and authorization from %s',
    async (_format, makeHeaders) => {
      const fetchMock = stubFetch(new Response(null, { status: 204 }));
      const client = createHttpClient(ORIGIN);

      await client.request(client.url('example'), {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Example' }),
        headers: makeHeaders(),
      });

      const headers = new Headers(fetchMock.mock.calls.at(-1)[1].headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Accept')).toBe('application/problem+json');
      expect(headers.get('Content-Type')).toBe('application/merge-patch+json');
    },
  );

  it('adds Accept without Content-Type when no body is provided', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    const client = createHttpClient(ORIGIN);

    await client.request(client.url('example'));

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it.each([undefined, 'multipart/form-data; boundary=custom'])(
    'preserves FormData and does not generate Content-Type (explicit: %s)',
    async (contentType) => {
      const fetchMock = stubFetch(new Response(null, { status: 204 }));
      const client = createHttpClient(ORIGIN);
      const body = new FormData();
      body.append('name', 'Example');

      await client.request(client.url('example'), {
        method: 'POST',
        body,
        headers: contentType ? { 'Content-Type': contentType } : undefined,
      });

      const options = fetchMock.mock.calls.at(-1)[1];
      expect(options.body).toBe(body);
      const headers = new Headers(options.headers);
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe(contentType ?? null);
    },
  );

  it('does not mutate the caller Headers when adding defaults', async () => {
    stubFetch(new Response(null, { status: 204 }));
    const client = createHttpClient(ORIGIN);
    const headers = new Headers({ Authorization: 'Bearer test-token' });

    await client.request(client.url('example'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Example' }),
      headers,
    });

    expect([...headers]).toEqual([['authorization', 'Bearer test-token']]);
  });

  it('preserves abort errors for the caller', async () => {
    const error = new DOMException('Cancelled', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const client = createHttpClient(ORIGIN);
    await expect(client.request(client.url('example'))).rejects.toBe(error);
  });

  it('recovers from a stale CSRF token by refetching and retrying once', async () => {
    const rejected = Response.json(
      {
        code: 'CSRF_REJECTED',
        message: 'Обновите страницу и повторите действие.',
      },
      { status: 403 },
    );
    const success = new Response(null, { status: 204 });
    let csrfCalls = 0;
    const fetchMock = vi.fn((input) => {
      const href = input instanceof Request ? input.url : String(input);

      if (href.endsWith('/auth/csrf')) {
        csrfCalls += 1;

        return Promise.resolve(
          Response.json({ csrfToken: `${CSRF_TOKEN}-${csrfCalls}` }),
        );
      }

      return Promise.resolve(csrfCalls === 1 ? rejected : success);
    });

    vi.stubGlobal('fetch', fetchMock);
    const client = createHttpClient(ORIGIN);

    await expect(
      client.request(client.url('example'), { method: 'POST', body: '{}' }),
    ).resolves.toBe(success);

    // csrf -> rejected main -> csrf (refetched) -> retried main
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(csrfCalls).toBe(2);
    const retryHeaders = new Headers(fetchMock.mock.calls.at(-1)[1].headers);
    expect(retryHeaders.get('X-CSRF-Token')).toBe(`${CSRF_TOKEN}-2`);
  });

  it('talks directly to the mock origin, bypassing CSRF and session refresh', async () => {
    const response = new Response(null, { status: 204 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const mockOrigin = 'https://warehouse-mocks.invalid';
    const client = createHttpClient(mockOrigin);

    await client.request(client.url('warehouses'), {
      method: 'POST',
      body: '{}',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.has('X-CSRF-Token')).toBe(false);
  });

  describe('session refresh on 401', () => {
    it.each([true, false])(
      'recovers stale CSRF during automatic refresh (recovery succeeds: %s)',
      async (recoverySucceeds) => {
        let csrfCalls = 0;
        let refreshCalls = 0;
        let refreshed = false;
        const fetchMock = vi.fn(async (input, init = {}) => {
          const href = String(input);

          if (href === `${ORIGIN}/auth/csrf`) {
            csrfCalls += 1;

            return Response.json({ csrfToken: `token-${csrfCalls}` });
          }

          if (href === `${ORIGIN}/auth/refresh`) {
            refreshCalls += 1;
            const token = new Headers(init.headers).get('X-CSRF-Token');

            if (token === 'token-1' || !recoverySucceeds) {
              return Response.json({ code: 'CSRF_REJECTED' }, { status: 403 });
            }

            expect(token).toBe('token-2');
            refreshed = true;

            return Response.json({});
          }

          expect(href).toBe(`${ORIGIN}/auth/me`);

          return Response.json({}, { status: refreshed ? 200 : 401 });
        });
        vi.stubGlobal('fetch', fetchMock);
        // The header remains cached after its corresponding cookie expires.
        await getCsrfToken(ORIGIN);

        const response = await authorizedFetch(`${ORIGIN}/auth/me`);

        expect(response.status).toBe(recoverySucceeds ? 200 : 401);
        expect(csrfCalls).toBe(2);
        expect(refreshCalls).toBe(2);
        expect(fetchMock).toHaveBeenCalledTimes(recoverySucceeds ? 7 : 6);
      },
    );

    function stubSequence(responses) {
      const fetchMock = vi.fn((input) => {
        const href = input instanceof Request ? input.url : String(input);

        if (href.endsWith('/auth/csrf')) {
          return Promise.resolve(Response.json({ csrfToken: CSRF_TOKEN }));
        }

        const next = responses.shift();

        if (!next) {
          throw new Error(`Unexpected fetch: ${href}`);
        }

        return Promise.resolve(next(href));
      });

      vi.stubGlobal('fetch', fetchMock);

      return fetchMock;
    }

    it('retries after another tab already refreshed the session', async () => {
      const unauthorized = new Response(null, { status: 401 });
      const success = new Response(null, { status: 204 });
      const fetchMock = stubSequence([
        (href) => {
          expect(href).toBe(`${ORIGIN}/warehouses`);

          return unauthorized;
        },
        (href) => {
          expect(href).toBe(`${ORIGIN}/auth/me`);

          return new Response(null, { status: 200 });
        },
        (href) => {
          expect(href).toBe(`${ORIGIN}/warehouses`);

          return success;
        },
      ]);

      await expect(authorizedFetch(`${ORIGIN}/warehouses`)).resolves.toBe(
        success,
      );
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('refreshes the access token and retries when /auth/me also fails', async () => {
      const unauthorized = new Response(null, { status: 401 });
      const success = new Response(null, { status: 204 });
      const fetchMock = stubSequence([
        () => unauthorized,
        () => new Response(null, { status: 401 }),
        (href) => {
          expect(href).toBe(`${ORIGIN}/auth/refresh`);

          return new Response(null, { status: 200 });
        },
        () => success,
      ]);

      await expect(authorizedFetch(`${ORIGIN}/warehouses`)).resolves.toBe(
        success,
      );
      // main(401) -> /auth/me(401) -> csrf preflight -> /auth/refresh(200) -> retried main
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('gives up and returns the original 401 when the refresh itself fails', async () => {
      const unauthorized = new Response(null, { status: 401 });
      stubSequence([
        () => unauthorized,
        () => new Response(null, { status: 401 }),
        () => new Response(null, { status: 401 }),
      ]);

      await expect(authorizedFetch(`${ORIGIN}/warehouses`)).resolves.toBe(
        unauthorized,
      );
    });

    it.each([
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
      '/auth/logout-all',
    ])('never retries a 401 on %s itself', async (path) => {
      const unauthorized = new Response(null, { status: 401 });
      const fetchMock = stubSequence([() => unauthorized]);

      await expect(
        authorizedFetch(`${ORIGIN}${path}`, { method: 'POST', body: '{}' }),
      ).resolves.toBe(unauthorized);
      // Only the CSRF preflight plus the single rejected call — no /auth/me probe.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('recognizes auth paths behind an API path prefix', async () => {
      const unauthorized = new Response(null, { status: 401 });
      const fetchMock = stubSequence([() => unauthorized]);

      await expect(
        authorizedFetch(`${ORIGIN}/api/v1/auth/login`, {
          method: 'POST',
          body: '{}',
        }),
      ).resolves.toBe(unauthorized);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('apiFetch base URL', () => {
  async function importApiFetch(baseUrl) {
    vi.resetModules();

    if (baseUrl === undefined) {
      vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);
    } else {
      vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', baseUrl);
    }
    vi.stubEnv('NODE_ENV', 'production');

    return import('./client');
  }

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each(['https://api.example.test', 'https://api.example.test/'])(
    'joins the path without a double slash (base: %s)',
    async (baseUrl) => {
      const { apiFetch } = await importApiFetch(baseUrl);
      const fetchMock = stubFetch(Response.json({ ok: true }));

      await expect(apiFetch('/auth/me')).resolves.toEqual({ ok: true });
      expect(String(fetchMock.mock.calls.at(-1)[0])).toBe(
        'https://api.example.test/auth/me',
      );
    },
  );

  it('reports a configuration error instead of calling the frontend origin', async () => {
    const { apiFetch, HttpClientConfigurationError: ConfigError } =
      await importApiFetch(undefined);
    const fetchMock = stubFetch(Response.json({ ok: true }));

    await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
