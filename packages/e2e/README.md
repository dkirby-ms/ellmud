# E2E Test Environment Requirements

## Prerequisites

1. **Docker services** — Redis and PostgreSQL must be running:
   ```bash
   docker compose up -d
   ```

2. **Game server** — Start with local auth enabled:
   ```bash
   ALLOW_LOCAL_AUTH=true npm run dev:server
   ```

3. **Client dev server** — Start with local auth enabled:
   ```bash
   VITE_ALLOW_LOCAL_AUTH=true npm run dev:client
   ```

4. **Playwright browsers** — Install Chromium (one-time):
   ```bash
   npx playwright install chromium
   ```

## Environment Variables

| Variable | Value | Where |
|---|---|---|
| `ALLOW_LOCAL_AUTH` | `true` | Game server |
| `VITE_ALLOW_LOCAL_AUTH` | `true` | Client dev server |
| `AUTH_REQUIRED` | `true` (default) | Game server |

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
