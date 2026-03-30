# Known Issues

Documented during Phase 1 QA. Fixed items removed; remaining items are low-to-medium priority.

---

## 🟡 Medium Priority

### 1. ShardRoom.update() tick not directly unit-testable
**Systems:** Rooms, Lifecycle  
**Description:** The `update()` method on `ShardRoom` is private and deeply coupled to Colyseus Room internals. Testing it requires full integration (boot server, connect client, wait for real ticks). This makes targeted tick-logic tests slow and flaky.  
**Impact:** Slow test feedback for lifecycle and tick-related changes.  
**Recommendation:** Extract tick logic into a testable `ShardTickProcessor` class that takes dependencies as constructor args.

### 2. Background enrichment errors are silently swallowed
**Systems:** Narration  
**Description:** In `NarrationService.backgroundEnrich()`, errors from the LLM call are caught and ignored (`.catch(() => {})`). While this is intentional (template is already served), there's no logging or telemetry for background failures.  
**Impact:** Persistent LLM failures go unnoticed in production.  
**Recommendation:** Add a `recordBackgroundEnrichmentFailure()` telemetry counter.

---

## 🟢 Low Priority

### 3. Template prose uses `Math.random()` for combat action flavor
**Systems:** Narration  
**Description:** `pickRandom()` in `templates.ts` uses `Math.random()`, making combat narration templates non-deterministic. This prevents replay-based testing of template output.  
**Impact:** Cannot write deterministic assertions on exact template prose.  
**Recommendation:** Accept a PRNG function as an optional parameter for testing.

### 4. Token TTL is not configurable at runtime
**Systems:** Auth  
**Description:** `TOKEN_TTL_SECONDS` is hardcoded to 86400 (24 hours) in `AuthService.ts`. Changing it requires a code change and redeploy.  
**Impact:** No operational flexibility for token management.  
**Recommendation:** Accept TTL as a constructor parameter with the current default.

---

*Last updated: Phase 2 review — removed 4 fixed issues (loadout persistence, combat movement lock, Azure LLM test, auth rate limiting)*
