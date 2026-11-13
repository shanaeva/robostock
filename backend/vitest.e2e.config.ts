import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup-e2e.ts'],
    fileParallelism: false,
    testTimeout: 10000,
    hookTimeout: 30000,
  },
});
