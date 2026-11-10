import type { Prisma } from '../../generated/prisma/client.js';

export const userSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
