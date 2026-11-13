import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import type { User } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

function createPrismaMock() {
  return {
    user: {
      create: vi.fn<(args: Prisma.UserCreateArgs) => Promise<User>>(),
      findMany: vi.fn<(args: Prisma.UserFindManyArgs) => Promise<User[]>>(),
      findUnique:
        vi.fn<(args: Prisma.UserFindUniqueArgs) => Promise<User | null>>(),
    },
  };
}

describe('UsersService', () => {
  let testingModule: TestingModule;
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  const user: User = {
    id: 'b8ce249d-8a13-4bd0-8f19-acac66c7464e',
    email: 'test@example.com',
    name: 'Alex',
    createdAt: new Date('2026-11-10T09:00:00.000Z'),
  };
  const publicFields = { id: true, email: true, name: true, createdAt: true };

  beforeEach(async () => {
    prisma = createPrismaMock();
    testingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = testingModule.get(UsersService);
  });

  afterEach(async () => {
    await testingModule.close();
  });

  it('creates a user with the supplied data', async () => {
    prisma.user.create.mockResolvedValue(user);
    const input = { email: user.email, name: user.name };
    await expect(service.create(input)).resolves.toEqual(user);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: input,
      select: publicFields,
    });
  });

  it('turns an email uniqueness violation into a conflict', async () => {
    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Private constraint details', {
        code: 'P2002',
        clientVersion: 'unit-test',
      }),
    );
    await expect(
      service.create({ email: user.email, name: user.name }),
    ).rejects.toThrow(ConflictException);
  });

  it('propagates unexpected database errors to the HTTP error handler', async () => {
    const error = new Error('Database unavailable');
    prisma.user.create.mockRejectedValue(error);
    await expect(
      service.create({ email: user.email, name: user.name }),
    ).rejects.toBe(error);
  });

  it('returns the user list', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    await expect(service.findAll({ limit: 20, offset: 0 })).resolves.toEqual([
      user,
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: publicFields,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      skip: 0,
    });
  });

  it('applies the requested page size and offset', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    await service.findAll({ limit: 5, offset: 10 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5, skip: 10 }),
    );
  });

  it('returns an empty list when no users exist', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await expect(service.findAll({ limit: 20, offset: 0 })).resolves.toEqual(
      [],
    );
  });

  it('finds an existing user', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findOne(user.id)).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
      select: publicFields,
    });
  });

  it('reports a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findOne(user.id)).rejects.toThrow(NotFoundException);
  });
});
