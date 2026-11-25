import { setupWorker } from 'msw/browser';
import { loadWarehouseMockHandlers } from '@/entities/warehouse';

async function startWorker() {
  const handlers = await loadWarehouseMockHandlers();

  return setupWorker(...handlers).start({
    quiet: true,
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js?warehouse-management',
      options: { scope: '/warehouses' },
    },
  });
}

let starting: ReturnType<typeof startWorker> | undefined;

export function startMockWorker() {
  return (starting ??= startWorker());
}
