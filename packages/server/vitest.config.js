import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        pool: 'threads',
        fileParallelism: false,
        testTimeout: 60000,
        hookTimeout: 60000,
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
//# sourceMappingURL=vitest.config.js.map