import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OWNER_ID, WarehousesController } from './warehouses.controller.js';
import type { WarehousesService } from './warehouses.service.js';

const ID = '11111111-1111-4111-8111-111111111111';

describe('WarehousesController', () => {
  let service: {
    list: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    rename: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let controller: WarehousesController;

  beforeEach(() => {
    service = {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      rename: vi.fn(),
      remove: vi.fn(),
    };
    controller = new WarehousesController(
      service as unknown as WarehousesService,
    );
  });

  it('list: passes ownerId and query, returns the service result', async () => {
    const query = {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
    } as const;
    const result = { list: [], total: 0, page: 1, limit: 20 };
    service.list.mockResolvedValue(result);

    await expect(controller.list(query)).resolves.toBe(result);
    expect(service.list).toHaveBeenCalledWith(OWNER_ID, query);
  });

  it('create: passes ownerId and body, returns warehouseId', async () => {
    const input = { name: 'Test warehouse', width: 20, height: 20 };
    service.create.mockResolvedValue({ warehouseId: ID });

    await expect(controller.create(input)).resolves.toEqual({
      warehouseId: ID,
    });
    expect(service.create).toHaveBeenCalledWith(OWNER_ID, input);
  });

  it('get: passes ownerId and id', async () => {
    const details = { id: ID };
    service.get.mockResolvedValue(details);

    await expect(controller.get(ID)).resolves.toBe(details);
    expect(service.get).toHaveBeenCalledWith(OWNER_ID, ID);
  });

  it('rename: passes ownerId, id and body', async () => {
    service.rename.mockResolvedValue(undefined);

    await controller.rename(ID, { name: 'New name' });
    expect(service.rename).toHaveBeenCalledWith(OWNER_ID, ID, {
      name: 'New name',
    });
  });

  it('remove: passes ownerId and id', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(ID);
    expect(service.remove).toHaveBeenCalledWith(OWNER_ID, ID);
  });

  it('propagates service errors (e.g. 404)', async () => {
    const error = new Error('Warehouse not found.');
    service.get.mockRejectedValue(error);

    await expect(controller.get(ID)).rejects.toBe(error);
  });
});
