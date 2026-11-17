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
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  });

  it('preserves abort errors for the caller', async () => {
    const error = new DOMException('Cancelled', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    const client = createHttpClient('https://api.example.test');
    await expect(client.request(client.url('example'))).rejects.toBe(error);
  });
});
