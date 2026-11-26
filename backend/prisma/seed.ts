import 'dotenv/config';
import { randomBytes, scrypt } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

const ADMIN_EMAIL = 'admin1@gmail.com';
const ADMIN_PASSWORD = 'admin1';
const ADMIN_NAME = 'Admin';
const ADMIN_ROLE = 'ADMIN' as const;

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          `scrypt$${String(SCRYPT_OPTIONS.N)}$8$1$${salt}$${key.toString('hex')}`,
        );
      }
    });
  });
}

// Re-running the seed must not clobber a password the admin changed since.
// Pass --reset-admin-password to force it back to ADMIN_PASSWORD explicitly.
const resetPassword = process.argv.includes('--reset-admin-password');

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  if (existing && !resetPassword) {
    console.warn('Admin user already present, password left untouched');

    return;
  }

  // scrypt at N=131072 is deliberately slow, so hash only when it is used.
  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: {
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: ADMIN_ROLE,
      passwordHash,
      verifiedAt: new Date(),
    },
  });
  console.warn(resetPassword ? 'Admin password reset' : 'Admin user seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
