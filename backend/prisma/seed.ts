import 'dotenv/config';
import { randomBytes, scrypt } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SCRYPT_OPTIONS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };

function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (err, key) => {
      if (err) reject(err);
      else
        resolve(
          `scrypt$${String(SCRYPT_OPTIONS.N)}$8$1$${salt}$${key.toString('hex')}`,
        );
    });
  });
}

async function main() {
  const passwordHash = await hashPassword('admin1');
  await prisma.user.upsert({
    where: { email: 'admin1@gmail.com' },
    update: {},
    create: {
      email: 'admin1@gmail.com',
      name: 'Admin',
      role: 'ADMIN',
      passwordHash,
      verifiedAt: new Date(),
    },
  });
  console.log('Admin user seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
