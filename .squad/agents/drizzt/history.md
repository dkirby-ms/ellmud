# drizzt — History

**For a quick overview, see [summary.md](./summary.md)**

---

### 2026-05-19: Load-Test Stress Behavior & Root npm Script (DELIVERED)

**Task:** Enhance the Playwright load test with active stress behavior (movement & chat commands) and expose it via root npm script.

**Outcome:** ✅ DELIVERED — All tests, lint, and build passed.

**Deliverables:**
- **Enhanced load-test.ts:** Configurable stress behavior (jittered movement/chat commands, default enabled, `--no-stress` flag supported)
- **scripts/load-test.sh:** Convenience wrapper for shared endpoint (200 concurrent connections)
- **Root npm script:** `npm run load-test` for operator access without cd into packages/e2e

**Design decisions:**
- Default stress mode exercises command-input path (more realistic than idle sockets)
- Jittered delays prevent command synchronization across clients
- Operators can opt out with `--no-stress` for connection-only testing
- Base action interval: 3000ms with randomization

**Integration:** Engine now measures both connection scale and steady-state gameplay traffic.

---


### 2026-04-13: Permadeath DB Schema & Hall of Fame API (DELIVERED)

**Task:** Build permadeath database schema, server config, and Hall of Fame REST API.

**Outcome:** ✅ DELIVERED — Migration 017 created, config integrated, leaderboard API ready.

**Deliverable:** 
- **Migration 017:** `hall_of_fame` table with character/player metadata, survival metrics, death info
- **Config:** Permadeath env vars integrated (PERMADEATH_ENABLED, PERMADEATH_THRESHOLD)
- **API Endpoints:** `GET /api/hall-of-fame` paginated leaderboard + `/api/hall-of-fame/stats` aggregate stats

**Design Note:** Initial implementation used threshold model (multiple deaths before permadeath). User directive simplified to boolean toggle — removed threshold from active logic, kept config field for backward compatibility.

**Integration:** System ready for Jarlaxle death handler, Regis UI, and Minsc test coverage.

## Learnings

### 2026-05-18: External Load Test Tool (DELIVERED)

**Task:** Create an external load testing script in `packages/e2e/` that drives real browser contexts via Playwright to generate WebSocket connections against the deployed server, triggering KEDA autoscaling.

**Outcome:** ✅ DELIVERED

**Deliverables:**
- **Script:** `packages/e2e/src/load-test.ts` — standalone tsx script (not a test)
- **package.json entry:** `"load-test": "tsx src/load-test.ts"` in `packages/e2e/package.json`
- **tsx** added as devDependency to `packages/e2e/package.json`

