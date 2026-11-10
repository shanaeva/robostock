import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import type { TestProject } from 'vitest/node';
import { PrismaClient } from '../src/generated/prisma/client.js';

export function getTestAdminUrl(value: unknown): URL {
  const message =
    'Set TEST_DATABASE_ADMIN_URL in .env.test to a local PostgreSQL URL ending in /postgres.';
  if (typeof value !== 'string') {
    throw new Error(message);
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/postgres' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(message);
  }
  return url;
}

export default async function setup(project: TestProject) {
  config({ path: '.env.test', quiet: true });
  const url = getTestAdminUrl(process.env.TEST_DATABASE_ADMIN_URL);
  const database = `starter_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url.href,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    }),
  });

  // SQL identifiers cannot be parameters. The name is generated here, never read from input.
  const dropDatabase = async () => {
    await admin.$executeRawUnsafe(`DROP DATABASE "${database}" WITH (FORCE)`);
  };

  let created = false;
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
    created = true;
    url.pathname = `/${database}`;
    const result = spawnSync(
      process.execPath,
      [
        fileURLToPath(
          new URL('../node_modules/prisma/build/index.js', import.meta.url),
        ),
        'migrate',
        'deploy',
      ],
      {
        cwd: fileURLToPath(new URL('..', import.meta.url)),
        env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url.href },
        stdio: 'inherit',
        timeout: 30000,
      },
    );
    if (result.error || result.status !== 0) {
      throw new Error('Test database migration failed.');
    }
    project.provide('testDatabaseUrl', url.href);
  } catch {
    try {
      if (created) await dropDatabase();
    } finally {
      await admin.$disconnect();
    }
    throw new Error(
      'Could not prepare the test database. Check PostgreSQL, TEST_DATABASE_ADMIN_URL, CREATEDB permissions, and migration output.',
    );
  }

  return async () => {
    try {
      const connections = await admin.$queryRaw<{ count: number }[]>`
        SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = ${database}
      `;
      await dropDatabase();
      if (connections[0]?.count !== 0) {
        throw new Error(
          'The application did not close all test database connections.',
        );
      }
    } finally {
      await admin.$disconnect();
    }
  };
}
