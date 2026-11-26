import { fileURLToPath } from 'node:url';

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
