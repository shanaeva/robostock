import type { Request } from 'express';

/**
 * Reads a named cookie from the raw Cookie header without cookie-parser.
 * Returns undefined when the cookie is absent or its value is not a string.
 */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie;

  if (!header) {
    return undefined;
  }
  const prefix = `${name}=`;
  for (const part of header.split(';')) {
    const trimmed = part.trim();

    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }

  return undefined;
}
