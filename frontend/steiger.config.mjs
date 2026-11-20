import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([
  ...fsd.configs.recommended,
  // Next.js App Router directory is not an FSD layer.
  { ignores: ['./src/app/**'] },
  {
    files: ['./src/_pages/**'],
    rules: {
      'fsd/typo-in-layer-name': 'off',
    },
  },
  {
    rules: {
      // Disable during active development — slices are built incrementally.
      'fsd/insignificant-slice': 'off',
    },
  },
]);
