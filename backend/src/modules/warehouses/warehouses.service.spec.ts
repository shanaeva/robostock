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

  const runInteractively = () =>
    prisma.$transaction.mockImplementation(
      (work: (tx: typeof prisma) => unknown) => work(prisma),
    );

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

  it.each([
    ['empty', { robots: [], obstacles: [], stations: [] }],
    [
      'persisted',
      {
        robots: [{ id: ownerId, name: 'R', x: 3, y: 5 }],
        obstacles: [{ id: ownerId, x: 0, y: 1 }],
        stations: [{ id: ownerId, name: 'S', x: 3, y: 4, direction: 'north' }],
      },
    ],
  ])('returns details with %s object collections', async (_name, objects) => {
    runInteractively();
    prisma.warehouse.findFirst.mockResolvedValue({ ...warehouse, ...objects });

    await expect(service.get(ownerId, warehouseId)).resolves.toEqual({
      ...warehouse,
      ...objects,
      createdAt: '2026-11-14T09:00:00.000Z',
      updatedAt: '2026-11-14T09:10:00.000Z',
    });
  });

  it('reads the owned warehouse and its map from one snapshot', async () => {
    runInteractively();
    prisma.warehouse.findFirst.mockResolvedValue({
      ...warehouse,
      robots: [],
      obstacles: [],
      stations: [],
    });

    await service.get(ownerId, warehouseId);

    expect(prisma.$transaction).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      { isolationLevel: 'RepeatableRead' },
    );
    const orderBy = [{ createdAt: 'asc' }, { id: 'asc' }];
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith({
      where: { id: warehouseId, ownerId },
      include: {
        robots: { select: { id: true, name: true, x: true, y: true }, orderBy },
        obstacles: { select: { id: true, x: true, y: true }, orderBy },
        stations: {
          select: { id: true, name: true, x: true, y: true, direction: true },
          orderBy,
        },
      },
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
    prisma.warehouse.update.mockResolvedValue(warehouse);

    await service.rename(ownerId, warehouseId, { name: 'Renamed warehouse' });

    expect(prisma.warehouse.update).toHaveBeenCalledWith({
      where: { id: warehouseId, ownerId },
      data: { name: 'Renamed warehouse' },
    });
  });

  it('deletes an owned warehouse', async () => {
    prisma.warehouse.delete.mockResolvedValue(warehouse);

    await service.remove(ownerId, warehouseId);

    expect(prisma.warehouse.delete).toHaveBeenCalledWith({
      where: { id: warehouseId, ownerId },
    });
  });

  it('rejects renaming a warehouse to a duplicate name', async () => {
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
    runInteractively();
    prisma.warehouse.findFirst.mockResolvedValue(null);

    await expect(service.get(ownerId, warehouseId)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.warehouse.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: warehouseId, ownerId } }),
    );
  });

  it('reports a missing or foreign warehouse as not found on rename', async () => {
    prisma.warehouse.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Warehouse record not found', {
        code: 'P2025',
        clientVersion: 'unit-test',
      }),
    );

    await expect(
      service.rename(ownerId, warehouseId, { name: 'Renamed warehouse' }),
    ).rejects.toMatchObject({ status: 404, message: 'Склад не найден.' });
    expect(prisma.warehouse.findFirst).not.toHaveBeenCalled();
  });

  it('reports a missing or foreign warehouse as not found on delete', async () => {
    prisma.warehouse.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Warehouse record not found', {
        code: 'P2025',
        clientVersion: 'unit-test',
      }),
    );

    await expect(service.remove(ownerId, warehouseId)).rejects.toMatchObject({
      status: 404,
      message: 'Склад не найден.',
    });
    expect(prisma.warehouse.findFirst).not.toHaveBeenCalled();
  });
});
