import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from './warehouses.schemas.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

const NOT_FOUND = 'Склад не найден.';

const mapObjects = {
  robots: {
    select: { id: true, name: true, x: true, y: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  obstacles: {
    select: { id: true, x: true, y: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  stations: {
    select: { id: true, name: true, x: true, y: true, direction: true },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.WarehouseInclude;

@Injectable()
export class WarehousesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(ownerId: string, query: ListWarehousesQuery) {
    const { search, page, limit, sortBy, sortOrder } = query;

    const where: Prisma.WarehouseWhereInput = {
      ownerId,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.warehouse.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, width: true, height: true },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { list, total, page, limit };
  }

  async create(ownerId: string, input: CreateWarehouseInput) {
    try {
      const created = await this.prisma.warehouse.create({
        data: { ownerId, ...input },
        select: { id: true },
      });

      return { warehouseId: created.id };
    } catch (error) {
      return this.rethrowWriteError(error);
    }
  }

  async get(ownerId: string, id: string) {
    const warehouse = await this.findOwned(ownerId, id);

    return {
      id: warehouse.id,
      name: warehouse.name,
      width: warehouse.width,
      height: warehouse.height,
      ownerId: warehouse.ownerId,
      robots: warehouse.robots,
      obstacles: warehouse.obstacles,
      stations: warehouse.stations,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }

  async rename(ownerId: string, id: string, input: UpdateWarehouseInput) {
    try {
      await this.prisma.warehouse.update({
        where: { id, ownerId },
        data: { name: input.name },
      });
    } catch (error) {
      this.rethrowOwnedWriteError(error);
    }
  }

  async remove(ownerId: string, id: string) {
    try {
      await this.prisma.warehouse.delete({ where: { id, ownerId } });
    } catch (error) {
      this.rethrowOwnedWriteError(error);
    }
  }

  private rethrowOwnedWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(NOT_FOUND);
    }

    return this.rethrowWriteError(error);
  }

  private rethrowWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('У вас уже есть склад с таким именем.');
    }

    throw error;
  }

  private async findOwned(ownerId: string, id: string) {
    // Prisma loads each relation with its own query; a single snapshot keeps
    // a concurrent map edit from being returned half-applied. The transaction
    // must be interactive: an array of one query ignores the isolation level.
    const warehouse = await this.prisma.$transaction(
      (tx) =>
        tx.warehouse.findFirst({
          where: { id, ownerId },
          include: mapObjects,
        }),
      { isolationLevel: 'RepeatableRead' },
    );

    if (!warehouse) {
      throw new NotFoundException(NOT_FOUND);
    }

    return warehouse;
  }
}
