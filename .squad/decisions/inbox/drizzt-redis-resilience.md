# Decision: Redis Connectivity Pre-Validation

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-03-24  
**Status:** Implemented  

## Context

The uat container was crash-looping because `@colyseus/redis-presence` and `@colyseus/redis-driver` create internal ioredis clients that don't register error handlers. When Redis is unreachable, ioredis emits `error` events that become unhandled exceptions and crash the process.

## Decision

All Redis-dependent components must be **pre-validated** before construction. A shared `testRedisConnection()` probe (in `packages/server/src/cache/redis-test.ts`) tests connectivity with a short-lived, disposable ioredis client before handing the connection string to any library that doesn't handle failures gracefully.

## Pattern

```
probe first → construct on success → fall back on failure
```

This matches the existing `createNarrationCache()` factory (which uses `lazyConnect` + `connect()` + fallback) and extends the resilience guarantee to third-party Colyseus packages.

## Impact

- Server starts gracefully even when Redis is completely unreachable
- Clear log messages indicate fallback to local alternatives
- No new dependencies — uses ioredis which is already in the dependency tree
- All 1444+ tests continue to pass
