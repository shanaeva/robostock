import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateWarehouseInput,
  ListWarehousesQuery,
  UpdateWarehouseInput,
} from './warehouses.schemas.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma, Warehouse } from '../../generated/prisma/client.js';

const NOT_FOUND = 'Склад не найден.';

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
    const created = await this.prisma.warehouse.create({
      data: { ownerId, ...input },
      select: { id: true },
    });

    return { warehouseId: created.id };
  }

  async get(ownerId: string, id: string) {
    const warehouse = await this.findOwned(ownerId, id);

    return {
      id: warehouse.id,
      name: warehouse.name,
      width: warehouse.width,
      height: warehouse.height,
      ownerId: warehouse.ownerId,
      robots: [],
      obstacles: [],
      stations: [],
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }

  async rename(ownerId: string, id: string, input: UpdateWarehouseInput) {
    await this.findOwned(ownerId, id);
    await this.prisma.warehouse.update({
      where: { id },
      data: { name: input.name },
    });
  }

  async remove(ownerId: string, id: string) {
    await this.findOwned(ownerId, id);
    await this.prisma.warehouse.delete({ where: { id } });
  }

  private async findOwned(ownerId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, ownerId },
    });

    if (!warehouse) {
      throw new NotFoundException(NOT_FOUND);
    }

    return warehouse;
  }
}
