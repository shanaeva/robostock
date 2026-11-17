import { getCsrfToken, invalidateCsrf } from './csrf';

export const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

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

async function execute(
  path: string,
  init: RequestInit,
  withCsrf: boolean,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');

  if (withCsrf) {
    const token = await getCsrfToken();
    headers.set('X-CSRF-Token', token);
  }

  return fetch(`${API}${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
}

// Single in-flight refresh promise deduplicates concurrent calls within one tab.
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const doRefresh = async (): Promise<boolean> => {
    // Re-check /auth/me first: another tab may have already refreshed the cookies.
    const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' });

    if (meRes.ok) {
      invalidateCsrf();

      return true;
    }

    const refreshRes = await execute('/auth/refresh', { method: 'POST' }, true);

    if (refreshRes.ok) {
      invalidateCsrf();

      return true;
    }

    return false;
  };

  // Web Locks serializes across tabs in the same browser; falls back to
  // the in-flight promise within one tab when the API is unavailable (SSR,
  // older browsers).
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('auth-refresh', doRefresh);
  }

  return doRefresh();
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = !SAFE_METHODS.has(method);

  let res = await execute(path, init, needsCsrf);

  // On 401 try to refresh once, then retry the original request.
  // Skip only endpoints that would cause an infinite loop if retried.
  const noRefresh = ['/auth/refresh', '/auth/login', '/auth/logout', '/auth/logout-all'];
  if (res.status === 401 && !noRefresh.includes(path)) {
    refreshing ??= tryRefresh().finally(() => {
      refreshing = null;
    });

    const refreshed = await refreshing;

    if (refreshed) {
      res = await execute(path, init, needsCsrf);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
