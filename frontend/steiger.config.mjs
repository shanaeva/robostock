import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ['./src/_pages/**'],
    rules: {
      'fsd/typo-in-layer-name': 'off',
    },
  },
  {
    rules: {
      // Single-consumer slices are allowed by our thin-page convention.
      'fsd/insignificant-slice': 'warn',
    },
  },
]);
