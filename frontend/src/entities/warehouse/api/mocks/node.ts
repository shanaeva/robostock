import type { SetupServerApi } from 'msw/node';
import type { RequestHandler } from 'msw';
import type { WarehouseMockRuntime } from './runtime';
import { createWarehouseHandlers, warehouseMockFallback } from './handlers';

// Node-only entry point. Browser code never imports this module.
export function createWarehouseNodeRuntime(
  server: SetupServerApi,
): WarehouseMockRuntime {
  const handlers = new Map<string, RequestHandler[]>();

  function release(id: string) {
    const removed = new Set<unknown>(handlers.get(id));
    handlers.delete(id);
    // MSW 2.15 remembers a non-empty reset as the new baseline. Keep a harmless
    // mock-only fallback so an empty reset cannot resurrect a disposed session.
    server.resetHandlers(
      ...server
        .listHandlers()
        .filter(
          (handler) =>
            !removed.has(handler) && handler !== warehouseMockFallback,
        ),
      warehouseMockFallback,
    );
  }

  return {
    async activate(session) {
      if (!handlers.has(session.id)) {
        const next = createWarehouseHandlers(session, 0);
        handlers.set(session.id, next);
        server.use(...next);
      }
    },
    release,
    async deactivate() {
      for (const id of [...handlers.keys()]) {
        release(id);
      }
    },
  };
}
