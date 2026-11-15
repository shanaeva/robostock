import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Disable during active development — slices are built incrementally.
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
]);
