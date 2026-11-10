import { describe, expect, it } from 'vitest';
import { environmentSchema } from './environment.js';

const databaseUrl =
  'postgresql://starter:local_password@127.0.0.1:5432/starter';

describe('environmentSchema', () => {
  it('provides defaults and accepts unrelated process variables', () => {
    expect(
      environmentSchema.parse({ DATABASE_URL: databaseUrl, PATH: '/usr/bin' }),
    ).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: databaseUrl,
    });
  });

  it('coerces a valid port to a number', () => {
    expect(
      environmentSchema.parse({ DATABASE_URL: databaseUrl, PORT: '4000' }).PORT,
    ).toBe(4000);
  });

  it.each(['', '0', '-1', '65536', '3.5', 'invalid'])(
    'rejects invalid PORT %j',
    (port) => {
      expect(
        environmentSchema.safeParse({ DATABASE_URL: databaseUrl, PORT: port })
          .success,
      ).toBe(false);
    },
  );

  it('rejects a missing database URL', () => {
    expect(environmentSchema.safeParse({}).success).toBe(false);
  });

  it.each([
    '',
    'invalid',
    'https://example.com/database',
    'postgresql://localhost',
    'postgresql:///starter',
  ])('rejects invalid DATABASE_URL %j', (url) => {
    expect(environmentSchema.safeParse({ DATABASE_URL: url }).success).toBe(
      false,
    );
  });

  it('rejects an unknown environment', () => {
    expect(
      environmentSchema.safeParse({
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'staging',
      }).success,
    ).toBe(false);
  });

  it('does not include the database credentials in validation messages', () => {
    const result = environmentSchema.safeParse({
      DATABASE_URL: 'https://starter:secret_password@localhost/starter',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues
        .map((issue) => issue.message)
        .join(' ');
      expect(messages).toContain('DATABASE_URL');
      expect(messages).not.toContain('secret_password');
    }
  });
});
