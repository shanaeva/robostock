import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient, HttpClientConfigurationError } from './http-client';

afterEach(() => vi.unstubAllGlobals());

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

  it('passes credentials, JSON body and cancellation signal to fetch', async () => {
    const response = new Response(null, { status: 204 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const client = createHttpClient('https://api.example.test');
    const url = client.url('example');
    const controller = new AbortController();
    const body = JSON.stringify({ name: 'Example' });

    await expect(
      client.request(url, { method: 'POST', body, signal: controller.signal }),
    ).resolves.toBe(response);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, {
      method: 'POST',
      body,
      signal: controller.signal,
      credentials: 'include',
      cache: 'no-store',
      headers: new Headers({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
    });
  });

  it('preserves authorization and custom headers alongside JSON defaults', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createHttpClient('https://api.example.test');

    await client.request(client.url('example'), {
      method: 'POST',
      body: JSON.stringify({ name: 'Example' }),
      headers: {
        Authorization: 'Bearer test-token',
        'X-Request-ID': 'request-1',
      },
    });

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
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
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = createHttpClient('https://api.example.test');

      await client.request(client.url('example'), {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Example' }),
        headers: makeHeaders(),
      });

      const headers = new Headers(fetchMock.mock.calls[0][1].headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Accept')).toBe('application/problem+json');
      expect(headers.get('Content-Type')).toBe('application/merge-patch+json');
    },
  );

  it('adds Accept without Content-Type when no body is provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const client = createHttpClient('https://api.example.test');

    await client.request(client.url('example'));

    const headers = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.has('Content-Type')).toBe(false);
  });

  it.each([undefined, 'multipart/form-data; boundary=custom'])(
    'preserves FormData and does not generate Content-Type (explicit: %s)',
    async (contentType) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', fetchMock);
      const client = createHttpClient('https://api.example.test');
      const body = new FormData();
      body.append('name', 'Example');

      await client.request(client.url('example'), {
        method: 'POST',
        body,
        headers: contentType ? { 'Content-Type': contentType } : undefined,
      });

      const options = fetchMock.mock.calls[0][1];
      expect(options.body).toBe(body);
      const headers = new Headers(options.headers);
      expect(headers.get('Accept')).toBe('application/json');
      expect(headers.get('Content-Type')).toBe(contentType ?? null);
    },
  );

  it('does not mutate the caller Headers when adding defaults', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const client = createHttpClient('https://api.example.test');
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
    const client = createHttpClient('https://api.example.test');
    await expect(client.request(client.url('example'))).rejects.toBe(error);
  });
});
