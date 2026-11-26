// Cached per origin: auth and entity API clients may target different
// backends (e.g. a real API origin vs. the warehouse mock origin).
const cache = new Map<string, string>();
// Concurrent unsafe requests to one origin share a single /auth/csrf call.
const inFlight = new Map<string, Promise<string>>();

export async function getCsrfToken(origin: string): Promise<string> {
  const cached = cache.get(origin);

  if (cached) {
    return cached;
  }

  const pending = inFlight.get(origin);

  if (pending) {
    return pending;
  }

  const request = (async () => {
    const res = await fetch(`${origin}/auth/csrf`, { credentials: 'include' });

    if (!res.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = (await res.json()) as { csrfToken: string };
    cache.set(origin, data.csrfToken);

    return data.csrfToken;
  })().finally(() => inFlight.delete(origin));

  inFlight.set(origin, request);

  return request;
}

export function invalidateCsrf(origin: string): void {
  cache.delete(origin);
  inFlight.delete(origin);
}
