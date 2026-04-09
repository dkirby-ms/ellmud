# Decision: Metrics Test Patterns

**Author:** Minsc (Tester)  
**Date:** 2026-07-18  
**Related:** Issue #360 (Gameplay Metrics)

## Context

Jarlaxle's MetricsService uses a fire-and-forget pattern — public methods return `void` and internally discard the Promise. This requires a specific testing approach.

## Decision

**Testing fire-and-forget methods:** Call the method, then `await new Promise(r => setTimeout(r, 0))` to flush the microtask queue before asserting on mocks. This is encapsulated as `flush()` in the test file.

**Error resilience:** Every `recordX()` method has a dedicated "should not throw when DB insert fails" test. This is the #1 contract for metrics — the game must never break because metrics failed.

**Provider pattern:** Tests cover the no-op fallback (no DB), live service (with DB), and uninitialized state — matching the death-penalty-provider pattern.

## Test File

`packages/server/src/__tests__/metrics-service.test.ts` — 29 tests covering all 4 event types, JSONB serialization, SQL structure, error handling, concurrency, and provider integration.
