# Minsc — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

- **Contract test pattern for repository swapability:** Wrote repository tests as reusable contract functions (`playerRepositoryContractTests`, `stashRepositoryContractTests`) that accept a factory. Same tests run against InMemoryRepo now and will run against PgRepo later — just swap the factory. This ensures the PG implementation satisfies the exact same behavioral contract.
- **Migration SQL parse tests catch schema drift:** Schema validation tests parse SQL with regex to verify constraints, foreign keys, indexes, and cross-migration consistency without needing a running database. Caught migration 006 (stash_capacity) that other teammates added — tests adapted to be tolerant of additional migrations while still validating core schema.
- **player_skills table uses updated_at instead of created_at:** Not all data tables follow the same timestamp pattern. Config/override tables (006_create_stash_capacity) have no timestamps at all. Schema validation tests should check core data tables (001-005) separately from utility tables.

- **Colyseus boot() port assignment bug:** `@colyseus/testing` boot() ignores port parameter for Server instances. Workaround: use `server.listen(0)` for OS auto-assignment, then patch `server.port` from `transport.server.address().port`. Bumped `hookTimeout`/`testTimeout` to 30s. All 344 tests now pass in ~110s.
- **Colyseus testing port conflicts:** `@colyseus/testing` boots a real server on port 2568. Multiple test files with `bootTestServer()` cause `EADDRINUSE` if files run in parallel. Fixed with `fileParallelism: false` in vitest config.
- **Colyseus simulation clock is imprecise in tests:** 1-second tick intervals don't fire at exactly 1s under load. For tests that depend on timer expiration (collapse lifecycle), use polling (`waitUntil`) instead of fixed `wait()` calls.
- **Room auto-dispose on empty:** Colyseus rooms auto-dispose when the last client leaves. Edge-case tests for rapid join/leave must keep an anchor client connected.
- **`@colyseus/sdk` is a peer dependency of `@colyseus/testing`:** Not declared explicitly — must be added to server devDependencies for tests to run.
- **Test structure:** File-level `beforeAll`/`afterAll` for the Colyseus server, with multiple `describe` blocks sharing one server instance. This avoids port conflicts within a file.
- **Test counts (Issue #19):** 42 server tests (6 files), 19 shared tests (1 file), 0 client tests (skeleton config). 61 total passing tests.
- **Client test infrastructure (Issue #13):** jsdom environment required for React component tests. `@testing-library/jest-dom/matchers` must be manually extended via `expect.extend(matchers)` — the `/vitest` entrypoint doesn't auto-register in monorepo setups. Explicit `cleanup()` in `afterEach` is mandatory when using `screen` queries across tests.
- **Message-only protocol enforcement via source scanning:** Connection tests read `connection.ts` source at test time and grep for forbidden patterns (`room.state`, `onStateChange`, `Schema`). Comments are stripped before checking to avoid false positives. This catches accidental Schema usage at CI time.
- **Client test count (Issue #13):** 44 client tests (5 files) — connection protocol, terminal rendering, command input + aliases, auth flow, state reducer.
- **Sequential test port conflicts (full suite):** When running the full test suite with `fileParallelism: false`, multiple test files booting Colyseus servers sequentially cause `EADDRINUSE` on port 2568. The previous server's shutdown may not complete before the next file's `beforeAll` starts. Fixed by passing `port: 0` to `boot(server, 0)` in all server boot locations (`bootTestServer()` helper, plus individual test files: auth.test.ts, commands.test.ts, rooms.test.ts). Port 0 tells the OS to assign any available port, eliminating contention entirely.
- **Test timeouts for slow integration tests:** `shard-lifecycle.test.ts` takes ~48s for 8 tests (real-time tick mechanics). Increased `hookTimeout` and `testTimeout` from 10s/20s to 60s in `packages/server/vitest.config.ts` to prevent spurious timeout failures in `beforeAll` hooks during full suite runs.

---

## Wave 4 Cross-Team Context (2026-03-19T16:32:56Z)

**Completed parallel:**
- ✅ **Drizzt Issue #12:** Username/password auth with bcrypt, JWT tokens (optional by default)
- ✅ **Jarlaxle Issue #6:** Combat system (strike, dodge, flee), 1s tick loop  
- ✅ **Volo Issue #9:** LLM narration pipeline, in-memory cache, Azure AI + fallbacks

**Your Issue #13 — Web Terminal Client — dependencies resolved:**
- Auth (#12): HTTP endpoints for /auth/register, /auth/login ready. Client stores JWT in localStorage, passes token in room join options.
- Combat (#6): Server sends COMBAT_RESULT messages. Your client displays HP bars, action buttons (strike/dodge/flee).
- Narration (#9): Server sends NARRATION messages with enriched text. Your client renders line-by-line.

**Key message types for client:**
- `PLAYER_STATE`: Room state sync (position, inventory, health) — subscribe via `.onMessage('player-state', ...)`
- `NARRATION`: Rich text + telemetry badge (LLM vs template)
- `COMBAT_RESULT`: Combat tick result (damage, HP before/after, combatant states)
- `ROOM_STATE`: Occupants, items on floor (metadata only — no Schema patches)

**Design foundation:**
- Figma design (11 screens) is source of truth for UI. You own implementation.
- Dark fantasy theme (near-black + muted gold + spectral teal) is established.
- Layout: Single-screen split (narrative 70% + sidebar 30%), not separate pages (MUD paradigm).
- Monospace for commands, serif for prose, sans-serif for UI chrome.

**Upcoming Wave 5:**
- Jarlaxle #7: Creature narration arriving in NARRATION messages (creature movement, attacks, death scenes)
- Drizzt #10: Extraction mechanic messages (safe zone timers, extraction attempts, success/death states)
- Coordinate with Drizzt on extraction UI states in your client

---

## Cross-Team Updates (2026-03-19T22:30)

### UAT Deployment Fix — Static Serving Pattern
**Relevant to:** Client screen development
- Drizzt committed static file serving fix (commit 3a45dd0): React client now loads in Azure UAT
- API routes (Auth, WebSocket, Admin) take precedence over SPA catch-all
- All 552 tests passing (no regression)

### Figma Design Tokens Deployed
**Relevant to:** All 10 missing screens in Phase 2
- Jarlaxle completed AuthScreen rebuild (commit bad772a) with Figma palette + typography locked in
- CSS variables now available in `:root` for all new screens
- 4 font families: Cinzel (display), Crimson Text (serif), Inter (UI), JetBrains Mono (mono)
- Color palette: `#0A0B0F` primary bg, `#12131A` panels, `#C9A84C` gold accent, `#E8E0D0` text
- **All new screens must use these tokens** — no hardcoded colors

### Client Screen Audit Complete
**Findings:**
- 10 of 11 screens still missing: Map/Viewport, Character Sheet, Inventory, Equipment, Skills, NPC Dialogue, Combat Log, Settings, Help, Leaderboard
- Design issues (cyan palette, system fonts) fixed by Jarlaxle's work
- Phase 2 can now proceed with clear design baseline and working static serving

## Cross-Team Updates (Wave 2 completion — 2026-03-20T18:38)

### Drizzt Built 147 Tests — Your Contract Pattern Is Proven
**Relevant to:** Persistence layer validation, future repository work
- Drizzt implemented PgPlayerRepository and PgStashRepository (PR #77) with 147 new tests
- Your 125 contract tests are now active: 39 tests validating StashRepository behavioral equivalence, 27 validating PlayerRepository, 59 validating schema
- If all 125 contract tests pass against PG implementations, persistence layer is production-ready
- **For you:** Your contract test pattern is proven infrastructure. Future repositories (skills, factions, run history, item definitions) should reuse this exact pattern: write one contract test suite, run against both InMemory and PG implementations. Zero duplication, guaranteed consistency.

### Jarlaxle's Bicep Refinement Complete — Infrastructure Solid
**Relevant to:** Deployment readiness, Wave 3 merge
- Fixed 4 critical production bugs in Bicep IaC (PR #76)
- Deployment docs updated with correct port mappings and environment setup
- Zero validation errors/warnings
- **For you:** Deployment infrastructure is locked in. When you validate new features, assume Azure Container Apps is correctly configured. No surprises in production deployment.

## Wave 3 Anticipatory Tests (2026-03-20)

### Redis Contract Tests (Issue #2) — 25 tests
- **File:** `packages/server/src/__tests__/wave3-redis-contracts.test.ts`
- **Mock pattern for ioredis:** `vi.mock('ioredis')` with a module-level `MockRedisClient` that the mock constructor returns. Swap `mockRedisInstance` per test in `beforeEach`. This pattern works cleanly because `RedisNarrationCache` creates `new Redis()` internally.
- **Cache factory fallback:** `createNarrationCache()` returns InMemory when `cacheEnabled=false` or when Redis connect fails. Returns RedisNarrationCache when connect succeeds.
- **Graceful degradation:** `RedisNarrationCache.get()` returns null, `.set()` and `.del()` are no-ops when Redis throws — never propagates errors to callers.
- **TTL edge case:** Redis `EX` command needs seconds, not ms. The implementation uses `Math.ceil(ttlMs / 1000)` with minimum 1s. Tests verify ms→seconds conversion, fractional rounding, and the GDD combat (30s) / exploration (5min) TTLs.
- **Key schema:** Default prefix is `narration:` + SHA-256 hash. Custom prefix supported via config.
- **Connection lifecycle:** `connect() → connected=true`, `disconnect() → connected=false`, force disconnect on quit failure via `client.disconnect()`.
- **Interface contract:** `RedisNarrationCache` satisfies `NarrationCache` — get/set parity with `InMemoryNarrationCache`.

### Narration Pipeline Contract Tests (Issue #9) — 54 tests
- **File:** `packages/server/src/__tests__/wave3-narration-contracts.test.ts`
- **GDD §4.5 timeout budgets verified:** combat_action=800ms, combat_round=800ms, room_description=2000ms, movement=2000ms, event=2000ms, hard_limit=3000ms. Tests verify `DEFAULT_NARRATION_CONFIG` values match spec.
- **Template fallback contract:** When LLM exceeds timeout, template prose matches `renderTemplate()` output exactly. All 5 narration types produce non-empty prose.
- **Background enrichment:** After timeout fallback, LLM result writes to cache asynchronously. Background failure is silent — template stays in cache. Tests use 50ms timeout + 500ms hard_limit + 600ms wait to verify.
- **Cache hit path:** Pre-populated cache returns immediately, LLM callCount stays 0. Second call to same context hits cache.
- **Output validation (GDD §4.4):** Tests all 7 SCHEMA_KEYWORDS (hp_pct, shard_stability, awareness_level, light_level, disposition, narration_type, narrative_directives) and all FORBIDDEN_PATTERNS (HP numbers, damage, percentages, XP, gold, level numbers).
- **Telemetry event tracking:** Verified cache_hit, cache_miss, llm_timeout, fallback_used, llm_calls accumulate correctly. Reset clears all.
- **End-to-end pipeline:** 4 integration paths tested: (1) miss→LLM→cache→return, (2) miss→timeout→template→background enrichment, (3) cache hit→return, (4) all 5 narration types through pipeline.

### Test count: 726 → 814 (server) after Wave 3 + other team additions. All green, zero lint errors.
