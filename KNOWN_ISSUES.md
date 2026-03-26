# Known Issues — Phase 1 QA (Issue #19)

Documented during Phase 1 testing. Items here are candidates for Phase 2 triage.

---

## 🔴 High Priority

### 0. Loadout not persisted to DB on death — equipped gear survives until restart
**Systems:** Loadout, Profile, Death  
**Description:** `LoadoutRepository` is in-memory only (Phase 1). When a player dies, `clearLoadout()` deletes from the in-memory Map, and `savePlayerProfile()` writes `equipment: undefined` to the in-memory `PlayerProfileRepository`. Neither write reaches a durable store. If the server restarts between a death and the next shard entry, the cleared state is lost — but since both repos reset on restart, the practical symptom is the opposite: if the server does *not* restart, the in-memory repos correctly reflect the clear. The real gap is Phase 2: when PostgreSQL-backed repos are introduced, `clearLoadout()` must issue a `DELETE`/`UPDATE` against the `loadouts` table, and `savePlayerProfile()` must null-out the `equipment` column in `player_profiles`, inside the same transaction as the death event. Without this, a crash between the in-memory clear and the DB write would resurrect equipped gear.  
**Impact:** Data integrity risk when migrating to persistent storage in Phase 2.  
**Recommendation:** When implementing `PgLoadoutRepository`, wrap the death-path calls (`clearLoadout` + `savePlayerProfile`) in a single DB transaction. Add an integration test that kills the process after `clearLoadout` and verifies gear is gone on restart.

---

## 🟡 Medium Priority

### 1. No combat-blocks-movement enforcement
**Systems:** Combat, Movement  
**Description:** Players in active combat can still use `go` to move to another room without fleeing first. The `flee` action exists for this purpose, but `go north` is not blocked by combat state. Only extraction channels enforce command locking.  
**Impact:** Players can bypass flee mechanics and move freely during combat.  
**Recommendation:** Add a combat command lock in `handleCommand()` similar to the extraction lock, blocking `go` while `combatSystem.isInCombat(playerId)` is true.

### 2. Azure LLM transport has no integration test coverage
**Systems:** Narration  
**Description:** `createAzureTransport()` in `llm-client.ts` is exported but never tested. All narration tests use mock transports. A live-service integration test (even against a test deployment) would catch HTTP header, URL construction, or response parsing bugs.  
**Impact:** Transport bugs won't be caught until deployment.  
**Recommendation:** Add an optional integration test gated behind an environment variable (`AZURE_AI_TEST=true`).

### 3. ShardRoom.update() tick not directly unit-testable
**Systems:** Rooms, Lifecycle  
**Description:** The `update()` method on `ShardRoom` is private and deeply coupled to Colyseus Room internals. Testing it requires full integration (boot server, connect client, wait for real ticks). This makes targeted tick-logic tests slow and flaky.  
**Impact:** Slow test feedback for lifecycle and tick-related changes.  
**Recommendation:** Extract tick logic into a testable `ShardTickProcessor` class that takes dependencies as constructor args.

### 4. Background enrichment errors are silently swallowed
**Systems:** Narration  
**Description:** In `NarrationService.backgroundEnrich()`, errors from the LLM call are caught and ignored (`.catch(() => {})`). While this is intentional (template is already served), there's no logging or telemetry for background failures.  
**Impact:** Persistent LLM failures go unnoticed in production.  
**Recommendation:** Add a `recordBackgroundEnrichmentFailure()` telemetry counter.

---

## 🟢 Low Priority

### 5. Template prose uses `Math.random()` for combat action flavor
**Systems:** Narration  
**Description:** `pickRandom()` in `templates.ts` uses `Math.random()`, making combat narration templates non-deterministic. This prevents replay-based testing of template output.  
**Impact:** Cannot write deterministic assertions on exact template prose.  
**Recommendation:** Accept a PRNG function as an optional parameter for testing.

### 6. No rate limiting on auth endpoints
**Systems:** Auth  
**Description:** `/auth/register` and `/auth/login` have no rate limiting. A brute-force attack could enumerate passwords or spam registrations.  
**Impact:** Security vulnerability in production.  
**Recommendation:** Add rate limiting middleware (e.g., `express-rate-limit`) before Phase 2 deployment.

### 7. Token TTL is not configurable at runtime
**Systems:** Auth  
**Description:** `TOKEN_TTL_SECONDS` is hardcoded to 86400 (24 hours) in `AuthService.ts`. Changing it requires a code change and redeploy.  
**Impact:** No operational flexibility for token management.  
**Recommendation:** Accept TTL as a constructor parameter with the current default.

---

*Last updated: Phase 1 QA pass (Issue #19)*
