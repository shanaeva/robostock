export class HttpClientConfigurationError extends Error {
  constructor(public readonly reason: 'missing-base-url' | 'invalid-base-url') {
    super(reason);
    this.name = 'HttpClientConfigurationError';
  }
}

export function createHttpClient(baseUrl?: string) {
  // Validate on the first request so configuration errors can be shown by the UI.
  function url(relativePath: string) {
    let base: URL;
    try {
      base = new URL(baseUrl?.trim() ?? '');
    } catch {
      throw new HttpClientConfigurationError('missing-base-url');
    }

    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.search ||
      base.hash ||
      base.username ||
      base.password
    ) {
      throw new HttpClientConfigurationError('invalid-base-url');
    }
    base.pathname = base.pathname.replace(/\/?$/, '/');

    return new URL(relativePath, base);
  }

  function request(url: URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers,
    });
  }

  return { url, request };
}
