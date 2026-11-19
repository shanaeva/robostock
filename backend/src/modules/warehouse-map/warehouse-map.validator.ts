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

export type ValidationFailureReason =
  'NOT_FOUND' | 'OUT_OF_BOUNDS' | 'CELL_OCCUPIED';

export interface ValidationFailure {
  index: number;
  reason: ValidationFailureReason;
  change: ObjectChange;
}

export type BatchValidationResult =
  | { valid: true; operations: ObjectChange[] }
  | { valid: false; failure: ValidationFailure };

interface TrackedObject {
  objectType: MapObjectType;
  x: number;
  y: number;
}

const cellKey = (x: number, y: number): string => `${String(x)},${String(y)}`;

export function validateObjectChanges(
  map: WarehouseMapState,
  changes: readonly ObjectChange[],
): BatchValidationResult {
  const objects = new Map<string, TrackedObject>();
  const occupied = new Set<string>();

  for (const { id, objectType, x, y } of map.objects) {
    objects.set(id, { objectType, x, y });
    occupied.add(cellKey(x, y));
  }

  const isInside = (x: number, y: number): boolean =>
    x >= 0 && x < map.width && y >= 0 && y < map.height;

  const operations: ObjectChange[] = [];

  for (const [index, change] of changes.entries()) {
    const fail = (reason: ValidationFailureReason): BatchValidationResult => ({
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
      operations.push(change);
      continue;
    }

    const target = objects.get(change.objectId);

    if (!target || target.objectType !== change.objectType) {
      return fail('NOT_FOUND');
    }

    if (change.type === 'delete') {
      objects.delete(change.objectId);
      occupied.delete(cellKey(target.x, target.y));
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

  return { valid: true, operations };
}
