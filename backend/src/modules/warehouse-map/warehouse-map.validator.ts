import type { ObjectChange } from './warehouse-map.schemas.js';

export type MapObjectType = ObjectChange['objectType'];

export interface MapObjectSnapshot {
  id: string;
  objectType: MapObjectType;
  x: number;
  y: number;
}

export interface WarehouseMapState {
  width: number;
  height: number;
  objects: readonly MapObjectSnapshot[];
}

export type OperationFailureReason =
  | 'NOT_FOUND'
  | 'OUT_OF_BOUNDS'
  | 'CELL_OCCUPIED'
  | 'STATION_HAS_ADJACENT_ROBOT';

export interface OperationFailure {
  index: number;
  reason: OperationFailureReason;
  change: ObjectChange;
}

export interface RobotAdjacencyFailure {
  reason: 'ROBOT_NOT_ADJACENT_TO_STATION';
  x: number;
  y: number;
  robotId?: string;
  index?: number;
}

export type ValidationFailure = OperationFailure | RobotAdjacencyFailure;

export type ValidationFailureReason = ValidationFailure['reason'];

export type BatchValidationResult =
  | { valid: true; operations: ObjectChange[] }
  | { valid: false; failure: ValidationFailure };

interface TrackedObject {
  id?: string;
  createdAt?: number;
  objectType: MapObjectType;
  x: number;
  y: number;
}

const cellKey = (x: number, y: number): string => `${String(x)},${String(y)}`;

const hasAdjacentCell = (
  cells: ReadonlySet<string>,
  x: number,
  y: number,
): boolean =>
  cells.has(cellKey(x - 1, y)) ||
  cells.has(cellKey(x + 1, y)) ||
  cells.has(cellKey(x, y - 1)) ||
  cells.has(cellKey(x, y + 1));

export function validateObjectChanges(
  map: WarehouseMapState,
  changes: readonly ObjectChange[],
): BatchValidationResult {
  const objects = new Map<string, TrackedObject>();
  const occupied = new Set<string>();
  const robotCells = new Set<string>();

  for (const { id, objectType, x, y } of map.objects) {
    const key = cellKey(x, y);
    objects.set(id, { id, objectType, x, y });
    occupied.add(key);

    if (objectType === 'robot') {
      robotCells.add(key);
    }
  }

  const isInside = (x: number, y: number): boolean =>
    x >= 0 && x < map.width && y >= 0 && y < map.height;

  const operations: ObjectChange[] = [];

  for (const [index, change] of changes.entries()) {
    const fail = (reason: OperationFailureReason): BatchValidationResult => ({
      valid: false,
      failure: { index, reason, change },
    });

    if (change.type === 'create') {
      if (!isInside(change.x, change.y)) {
        return fail('OUT_OF_BOUNDS');
      }
      const key = cellKey(change.x, change.y);

      if (occupied.has(key)) {
        return fail('CELL_OCCUPIED');
      }
      occupied.add(key);

      if (change.objectType === 'robot') {
        robotCells.add(key);
      }
      objects.set(`created:${String(index)}`, {
        createdAt: index,
        objectType: change.objectType,
        x: change.x,
        y: change.y,
      });
      operations.push(change);
      continue;
    }

    const target = objects.get(change.objectId);

    if (!target || target.objectType !== change.objectType) {
      return fail('NOT_FOUND');
    }

    if (change.type === 'delete') {
      // Checked against the batch state so far: another adjacent station does
      // not lift the restriction, but deleting the robot first does.
      if (
        target.objectType === 'station' &&
        hasAdjacentCell(robotCells, target.x, target.y)
      ) {
        return fail('STATION_HAS_ADJACENT_ROBOT');
      }
      const key = cellKey(target.x, target.y);
      objects.delete(change.objectId);
      occupied.delete(key);

      if (target.objectType === 'robot') {
        robotCells.delete(key);
      }
      operations.push(change);
      continue;
    }

    if (!isInside(change.x, change.y)) {
      return fail('OUT_OF_BOUNDS');
    }

    if (change.x === target.x && change.y === target.y) {
      continue;
    }
    const key = cellKey(change.x, change.y);

    if (occupied.has(key)) {
      return fail('CELL_OCCUPIED');
    }
    occupied.delete(cellKey(target.x, target.y));
    occupied.add(key);
    target.x = change.x;
    target.y = change.y;
    operations.push(change);
  }

  const stations = new Set<string>();

  for (const { objectType, x, y } of objects.values()) {
    if (objectType === 'station') {
      stations.add(cellKey(x, y));
    }
  }

  for (const { id, createdAt, objectType, x, y } of objects.values()) {
    if (objectType === 'robot' && !hasAdjacentCell(stations, x, y)) {
      return {
        valid: false,
        failure: {
          reason: 'ROBOT_NOT_ADJACENT_TO_STATION',
          x,
          y,
          ...(id !== undefined && { robotId: id }),
          ...(createdAt !== undefined && { index: createdAt }),
        },
      };
    }
  }

  return { valid: true, operations };
}
