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
