import { describe, expect, it } from 'vitest';
import { getTestAdminUrl } from './global-setup.js';

describe('test database configuration', () => {
  it('accepts the local maintenance database', () => {
    expect(
      getTestAdminUrl('postgresql://starter:password@127.0.0.1:5433/postgres')
        .pathname,
    ).toBe('/postgres');
  });

  it.each([
    undefined,
    'invalid',
    'postgresql://starter:private_password@127.0.0.1:5433/starter',
    'postgresql://starter:private_password@example.com/postgres',
    'postgresql://starter:private_password@localhost/postgres?host=example.com',
    'https://starter:private_password@localhost/postgres',
  ])(
    'rejects an unsafe configuration without exposing credentials (%#)',
    (value) => {
      expect(() => getTestAdminUrl(value)).toThrow('TEST_DATABASE_ADMIN_URL');
      try {
        getTestAdminUrl(value);
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).not.toContain('private_password');
        }
      }
    },
  );
});
