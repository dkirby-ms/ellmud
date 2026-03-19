# Minsc — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

- **Colyseus testing port conflicts:** `@colyseus/testing` boots a real server on port 2568. Multiple test files with `bootTestServer()` cause `EADDRINUSE` if files run in parallel. Fixed with `fileParallelism: false` in vitest config.
- **Colyseus simulation clock is imprecise in tests:** 1-second tick intervals don't fire at exactly 1s under load. For tests that depend on timer expiration (collapse lifecycle), use polling (`waitUntil`) instead of fixed `wait()` calls.
- **Room auto-dispose on empty:** Colyseus rooms auto-dispose when the last client leaves. Edge-case tests for rapid join/leave must keep an anchor client connected.
- **`@colyseus/sdk` is a peer dependency of `@colyseus/testing`:** Not declared explicitly — must be added to server devDependencies for tests to run.
- **Test structure:** File-level `beforeAll`/`afterAll` for the Colyseus server, with multiple `describe` blocks sharing one server instance. This avoids port conflicts within a file.
- **Test counts (Issue #19):** 42 server tests (6 files), 19 shared tests (1 file), 0 client tests (skeleton config). 61 total passing tests.
- **Client test infrastructure (Issue #13):** jsdom environment required for React component tests. `@testing-library/jest-dom/matchers` must be manually extended via `expect.extend(matchers)` — the `/vitest` entrypoint doesn't auto-register in monorepo setups. Explicit `cleanup()` in `afterEach` is mandatory when using `screen` queries across tests.
- **Message-only protocol enforcement via source scanning:** Connection tests read `connection.ts` source at test time and grep for forbidden patterns (`room.state`, `onStateChange`, `Schema`). Comments are stripped before checking to avoid false positives. This catches accidental Schema usage at CI time.
- **Client test count (Issue #13):** 44 client tests (5 files) — connection protocol, terminal rendering, command input + aliases, auth flow, state reducer.
- **Pre-existing server failures:** Server tests have a pre-existing failure (`commands.test.ts` expects 5 rooms but gets 6) likely from another agent's uncommitted extraction work. Not related to client.

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
