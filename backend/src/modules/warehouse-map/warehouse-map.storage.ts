import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ObjectChange } from './warehouse-map.schemas.js';
import type {
  WarehouseMapStorage,
  WarehouseMapTransaction,
} from './warehouse-map.service.js';
import type { WarehouseMapState } from './warehouse-map.validator.js';

// 400 sequential statements can exceed Prisma's 5 s default.
const TRANSACTION_OPTIONS = { timeout: 10_000, maxWait: 2_000 } as const;

type MoveObjectChange = Extract<ObjectChange, { type: 'move' }>;

interface WarehouseRow {
  width: number;
  height: number;
}

// P2028: no free connection within maxWait, or the transaction expired.
// 55P03: lock_timeout. Nothing was committed, so the request can be retried.
function isBusyError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code === 'P2028') {
    return true;
  }
  const meta = error.meta as
    { driverAdapterError?: { cause?: { originalCode?: unknown } } } | undefined;

  return meta?.driverAdapterError?.cause?.originalCode === '55P03';
}

class PrismaWarehouseMapTransaction implements WarehouseMapTransaction {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async loadWarehouseMap(
    warehouseId: string,
    ownerId: string,
  ): Promise<WarehouseMapState | null> {
    // Must stay below the pg driver's 5 s query_timeout, which would otherwise
    // abort the wait on the client side with a generic error.
    await this.tx.$executeRaw`SET LOCAL lock_timeout = '3s'`;

    // Every map edit locks the warehouse row first. Cell occupancy spans three
    // tables, which no unique constraint can cover, so edits of one warehouse
    // are serialized here. The default READ COMMITTED isolation is required:
    // statements after the lock must see what the previous holder committed.
    // NO KEY UPDATE still conflicts with DELETE and UPDATE of the warehouse
    // but not with foreign-key checks of other rows. Filtering by owner keeps
    // another user's warehouse from being locked.
    const [warehouse] = await this.tx.$queryRaw<WarehouseRow[]>`
      SELECT width, height
      FROM warehouses
      WHERE id = ${warehouseId}::uuid AND "ownerId" = ${ownerId}::uuid
      FOR NO KEY UPDATE
    `;

    if (!warehouse) {
      return null;
    }
    const where = { warehouseId };
    const select = { id: true, x: true, y: true } as const;
    const [obstacles, stations, robots] = await Promise.all([
      this.tx.obstacle.findMany({ where, select }),
      this.tx.station.findMany({ where, select }),
      this.tx.robot.findMany({ where, select }),
    ]);

    return {
      width: warehouse.width,
      height: warehouse.height,
      objects: [
        ...obstacles.map((o) => ({ ...o, objectType: 'obstacle' as const })),
        ...stations.map((o) => ({ ...o, objectType: 'station' as const })),
        ...robots.map((o) => ({ ...o, objectType: 'robot' as const })),
      ],
    };
  }

  async applyOperations(
    warehouseId: string,
    operations: readonly ObjectChange[],
  ): Promise<void> {
    // Strictly sequential: the validator frees and reuses cells in this order.
    for (const operation of operations) {
      await this.apply(warehouseId, operation);
    }
  }

  async touchWarehouse(warehouseId: string): Promise<void> {
    await this.tx.warehouse.update({
      where: { id: warehouseId },
      data: { updatedAt: new Date() },
    });
  }

  private async apply(
    warehouseId: string,
    operation: ObjectChange,
  ): Promise<void> {
    const { tx } = this;

    if (operation.type === 'create') {
      const { x, y } = operation;

      switch (operation.objectType) {
        case 'obstacle':
          await tx.obstacle.create({ data: { warehouseId, x, y } });
          break;
        case 'station':
          await tx.station.create({
            data: {
              warehouseId,
              x,
              y,
              name: operation.name,
              direction: operation.direction,
            },
          });
          break;
        case 'robot':
          await tx.robot.create({
            data: { warehouseId, x, y, name: operation.name },
          });
          break;
      }

      return;
    }

    // The validator guarantees the object exists in this warehouse, so any
    // other count means the map changed under the lock: abort the batch.
    const where = { id: operation.objectId, warehouseId };
    let count: number;

    if (operation.type === 'delete') {
      ({ count } = await this.deleteOne(operation.objectType, where));
    } else {
      const data = { x: operation.x, y: operation.y };
      ({ count } = await this.moveOne(operation.objectType, where, data));
    }

    if (count !== 1) {
      throw new Error('Map object disappeared during the transaction');
    }
  }

  private deleteOne(
    objectType: ObjectChange['objectType'],
    where: { id: string; warehouseId: string },
  ): Promise<Prisma.BatchPayload> {
    switch (objectType) {
      case 'obstacle':
        return this.tx.obstacle.deleteMany({ where });
      case 'station':
        return this.tx.station.deleteMany({ where });
      case 'robot':
        return this.tx.robot.deleteMany({ where });
    }
  }

  private moveOne(
    objectType: MoveObjectChange['objectType'],
    where: { id: string; warehouseId: string },
    data: { x: number; y: number },
  ): Promise<Prisma.BatchPayload> {
    switch (objectType) {
      case 'obstacle':
        return this.tx.obstacle.updateMany({ where, data });
      case 'station':
        return this.tx.station.updateMany({ where, data });
    }
  }
}

@Injectable()
export class PrismaWarehouseMapStorage implements WarehouseMapStorage {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async runInTransaction<T>(
    work: (transaction: WarehouseMapTransaction) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        (tx) => work(new PrismaWarehouseMapTransaction(tx)),
        TRANSACTION_OPTIONS,
      );
    } catch (error) {
      if (isBusyError(error)) {
        throw new ServiceUnavailableException();
      }

      throw error;
    }
  }
}
