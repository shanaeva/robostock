const DEFAULT_REDIRECT = '/dashboard';
// A fixed base keeps validation independent of the browser and deployment host.
const REDIRECT_ORIGIN = 'https://redirect.invalid';

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

  try {
    const url = new URL(from, REDIRECT_ORIGIN);

    // URL parsing removes control characters and normalizes dot segments.
    // Reject // in the resulting path too: returning it would make router.push
    // interpret an otherwise same-origin URL as a protocol-relative address.
    if (url.origin !== REDIRECT_ORIGIN || url.pathname.startsWith('//')) {
      return DEFAULT_REDIRECT;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}
