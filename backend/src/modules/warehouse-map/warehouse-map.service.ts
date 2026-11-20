import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ObjectChange } from './warehouse-map.schemas.js';
import {
  validateObjectChanges,
  type OperationFailureReason,
  type ValidationFailure,
  type WarehouseMapState,
} from './warehouse-map.validator.js';

export interface WarehouseMapRecord extends WarehouseMapState {
  ownerId: string;
}

export interface WarehouseMapTransaction {
  loadWarehouseMap(warehouseId: string): Promise<WarehouseMapRecord | null>;
  applyOperations(
    warehouseId: string,
    operations: readonly ObjectChange[],
  ): Promise<void>;
  touchWarehouse(warehouseId: string): Promise<void>;
}

export interface WarehouseMapStorage {
  runInTransaction<T>(
    work: (transaction: WarehouseMapTransaction) => Promise<T>,
  ): Promise<T>;
}

export const WAREHOUSE_MAP_STORAGE = Symbol('WAREHOUSE_MAP_STORAGE');

const operationFailureMessages: Record<OperationFailureReason, string> = {
  NOT_FOUND: 'Map object not found',
  OUT_OF_BOUNDS: 'Coordinates are outside the map',
  CELL_OCCUPIED: 'Cell is already occupied',
};

function toHttpException(failure: ValidationFailure): Error {
  if (failure.reason === 'ROBOT_NOT_ADJACENT_TO_STATION') {
    const prefix =
      failure.index === undefined ? '' : `Change ${String(failure.index)}: `;

    return new UnprocessableEntityException(
      `${prefix}Robot at (${String(failure.x)}, ${String(failure.y)}) must be adjacent to a station`,
    );
  }

  const message = `Change ${String(failure.index)}: ${operationFailureMessages[failure.reason]}`;

  return failure.reason === 'NOT_FOUND'
    ? new NotFoundException(message)
    : new UnprocessableEntityException(message);
}

@Injectable()
export class WarehouseMapService {
  constructor(
    @Inject(WAREHOUSE_MAP_STORAGE)
    private readonly storage: WarehouseMapStorage,
  ) {}

  applyChanges(
    warehouseId: string,
    userId: string,
    changes: readonly ObjectChange[],
  ): Promise<void> {
    return this.storage.runInTransaction(async (transaction) => {
      const map = await transaction.loadWarehouseMap(warehouseId);

      if (!map) {
        throw new NotFoundException('Warehouse not found');
      }

      if (map.ownerId !== userId) {
        throw new ForbiddenException('Warehouse belongs to another user');
      }

      const result = validateObjectChanges(map, changes);

      if (!result.valid) {
        throw toHttpException(result.failure);
      }

      if (result.operations.length === 0) {
        return;
      }

      await transaction.applyOperations(warehouseId, result.operations);
      await transaction.touchWarehouse(warehouseId);
    });
  }
}
