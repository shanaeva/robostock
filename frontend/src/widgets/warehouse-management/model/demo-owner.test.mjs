import { afterEach, describe, expect, it, vi } from 'vitest';
import { isWarehouseDemoOwner } from './demo-owner';

afterEach(() => vi.unstubAllEnvs());

describe('temporary HTTP owner permissions', () => {
  it.each([
    ['development', 'http', 'true', true],
    ['development', 'http', undefined, false],
    ['development', 'http', 'false', false],
    ['development', 'http', 'TRUE', false],
    ['development', 'http', '1', false],
    ['development', 'mock', 'true', false],
    ['production', 'http', 'true', false],
    ['production', 'mock', 'true', false],
    ['test', 'http', 'true', false],
  ])('%s / %s / %s enables owner actions: %s', (env, mode, flag, expected) => {
    vi.stubEnv('NODE_ENV', env);
    vi.stubEnv('NEXT_PUBLIC_WAREHOUSE_DEMO_OWNER', flag);
    expect(isWarehouseDemoOwner(mode)).toBe(expected);
  });
});
