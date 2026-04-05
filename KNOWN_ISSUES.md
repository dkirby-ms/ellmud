# Known Issues

Documented during Phase 1 QA. Fixed items removed; remaining items are low-to-medium priority.

---

## 🔴 High Priority

### 0. Loadout not persisted to DB on death — equipped gear survives until restart
**Systems:** Loadout, Profile, Death  
**Description:** `LoadoutRepository` is in-memory only (Phase 1). When a player dies, `clearLoadout()` deletes from the in-memory Map, and `savePlayerProfile()` writes `equipment: undefined` to the in-memory `PlayerProfileRepository`. Neither write reaches a durable store. If the server restarts between a death and the next shard entry, the cleared state is lost — but since both repos reset on restart, the practical symptom is the opposite: if the server does *not* restart, the in-memory repos correctly reflect the clear. The real gap is Phase 2: when PostgreSQL-backed repos are introduced, `clearLoadout()` must issue a `DELETE`/`UPDATE` against the `loadouts` table, and `savePlayerProfile()` must null-out the `equipment` column in `player_profiles`, inside the same transaction as the death event. Without this, a crash between the in-memory clear and the DB write would resurrect equipped gear.  
**Impact:** Data integrity risk when migrating to persistent storage in Phase 2.  
**Recommendation:** When implementing `PgLoadoutRepository`, wrap the death-path calls (`clearLoadout` + `savePlayerProfile`) in a single DB transaction. Add an integration test that kills the process after `clearLoadout` and verifies gear is gone on restart.

---

## 🟡 Medium Priority

### 1. ShardRoom.update() tick not directly unit-testable
**Systems:** Rooms, Lifecycle  
**Description:** The `update()` method on `ShardRoom` is private and deeply coupled to Colyseus Room internals. Testing it requires full integration (boot server, connect client, wait for real ticks). This makes targeted tick-logic tests slow and flaky.  
**Impact:** Slow test feedback for lifecycle and tick-related changes.  
**Recommendation:** Extract tick logic into a testable `ShardTickProcessor` class that takes dependencies as constructor args.

### 2. LLM narration wiring complete — enhancement opportunities remain
**Systems:** Narration  
**Description:** The NarrationService and LLM client are now wired into ZoneRoom runtime. When `AZURE_AI_ENDPOINT` and `AZURE_AI_KEY` environment variables are set, the narration pipeline uses Azure AI Foundry GPT-4o-mini for enhanced prose. When not configured, it falls back gracefully to template-only mode. Currently, only entry narrations use the LLM pipeline; room descriptions from `look` commands and combat events still use hardcoded templates. The infrastructure is in place for full integration.  
**Impact:** LLM narration is available but not yet used for all narration types.  
**Recommendation:** Extend `generateNarration()` usage to room descriptions (from `look` command), combat actions, and movement events. This requires building richer NarrationContext objects with full game state at each call site.

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
