const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

let cached: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cached) {
    return cached;
  }

  const res = await fetch(`${API}/auth/csrf`, { credentials: 'include' });

  if (!res.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const data = (await res.json()) as { csrfToken: string };

  cached = data.csrfToken;

  return cached;
}

export function invalidateCsrf(): void {
  cached = null;
}