**Design decisions:**
- Two auth modes: AUTO (self-registers a unique user per connection via `/auth/register`) and TOKEN (shared pre-seeded JWT injected into every context's localStorage).
- Auto-registered accounts are NOT cleaned up — by design, since clean-up would drop WS connections.
- Ramp logic: spawns `--ramp-rate` (default 2) contexts per second, waits for each batch to settle before spawning the next.
- Connection alive signal: Playwright holds the browser page open; SIGINT/SIGTERM triggers graceful close of all contexts then `browser.close()`.
- Reporter fires every 5 s: prints connected / connecting / failed / closed counts.

**Key patterns learned:**
- `packages/e2e/src/fixtures/player-fixture.ts` shows the full auth flow: register → inject localStorage → goto('/zone') → wait for `input[aria-label="Command input"]:not([disabled])`.
- tsx is available globally at v4.21.0 and declared as `^4.19.0` in `packages/server/package.json`; safe to declare same range in e2e.
- `packages/e2e/playwright.config.ts` uses `baseURL: http://localhost:3000` for tests, but the load-test passes its own `--url` and sets `baseURL` per context — no config coupling needed.
- Colyseus WS join is confirmed live when the command input element becomes enabled.

- Disconnect and death cleanup both persist progression through `packages/server/src/rooms/ZoneRoom.ts`, which calls `savePlayerProfile()` before player state is removed.
- `packages/server/src/player/PgPlayerProfileRepository.ts` still treats profile persistence as player-scoped: it loads by `player_id`, saves skills with `ON CONFLICT (player_id, skill_name)`, and never writes `character_id` for those skill rows.
- The schema drift is in `player_skills`, not `player_profile`: `packages/server/src/db/migrations/001_schema.sql` defines `uq_player_skill` on `(player_id, skill_name)`, but `packages/server/src/db/migrations/021_fix_player_skills_unique_constraint.sql` replaces that with `uq_character_skill` on `(character_id, skill_name)` for multi-character support.
- Existing guardrails missed this drift: `packages/server/src/__tests__/pg-profile-repository.test.ts` and `packages/server/src/__tests__/persistence-schema-validation.test.ts` still assert the old player-scoped skill uniqueness, so repo tests pass even when runtime schema and save code disagree.
- `packages/server/src/player/PlayerProfileRepository.ts` now needs both IDs: `playerId` for `player_profile` rows and `characterId` for `player_skills` rows, because profile data stayed account-scoped while skills moved to character scope in migration 021.
- `packages/server/src/rooms/ZoneRoom.ts` is the bridge between runtime IDs and persistence IDs: room-level `playerId` is the character ID, while `dbPlayerId(characterId)` resolves the owning `players.id` UUID before calling persistence repositories.
- Guardrails now need to validate both layers together: repo tests should assert `ON CONFLICT (character_id, skill_name)` in `PgPlayerProfileRepository`, and schema validation should treat `001_schema.sql` as the original constraint plus `021_fix_player_skills_unique_constraint.sql` as the migration that flips skills to character scope.

### 2026-05-19T13:28:21.097+00:00: Root-Invokable Load Test Stress Traffic (DELIVERED)

**Task:** Make the Playwright load test runnable from the repo root, add a shell wrapper for the shared test endpoint, and keep virtual users active with chat plus movement traffic.

**Outcome:** ✅ DELIVERED

**Deliverables:**
- **Root script:** `package.json` now exposes `npm run load-test`, delegating to `@ellmud/e2e` with CLI passthrough.
- **Wrapper:** `scripts/load-test.sh` targets `https://ellmud-test.kirbytoso.xyz` with 200 connections and default stress traffic.
- **Stress behavior:** `packages/e2e/src/load-test.ts` now defaults to active post-connect behavior, sending jittered movement commands plus `say ...` chat messages through the command input.

**Key patterns learned:**
- Root workspace delegation supports reusable tooling entrypoints; adding a trailing `--` keeps extra CLI flags flowing into the workspace script.
- The load test can safely stress Colyseus via the same browser command path used by players: locate `input[aria-label="Command input"]`, `fill()`, then `press('Enter')`.
- A jittered per-user action loop with default `--action-interval 3000` avoids synchronized bursts while still creating sustained websocket and game-command pressure.
- Key paths for this workflow: `package.json`, `scripts/load-test.sh`, and `packages/e2e/src/load-test.ts`.

### 2026-05-19T15:02:22.910+00:00: Colyseus Multi-Replica Affinity & Character-ID Fallback (DELIVERED)

**Task:** Fix Azure Container Apps multi-replica Colyseus routing (`seat reservation expired`) and investigate the `player_skills.character_id` foreign-key save failure during disconnect cleanup.

**Outcome:** ✅ DELIVERED

**Architecture / design decisions:**
- `packages/server/src/index.ts` already had Redis presence + Redis driver support; the missing infra piece was ACA ingress sticky sessions. Container Apps must keep the Colyseus HTTP matchmake request and follow-up WebSocket on the same replica.
- `infra/modules/container-apps.bicep` now enables `ingress.stickySessions.affinity = 'sticky'` so ARR affinity is explicit in IaC.
- `packages/server/src/rooms/ZoneRoom.ts` now resolves the active character server-side when a client sends only `playerId`; room state is keyed to `characters.id`, while `ownerPlayerIds` keeps the backing `players.id` for persistence.
- Profile saves now skip unresolved player/character pairs instead of attempting a `player_skills` write with an invalid `character_id`.
- Startup logging now reports the actual Redis driver state, not just the env toggle, and warns when multi-replica startup is not cluster-safe.

**Patterns / user-relevant notes:**
- For Colyseus on ACA, the safe production trio is: RedisPresence + RedisDriver + sticky ingress sessions.
- Local dev still falls back cleanly: if Redis is disabled or unreachable, Presence/driver stay local/in-memory.

**Key file paths:**
- `packages/server/src/index.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/server/src/__tests__/zoneroom-player-id.test.ts`
- `infra/modules/container-apps.bicep`
