# E2E Test Environment Requirements

## Prerequisites

1. **Redis and PostgreSQL** must be running (e.g. `docker compose up -d` or local installs).

2. **Playwright browsers** — Install Chromium (one-time):
   ```bash
   npx playwright install chromium
   ```

That's it. Playwright auto-starts the game server and client dev server via the `webServer` config.
If you already have them running, Playwright reuses them (`reuseExistingServer`).

## Running Tests

```bash
# From repo root
npm run test:e2e

# Or from packages/e2e
cd packages/e2e
npx playwright test

# Headed mode (see the browser)
npx playwright test --headed

# Debug mode (step through)
npx playwright test --debug
```

## Notes

- Each test player registers a unique account with a timestamped username
- All test players start in `the-reliquary` zone for co-location testing
- The Vite dev server runs on port **3000** and proxies API/WebSocket traffic to port **2567**
- Tests use Chromium only (for now)
