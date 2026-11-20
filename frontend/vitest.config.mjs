import { fileURLToPath } from 'node:url';

// Vitest is provided by the backend workspace; see the frontend README.
const config = {
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,mjs}'],
  },
};

export default config;
