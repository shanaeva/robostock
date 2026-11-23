import { setupWorker } from 'msw/browser';
import { loadWarehouseMockHandlers } from '@/entities/warehouse';

async function startWorker() {
  const handlers = await loadWarehouseMockHandlers();

  return setupWorker(...handlers).start({
    quiet: true,
    onUnhandledRequest: 'bypass',
  });
}

let starting: ReturnType<typeof startWorker> | undefined;

export function startMockWorker() {
  return (starting ??= startWorker());
}
