# Decision: Admin User Routes — UserStore Abstraction

**Date:** 2026-03-24
**By:** Drizzt (Engine Dev)
**Issue:** #127
**PR:** (pending)

## What

Extracted a `UserStore` interface from the admin user routes (`user-routes.ts`), with two implementations:
- `PgUserStore` — wraps existing PostgreSQL queries (production)
- `InMemoryUserStore` — Map-based in-memory store (CI, dev without DB)

`createUserRouter()` now accepts an optional `UserStore` parameter. When none is provided, it auto-selects based on `DATABASE_URL`:
- Set → `PgUserStore`
- Unset → shared `InMemoryUserStore` singleton

## Why

The admin-users test file (`admin-users.test.ts`) was the only test in the codebase that hit a real PostgreSQL connection without mocking. CI has no PostgreSQL service, so every CRUD endpoint returned HTTP 500 (ECONNREFUSED). This broke the UAT promotion (PR #126).

All other DB-dependent tests (PgPlayerRepository, PgStashRepository, db-migrations) mock `db/index.js`. This fix follows the same repository abstraction pattern used by `StashRepository` and `PlayerRepository`.

## Impact

- `createUserRouter()` signature now accepts optional `UserStore` — backwards-compatible
- Tests pass without PostgreSQL (InMemoryUserStore)
- Production behavior unchanged (PgUserStore selected when DATABASE_URL present)
- The InMemoryUserStore is a module-level singleton so multiple `createTestApp()` calls share state within a test file
