import { getCsrfToken, invalidateCsrf } from './csrf';
import { mockApiOrigin } from './mock-origin';

// The frontend dev server owns port 3000, the backend 3001 — so an unset
// NEXT_PUBLIC_API_BASE_URL must never resolve to the frontend's own origin.
// In development it falls back to the default backend port; anywhere else a
// missing value is a configuration error surfaced on the first request.
const DEV_API_FALLBACK = 'http://localhost:3001';

export const API =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === 'development' ? DEV_API_FALLBACK : '');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const NO_REFRESH_PATHS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/logout',
  '/auth/logout-all',
];

// Matches even when the API lives under a path prefix (https://host/api/...).
function isNoRefreshPath(pathname: string): boolean {
  return NO_REFRESH_PATHS.some(
    (path) => pathname === path || pathname.endsWith(path),
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as { message?: string; code?: string };

    return new ApiError(res.status, body.message ?? res.statusText, body.code);
  } catch {
    return new ApiError(res.status, res.statusText);
  }
}

function toURL(input: string | URL): URL {
  return input instanceof URL ? input : new URL(input);
}

async function rawFetch(
  input: string | URL,
  init: RequestInit,
  withCsrf: boolean,
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (withCsrf) {
    headers.set('X-CSRF-Token', await getCsrfToken(toURL(input).origin));
  }

  return fetch(input, { ...init, credentials: 'include', headers });
}

// One in-flight refresh per origin deduplicates concurrent calls within one tab.
const refreshing = new Map<string, Promise<boolean>>();

async function tryRefresh(origin: string): Promise<boolean> {
  const doRefresh = async (): Promise<boolean> => {
    // Re-check /auth/me first: another tab may have already refreshed the cookies.
    const meRes = await fetch(`${origin}/auth/me`, { credentials: 'include' });

    if (meRes.ok) {
      invalidateCsrf(origin);

      return true;
    }

    const refreshRes = await rawFetch(
      `${origin}/auth/refresh`,
      { method: 'POST' },
      true,
    );

    if (refreshRes.ok) {
      invalidateCsrf(origin);

      return true;
    }

    return false;
  };

  // Web Locks serializes across tabs in the same browser; falls back to
  // the in-flight promise within one tab when the API is unavailable (SSR,
  // older browsers).
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(`auth-refresh:${origin}`, doRefresh);
  }

  return doRefresh();
}

async function isCsrfRejected(res: Response): Promise<boolean> {
  try {
    const body = (await res.clone().json()) as { code?: string };

    return body.code === 'CSRF_REJECTED';
  } catch {
    return false;
  }
}

// Shared by the auth client and entity API clients: attaches the CSRF header
// to unsafe methods and retries once through a session refresh on 401.
export async function authorizedFetch(
  input: string | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = !SAFE_METHODS.has(method);

  let res = await rawFetch(input, init, needsCsrf);

  const { origin, pathname } = toURL(input);

  // A stale csrf_token cookie (expired or rotated in another tab) makes the
  // cached header value stale too — including on /auth/login and /auth/refresh,
  // which NO_REFRESH_PATHS below otherwise never retries. Refetch and retry once.
  if (needsCsrf && res.status === 403 && (await isCsrfRejected(res))) {
    invalidateCsrf(origin);
    res = await rawFetch(input, init, needsCsrf);
  }

  if (res.status === 401 && !isNoRefreshPath(pathname)) {
    let refresh = refreshing.get(origin);

    if (!refresh) {
      refresh = tryRefresh(origin).finally(() => refreshing.delete(origin));
      refreshing.set(origin, refresh);
    }

    if (await refresh) {
      res = await rawFetch(input, init, needsCsrf);
    }
  }

  return res;
}

// Trailing slashes are common in .env files (http://localhost:3001/), and
// `${base}/auth/login` would otherwise produce a double slash the backend
// router does not match.
function apiBase(): string {
  const base = API.trim().replace(/\/+$/, '');

  if (!base) {
    throw new HttpClientConfigurationError('missing-base-url');
  }

  return base;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  const res = await authorizedFetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export class HttpClientConfigurationError extends Error {
  constructor(public readonly reason: 'missing-base-url' | 'invalid-base-url') {
    super(reason);
    this.name = 'HttpClientConfigurationError';
  }
}

// A lower-level client for entities with their own response contract and
// error type (e.g. warehouses), built on the same authorizedFetch transport
// as apiFetch above, but returning the raw Response for the caller to parse.
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

    const requestInit: RequestInit = {
      ...init,
      cache: 'no-store',
      headers,
    };

    // Mock mode talks only to MSW handlers — no real session or CSRF server
    // exists behind this origin, so skip the auth-aware transport entirely.
    if (url.origin === mockApiOrigin) {
      return fetch(url, { ...requestInit, credentials: 'include' });
    }

    return authorizedFetch(url, requestInit);
  }

  return { url, request };
}
