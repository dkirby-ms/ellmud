import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Ellmud E2E tests.
 *
 * Prerequisites:
 *   - docker compose up -d          (Redis + Postgres)
 *   - ALLOW_LOCAL_AUTH=true npm run dev:server
 *   - VITE_ALLOW_LOCAL_AUTH=true npm run dev:client
 *
 * Or use the webServer config below to auto-start the dev stack.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Generous timeout — WebSocket connections need time to establish
  timeout: 30_000,
  expect: { timeout: 10_000 },

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Optional: auto-start the dev stack before running tests.
  // Uncomment when you want Playwright to manage the dev servers.
  // webServer: [
  //   {
  //     command: 'ALLOW_LOCAL_AUTH=true npm run dev:server',
  //     port: 2567,
  //     reuseExistingServer: !process.env.CI,
  //     cwd: '../../',
  //   },
  //   {
  //     command: 'VITE_ALLOW_LOCAL_AUTH=true npm run dev:client',
  //     port: 3000,
  //     reuseExistingServer: !process.env.CI,
  //     cwd: '../../',
  //   },
  // ],
});
