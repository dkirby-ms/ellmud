import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    bail: 1,
    pool: 'threads',
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'node_modules/**', 'dist/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
