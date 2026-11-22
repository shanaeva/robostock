import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import { WarehousesService } from './warehouses.service.js';

const ownerId = '22222222-2222-4222-8222-222222222222';
const warehouseId = '11111111-1111-4111-8111-111111111111';
const warehouse = {
  id: warehouseId,
  ownerId,
  name: 'Main warehouse',
  width: 20,
  height: 10,
  createdAt: new Date('2026-11-14T09:00:00.000Z'),
  updatedAt: new Date('2026-11-14T09:10:00.000Z'),
};

function createPrismaMock() {
  return {
    $transaction: vi.fn(),
    warehouse: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('WarehousesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: WarehousesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new WarehousesService(prisma as never);
  });

  it('returns a paginated, sorted list for the owner', async () => {
    const list = [
      {
        id: warehouse.id,
        name: warehouse.name,
        width: warehouse.width,
        height: warehouse.height,
      },
    ];
    prisma.warehouse.findMany.mockResolvedValue(list);
    prisma.warehouse.count.mockResolvedValue(1);
    prisma.$transaction.mockResolvedValue([list, 1]);

    await expect(
      service.list(ownerId, {
        page: 2,
        limit: 5,
        search: 'main',
        sortBy: 'width',
        sortOrder: 'desc',
      }),
    ).resolves.toEqual({ list, total: 1, page: 2, limit: 5 });

    expect(prisma.warehouse.findMany).toHaveBeenCalledWith({
      where: {
        ownerId,
        name: { contains: 'main', mode: 'insensitive' },
      },
      orderBy: [{ width: 'desc' }, { id: 'asc' }],
      skip: 5,
      take: 5,
      select: { id: true, name: true, width: true, height: true },
    });
    expect(prisma.warehouse.count).toHaveBeenCalledWith({
      where: {
        ownerId,
        name: { contains: 'main', mode: 'insensitive' },
      },
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('lists only the owner warehouses when search is omitted', async () => {
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.list(ownerId, {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId }, skip: 0, take: 20 }),
    );
    expect(prisma.warehouse.count).toHaveBeenCalledWith({
      where: { ownerId },
    });
  });

  it('creates a warehouse for the owner and returns its id', async () => {
    prisma.warehouse.create.mockResolvedValue({ id: warehouseId });
    const input = { name: warehouse.name, width: 20, height: 10 };

    await expect(service.create(ownerId, input)).resolves.toEqual({
      warehouseId,
    });
    expect(prisma.warehouse.create).toHaveBeenCalledWith({
      data: { ownerId, ...input },
      select: { id: true },
    });
  });

  it('returns warehouse details with empty object collections', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);

    await expect(service.get(ownerId, warehouseId)).resolves.toEqual({
      ...warehouse,
      robots: [],
      obstacles: [],
      stations: [],
      createdAt: '2026-11-14T09:00:00.000Z',
      updatedAt: '2026-11-14T09:10:00.000Z',
    });
  });

  it('rejects creating a warehouse with a duplicate name', async () => {
    prisma.warehouse.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate warehouse name', {
        code: 'P2002',
        clientVersion: 'unit-test',
      }),
    );

    await expect(
      service.create(ownerId, { name: warehouse.name, width: 20, height: 10 }),
    ).rejects.toThrow(ConflictException);
  });

  it('renames an owned warehouse', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);
    prisma.warehouse.update.mockResolvedValue(warehouse);

    await service.rename(ownerId, warehouseId, { name: 'Renamed warehouse' });

    expect(prisma.warehouse.update).toHaveBeenCalledWith({
      where: { id: warehouseId },
      data: { name: 'Renamed warehouse' },
    });
  });

  it('deletes an owned warehouse', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);
    prisma.warehouse.delete.mockResolvedValue(warehouse);

    await service.remove(ownerId, warehouseId);

    expect(prisma.warehouse.delete).toHaveBeenCalledWith({
      where: { id: warehouseId },
    });
  });

  it('rejects renaming a warehouse to a duplicate name', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(warehouse);
    prisma.warehouse.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate warehouse name', {
        code: 'P2002',
        clientVersion: 'unit-test',
      }),
    );

    await expect(
      service.rename(ownerId, warehouseId, { name: 'Another warehouse' }),
    ).rejects.toThrow(ConflictException);
  });

  it('reports a missing or foreign warehouse as not found', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.get(ownerId, warehouseId)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: warehouseId, ownerId },
    });
  });

  it('does not rename a missing or foreign warehouse', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(
      service.rename(ownerId, warehouseId, { name: 'Renamed warehouse' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.warehouse.update).not.toHaveBeenCalled();
  });

  it('does not delete a missing or foreign warehouse', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.remove(ownerId, warehouseId)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.warehouse.delete).not.toHaveBeenCalled();
  });
});
