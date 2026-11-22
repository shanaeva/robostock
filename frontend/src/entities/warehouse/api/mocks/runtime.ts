import type { WarehouseMockSession } from './session';

// Platform-specific interception is supplied by the browser or the Node test runner.
export type WarehouseMockRuntime = {
  activate(session: WarehouseMockSession): Promise<void>;
  release(id: string): void;
  deactivate(): Promise<void>;
};
