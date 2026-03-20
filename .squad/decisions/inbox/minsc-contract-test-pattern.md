# Decision: Repository Contract Test Pattern

**By:** Minsc (Tester)
**Date:** 2026-03-20
**Context:** Persistence layer tests for Issue #3

## What

Repository tests are written as **contract test functions** that accept a factory:
```typescript
function stashRepositoryContractTests(createRepo: () => StashRepository) { ... }
```

Currently invoked with `() => new InMemoryStashRepository()`. When Drizzt builds the PG implementation, add a second `describe` block with `() => new PgStashRepository(pool)` — same 39+ assertions, different backend.

## Why

- Guarantees behavioral equivalence between in-memory and PostgreSQL implementations
- Catches subtle differences (e.g., PG's `quantity > 0` CHECK vs in-memory allowing 0)
- No test duplication — one source of truth for expected behavior

## Impact

- Drizzt: When implementing `PgPlayerRepository` and `PgStashRepository`, add a describe block that runs the existing contract tests against the PG implementation
- Test files: `packages/server/src/__tests__/persistence-player-repository.test.ts`, `persistence-stash-repository.test.ts`
