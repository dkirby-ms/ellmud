---
name: "in-memory-repository-pattern"
description: "How to build Phase 1 in-memory repositories with PG-swappable interfaces"
domain: "persistence"
confidence: "high"
source: "earned: auth (#12) + stash (#11) implementations"
---

## Context
Phase 1 uses in-memory Maps for persistence. All repositories follow the same pattern so they can swap to PostgreSQL in Phase 2+ without changing callers.

## Patterns
1. **Define an interface** with async methods (even for in-memory — enables PG migration)
2. **Primary Map** keyed by entity ID for O(1) lookup
3. **Secondary index Maps** for common query patterns (e.g., `usernameIndex`, `playerIndex`)
4. **Return copies** or stripped versions when needed (e.g., strip passwordHash)
5. **Service layer** sits above repo for business logic (weight checks, validation)
6. **Dependency injection** via constructor or init method for testability

## Examples
- `packages/server/src/auth/PlayerRepository.ts` — PlayerRepository interface + InMemoryPlayerRepository
- `packages/server/src/stash/StashRepository.ts` — StashRepository interface + InMemoryStashRepository
- `packages/server/src/auth/TokenStore.ts` — TokenStore interface + InMemoryTokenStore

## Anti-Patterns
- Don't use sync methods — they break when migrating to PG (even if in-memory is sync)
- Don't leak the internal Map — always return copies via `Array.from()` or spread
- Don't put business logic in the repository — that goes in the Service layer
- Don't hardcode repository creation in Room classes — use injection so tests can mock
