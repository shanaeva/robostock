import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ObjectChange } from './warehouse-map.schemas.js';
import type {
  WarehouseMapRecord,
  WarehouseMapStorage,
  WarehouseMapTransaction,
} from './warehouse-map.service.js';

// 400 sequential statements can exceed Prisma's 5 s default.
const TRANSACTION_OPTIONS = { timeout: 10_000, maxWait: 2_000 } as const;

interface WarehouseRow {
  ownerId: string;
  width: number;
  height: number;
}

class PrismaWarehouseMapTransaction implements WarehouseMapTransaction {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async loadWarehouseMap(
    warehouseId: string,
  ): Promise<WarehouseMapRecord | null> {
    // Every map edit locks the warehouse row first. Cell occupancy spans three
    // tables, which no unique constraint can cover, so edits of one warehouse
    // are serialized here. The default READ COMMITTED isolation is required:
    // statements after the lock must see what the previous holder committed.
    // NO KEY UPDATE still conflicts with DELETE and UPDATE of the warehouse
    // but not with foreign-key checks of other rows.
    const [warehouse] = await this.tx.$queryRaw<WarehouseRow[]>`
      SELECT "ownerId", width, height
      FROM warehouses
      WHERE id = ${warehouseId}::uuid
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
      ownerId: warehouse.ownerId,
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
    objectType: ObjectChange['objectType'],
    where: { id: string; warehouseId: string },
    data: { x: number; y: number },
  ): Promise<Prisma.BatchPayload> {
    switch (objectType) {
      case 'obstacle':
        return this.tx.obstacle.updateMany({ where, data });
      case 'station':
        return this.tx.station.updateMany({ where, data });
      case 'robot':
        return this.tx.robot.updateMany({ where, data });
    }
  }
}

@Injectable()
export class PrismaWarehouseMapStorage implements WarehouseMapStorage {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    work: (transaction: WarehouseMapTransaction) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      (tx) => work(new PrismaWarehouseMapTransaction(tx)),
      TRANSACTION_OPTIONS,
    );
  }
}
