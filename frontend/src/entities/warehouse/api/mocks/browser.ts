import type { SetupWorker } from 'msw/browser';
import type { RequestHandler } from 'msw';
import type { WarehouseMockRuntime } from './runtime';
import type { WarehouseMockSession } from './session';

type HandlerFactory = typeof import('./handlers').createWarehouseHandlers;
type BrowserState = {
  sessions: Map<string, WarehouseMockSession>;
  handlers: Map<string, RequestHandler[]>;
  worker?: SetupWorker;
  starting?: Promise<SetupWorker>;
  factory?: HandlerFactory;
  fallback?: RequestHandler;
};

// Namespace both the script URL and scope so unrelated service workers are left alone.
const workerUrl = '/mockServiceWorker.js?warehouse-management';
const workerScope = '/warehouses';

function state(): BrowserState {
  const target = globalThis as typeof globalThis & {
    __robostockWarehouseMsw?: BrowserState;
  };

  // The global survives Fast Refresh. Discarded Strict Mode renders do not start MSW.
  return (target.__robostockWarehouseMsw ??= {
    sessions: new Map(),
    handlers: new Map(),
  });
}

function start(current: BrowserState) {
  return (current.starting ??= import('msw/browser').then(
    async ({ setupWorker }) => {
      const worker = setupWorker();
      current.worker = worker;
      await worker.start({
        quiet: true,
        onUnhandledRequest: 'bypass',
        serviceWorker: { url: workerUrl, options: { scope: workerScope } },
      });

      return worker;
    },
  ));
}

const runtime: WarehouseMockRuntime = {
  async activate(session) {
    if (
      typeof window === 'undefined' ||
      process.env.NODE_ENV !== 'development'
    ) {
      throw new Error('Browser MSW is available only in development.');
    }
    const current = state();
    current.sessions.set(session.id, session);
    const [worker, { createWarehouseHandlers, warehouseMockFallback }] =
      await Promise.all([start(current), import('./handlers')]);

    if (current.factory !== createWarehouseHandlers) {
      current.factory = createWarehouseHandlers;
      current.fallback = warehouseMockFallback;
      current.handlers.clear();
    }

    for (const [id, active] of current.sessions) {
      if (!current.handlers.has(id)) {
        current.handlers.set(id, createWarehouseHandlers(active));
      }
    }
    worker.resetHandlers(
      ...[...current.handlers.values()].flat(),
      warehouseMockFallback,
    );
  },
  release(id) {
    if (typeof window === 'undefined') {
      return;
    }
    const current = state();
    current.sessions.delete(id);
    current.handlers.delete(id);

    if (current.fallback) {
      current.worker?.resetHandlers(
        ...[...current.handlers.values()].flat(),
        current.fallback,
      );
    }
  },
  async deactivate() {
    if (typeof window === 'undefined') {
      return;
    }
    const current = state();
    await current.starting?.catch(() => undefined);
    current.worker?.stop();
    current.sessions.clear();
    current.handlers.clear();
    current.worker = undefined;
    current.starting = undefined;
    current.factory = undefined;
    current.fallback = undefined;

    // HTTP must also work when Service Worker APIs are unavailable. Only remove our registration.
    if ('serviceWorker' in navigator) {
      try {
        const url = new URL(workerUrl, window.location.origin).href;
        const scope = new URL(workerScope, window.location.origin).href;
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations
            .filter(
              (registration) =>
                registration.scope === scope &&
                [
                  registration.active,
                  registration.waiting,
                  registration.installing,
                ].some((worker) => worker?.scriptURL === url),
            )
            .map((registration) => registration.unregister()),
        );
      } catch {
        // Our handlers only match the reserved mock origin, never the real API.
      }
    }
  },
};

export function getWarehouseBrowserMockRuntime(): WarehouseMockRuntime {
  return runtime;
}
