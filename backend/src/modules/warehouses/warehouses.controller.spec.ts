import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarehousesController } from './warehouses.controller.js';
import type { WarehousesService } from './warehouses.service.js';

const ID = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';

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

    await expect(controller.list(ownerId, query)).resolves.toBe(result);
    expect(service.list).toHaveBeenCalledWith(ownerId, query);
  });

  it('create: passes ownerId and body, returns warehouseId', async () => {
    const input = { name: 'Test warehouse', width: 20, height: 20 };
    service.create.mockResolvedValue({ warehouseId: ID });

    await expect(controller.create(ownerId, input)).resolves.toEqual({
      warehouseId: ID,
    });
    expect(service.create).toHaveBeenCalledWith(ownerId, input);
  });

  it('get: passes ownerId and id', async () => {
    const details = { id: ID };
    service.get.mockResolvedValue(details);

    await expect(controller.get(ownerId, ID)).resolves.toBe(details);
    expect(service.get).toHaveBeenCalledWith(ownerId, ID);
  });

  it('rename: passes ownerId, id and body', async () => {
    service.rename.mockResolvedValue(undefined);

    await controller.rename(ownerId, ID, { name: 'New name' });
    expect(service.rename).toHaveBeenCalledWith(ownerId, ID, {
      name: 'New name',
    });
  });

  it('remove: passes ownerId and id', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove(ownerId, ID);
    expect(service.remove).toHaveBeenCalledWith(ownerId, ID);
  });

  it('propagates service errors (e.g. 404)', async () => {
    const error = new Error('Warehouse not found.');
    service.get.mockRejectedValue(error);

    await expect(controller.get(ownerId, ID)).rejects.toBe(error);
  });
});
