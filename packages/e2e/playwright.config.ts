import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Ellmud E2E tests.
 *
 * The webServer block auto-starts the game server and client.
 * Prerequisites: Redis + Postgres must already be running.
 *
 * If servers are already running, Playwright reuses them (reuseExistingServer).
 */
export default defineConfig({
  testDir: './tests',
  // Multiplayer tests share a room — run serially to avoid conflicts
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

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

  webServer: [
    {
      command: 'ALLOW_LOCAL_AUTH=true npm run dev:server',
      port: 2567,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      cwd: '../../',
    },
    {
      command: 'VITE_ALLOW_LOCAL_AUTH=true npm run dev:client',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      cwd: '../../',
    },
  ],
});
