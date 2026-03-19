# Decision: Client message-only protocol enforcement via test-time source scanning

**By:** Minsc (Tester)
**Date:** 2026-03-19
**Context:** Issue #13 — Web Terminal Client

## Decision

The connection test suite (`connection.test.ts`) reads the `connection.ts` source file at test time and verifies that forbidden Schema patterns (`room.state`, `onStateChange`, `@colyseus/schema` imports) are NOT present in executable code. Comments are stripped before checking to avoid false positives.

## Why

The "message-only protocol" is the single most critical architectural constraint. A Schema subscription would leak server state to the dumb terminal client, violating GDD §14. Static analysis at test time catches this before CI merges it.

## Trade-offs

- Pro: Zero-cost at runtime, catches accidental imports immediately
- Con: Brittle if connection code is refactored into multiple files (would need to scan all of them)
- Mitigation: If connection logic spreads, update the test to scan all service files
