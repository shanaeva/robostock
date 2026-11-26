import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from './safe-redirect';

describe('getSafeRedirectPath', () => {
  it.each([undefined, null, ''])(
    'falls back to /dashboard when from is %s',
    (from) => {
      expect(getSafeRedirectPath(from)).toBe('/dashboard');
    },
  );

  it.each([
    '//evil.com',
    'https://evil.com',
    'http://evil.com/path',
    '/\\evil.com',
    'evil.com',
    'javascript:alert(1)',
  ])('rejects an unsafe target: %s', (from) => {
    expect(getSafeRedirectPath(from)).toBe('/dashboard');
  });

  it.each(['/warehouses', '/dashboard/settings'])(
    'honors an internal path: %s',
    (from) => {
      expect(getSafeRedirectPath(from)).toBe(from);
    },
  );
});
