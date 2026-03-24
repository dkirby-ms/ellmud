# Decision: ACA Redis Add-on Service Bind

**Date:** 2026-03-24
**By:** Drizzt (Engine Dev)
**Requested by:** dkirby-ms

## What

Replaced the standalone Redis container deployment (`redis:7-alpine` with TCP ingress) with the Azure Container Apps Redis add-on service. The add-on uses `configuration.service.type: 'redis'` and connects to consumers via `template.serviceBinds` — ACA automatically injects `REDIS_HOST`, `REDIS_PORT`, `REDIS_ENDPOINT`, and `REDIS_PASSWORD` into the bound app's environment.

## Why

- **Simpler networking:** No manual TCP ingress configuration or FQDN wiring. ACA handles internal service discovery.
- **Managed lifecycle:** ACA manages the Redis service lifecycle, health, and connectivity.
- **Follows ACA best practices:** Service binds are the recommended approach for sidecar services in Container Apps.

## Impact

- **Bicep:** `redis.bicep` outputs `redisServiceId` (resource ID) instead of `redisHost` (FQDN). `container-apps.bicep` uses `serviceBinds` instead of manually constructing `REDIS_CONNECTION_STRING`.
- **Server config:** `config.ts` fallback chain: `REDIS_CONNECTION_STRING` → `REDIS_URL` → `REDIS_HOST`+`REDIS_PORT` → `redis://localhost:6379`. Local dev (docker-compose) unaffected — still uses `REDIS_CONNECTION_STRING`.
- **No app code changes needed** beyond config.ts — the rest of the server reads from `getConfig().redis.connectionString` as before.
- **CI/CD:** No pipeline changes needed. The Bicep deployment handles the new resource type transparently.

## Files Changed

- `infra/modules/redis.bicep` — Rewritten (standalone → add-on)
- `infra/main.bicep` — Updated param/output wiring
- `infra/modules/container-apps.bicep` — Service bind + removed manual REDIS_CONNECTION_STRING
- `packages/server/src/config.ts` — Extended fallback chain for ACA-injected env vars

## Verification

All 1447 server tests passing. No regressions.
