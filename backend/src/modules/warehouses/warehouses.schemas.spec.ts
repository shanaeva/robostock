import { describe, expect, it } from 'vitest';
import {
  createWarehouseSchema,
  listWarehousesQuerySchema,
  updateWarehouseSchema,
  warehouseCreatedSchema,
  warehouseDetailsSchema,
  warehouseIdSchema,
  warehousesResponseSchema,
} from './warehouses.schemas.js';

const warehouseId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';

describe('warehouse request schemas', () => {
  it('accepts a warehouse, trims its name and keeps boundary dimensions', () => {
    expect(
      createWarehouseSchema.parse({
        name: ' Main warehouse ',
        width: 1,
        height: 500,
      }),
    ).toEqual({ name: 'Main warehouse', width: 1, height: 500 });
  });

  it.each([
    { name: '', width: 20, height: 10 },
    { name: '   ', width: 20, height: 10 },
    { name: 'x'.repeat(101), width: 20, height: 10 },
    { name: 'Main', width: 0, height: 10 },
    { name: 'Main', width: 501, height: 10 },
    { name: 'Main', width: 1.5, height: 10 },
    { name: 'Main', width: '20', height: 10 },
    { name: 'Main', width: 20, height: 0 },
    { name: 'Main', width: 20, height: 501 },
    { name: 'Main', width: 20, height: 1.5 },
    { name: 'Main', width: 20, height: 10, ownerId },
    { name: 'Main', width: 20 },
    null,
  ])('rejects an invalid warehouse (%#)', (input) => {
    expect(createWarehouseSchema.safeParse(input).success).toBe(false);
  });

  it('accepts only a non-empty trimmed name when renaming', () => {
    expect(updateWarehouseSchema.parse({ name: ' Renamed ' })).toEqual({
      name: 'Renamed',
    });
    expect(updateWarehouseSchema.safeParse({ name: '   ' }).success).toBe(
      false,
    );
    expect(
      updateWarehouseSchema.safeParse({ name: 'Renamed', width: 20 }).success,
    ).toBe(false);
  });

  it('provides list defaults and parses query strings', () => {
    expect(listWarehousesQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(
      listWarehousesQuerySchema.parse({
        page: '2',
        limit: '100',
        search: 'main',
        sortBy: 'width',
        sortOrder: 'desc',
      }),
    ).toEqual({
      page: 2,
      limit: 100,
      search: 'main',
      sortBy: 'width',
      sortOrder: 'desc',
    });
  });

  it.each([
    { page: '0' },
    { page: '1.5' },
    { page: 'invalid' },
    { page: ['1', '2'] },
    { limit: '0' },
    { limit: '101' },
    { limit: '1.5' },
    { limit: 'invalid' },
    { sortBy: 'createdAt' },
    { sortOrder: 'newest' },
    { unknown: 'value' },
  ])('rejects invalid list parameters (%#)', (input) => {
    expect(listWarehousesQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('warehouse response schemas', () => {
  const summary = {
    id: warehouseId,
    name: 'Main warehouse',
    width: 20,
    height: 10,
  };

  it('validates identifiers and list responses', () => {
    expect(warehouseIdSchema.parse(warehouseId)).toBe(warehouseId);
    expect(warehouseIdSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(
      warehousesResponseSchema.parse({
        list: [summary],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ).toEqual({ list: [summary], total: 1, page: 1, limit: 20 });
    expect(warehouseCreatedSchema.parse({ warehouseId })).toEqual({
      warehouseId,
    });
  });

  it('validates warehouse details including nested objects and dates', () => {
    const details = {
      ...summary,
      ownerId,
      robots: [{ id: ownerId, name: 'Robot 1' }],
      obstacles: [{ id: ownerId, x: 0, y: 5 }],
      stations: [
        { id: ownerId, name: 'Station 1', x: 3, y: 4, direction: 'north' },
      ],
      createdAt: '2026-11-14T09:00:00.000Z',
      updatedAt: '2026-11-14T09:10:00.000Z',
    } as const;

    expect(warehouseDetailsSchema.parse(details)).toEqual(details);
    expect(
      warehouseDetailsSchema.safeParse({ ...details, updatedAt: 'invalid' })
        .success,
    ).toBe(false);
    expect(
      warehouseDetailsSchema.safeParse({
        ...details,
        stations: [{ ...details.stations[0], direction: 'up' }],
      }).success,
    ).toBe(false);
  });
});
