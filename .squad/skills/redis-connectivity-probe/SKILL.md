---
name: "redis-connectivity-probe"
description: "Pre-validate Redis connectivity before constructing clients that don't handle failures"
domain: "resilience"
confidence: "high"
source: "earned: Redis ETIMEDOUT crash fix (2026-03-24)"
---

## Context
Some third-party packages (e.g., `@colyseus/redis-presence`, `@colyseus/redis-driver`) create internal ioredis clients without registering `error` event handlers. When Redis is unreachable, Node.js treats these as unhandled events and crashes the process.

## Pattern: Probe Before Construct

```typescript
import { Redis } from 'ioredis';

async function testRedisConnection(url: string, timeoutMs = 3000) {
  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: timeoutMs,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null,  // fail fast, no retries
  });
  client.on('error', () => {});  // swallow — probe only

  try {
    await client.connect();
    await client.ping();
    return { reachable: true };
  } catch (err) {
    return { reachable: false, error: err.message };
  } finally {
    try { client.disconnect(); } catch {}
  }
}
```

## Key Details
- `lazyConnect: true` — don't connect in constructor, connect explicitly
- `retryStrategy: () => null` — single attempt, no retry loops
- No-op `error` handler — prevents unhandled event crashes during probe
- `finally` block disconnects regardless — no lingering connections
- Short timeout (3s default) — fail fast during startup

## When to Apply
- Any time you pass a Redis URL to a library that doesn't handle connection errors
- Before constructing `RedisPresence`, `RedisDriver`, or similar third-party Redis wrappers
- NOT needed for your own ioredis clients where you control the error handler

## Anti-Patterns
- ❌ `process.on('uncaughtException')` — too broad, hides real bugs
- ❌ Wrapping third-party objects to patch internal clients — fragile, breaks on upgrades
- ❌ Catching only import errors — connection failures happen asynchronously after construction

## Reference Implementation
`packages/server/src/cache/redis-test.ts`
