import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'threads',
    testTimeout: 15000,
    hookTimeout: 10000,
  },
});
