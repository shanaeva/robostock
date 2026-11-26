const DEFAULT_REDIRECT = '/dashboard';

// `from` comes from a query param an attacker could control, so only an
// internal path is honored — anything else (absolute URL, protocol-relative
// `//host`, backslash tricks) falls back to the dashboard.
export function getSafeRedirectPath(from: string | null | undefined): string {
  if (
    !from ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from.includes('\\')
  ) {
    return DEFAULT_REDIRECT;
  }

  return from;
}
