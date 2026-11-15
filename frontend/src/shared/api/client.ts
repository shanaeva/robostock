import { getCsrfToken, invalidateCsrf } from './csrf';

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const needsCsrf = !SAFE_METHODS.has(method);

  let res = await execute(path, init, needsCsrf);

  // On 401 try to refresh once, then retry the original request.
  // Skip for auth endpoints themselves to avoid infinite loops.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const refreshRes = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (refreshRes.ok) {
      // CSRF cookie may have been rotated during refresh.
      invalidateCsrf();
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
