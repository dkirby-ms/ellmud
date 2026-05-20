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

### 2026-05-19T23:09:36.915+00:00: UAT WebSocket Ceiling Investigation (INVESTIGATED)

**Task:** Investigate why a live UAT load test plateaued around 54 connected players with one shared zone room and no server-side crash logs.

**Findings / patterns:**
- `infra/modules/container-apps.bicep` gives each ACA replica `1.0` vCPU and `2Gi` memory, with `minReplicas: 1`, `maxReplicas: 4`, and an HTTP scale rule at `concurrentRequests: '30'`. That rule is an autoscaling threshold, not a hard cap, and it does not scale on long-lived WebSocket connections.
- A single hot Colyseus room still lives on one replica/process. Even with Redis presence/driver and ACA sticky sessions enabled, `maxReplicas` does not raise one room's per-process ceiling; only per-replica resources (or room sharding) do.
- `packages/server/src/index.ts` uses the default `WebSocketTransport({ server: httpServer })` with no explicit WebSocket connection cap, and `packages/server/src/rooms/ZoneRoom.ts` now caps persistent zones at 100 players via `maxClients`, so the observed ~54 ceiling is not coming from a server-configured room limit.
- The load test is client-heavy but not 54 separate Chromium processes: `packages/e2e/src/load-test.ts` launches one headless Chromium browser and creates many isolated contexts/pages inside it. The ramp also waits for every batch to finish (`Promise.allSettled(batch)`) and each user can sit for 30 s on `waitForSelector`, which makes the run appear frozen once new connects start timing out.
- UAT deployments currently set `ALLOW_LOCAL_AUTH=true` and `ENABLE_LLM_NARRATION=true` in `.github/workflows/ci-cd.yml`, so this load path is local-auth enabled and uses production narration wiring unless operators override it.

**Key file paths:**
- `infra/modules/container-apps.bicep`
- `.github/workflows/ci-cd.yml`
- `packages/server/src/index.ts`
- `packages/server/src/config.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/server/src/auth/routes.ts`
- `packages/e2e/src/load-test.ts`


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

### 2026-05-20T12:16:21.884+00:00: Hot-Zone Load Ceiling Diagnosis (INVESTIGATED)

**Task:** Diagnose the ~50-user UAT ceiling, duplicate zone-room creation, and mid-session disconnects seen during external load testing against ACA.

**Findings / patterns:**
- The ACA `concurrentRequests: '30'` rule in `infra/modules/container-apps.bicep` is only an HTTP autoscale trigger; it is not a WebSocket hard cap. The app still runs one hot Colyseus room per process/replica, with `1.0` vCPU and `2Gi` RAM per replica.
- There is no explicit app-side socket cap: `packages/server/src/index.ts` passes a plain `http.createServer(app)` into `new WebSocketTransport({ server: httpServer })`, `packages/server/src/config.ts` gives persistent zones a 100-player default, and `packages/server/src/rooms/ZoneRoom.ts` applies that value to `this.maxClients` for zone rooms.
- The practical ceiling is the join/runtime workload on one replica. `ZoneRoom.onJoin()` performs a long serial hydration path (active character/profile/faction/character/base stats/flags/last inn/posture/starter kit/inventory/loadout/stats/exploration) before the client is fully ready, so one 1-vCPU replica can bog down well below the configured 100-player room limit.
- Duplicate rooms are explained by Colyseus matchmaking timing, not `filterBy()`. The client joins zone-specific room names directly (`joinOrCreate('zone:<slug>')`), but Colyseus only waits `COLYSEUS_MAX_CONCURRENT_CREATE_ROOM_WAIT_TIME` (default 0.5 s) for a concurrent creator before creating another room. `handleCreateRoom()` does not publish/persist the room until after `ZoneRoom.onCreate()` finishes, and that `onCreate()` does async zone loading plus initialization work, so burst joins can legitimately create parallel rooms for the same zone and even spread them across replicas.
- Existing connection drops line up with the transport heartbeat being too aggressive for a saturated replica. The server does not override Colyseus WS heartbeat settings, so the transport default is `pingInterval=3000` ms and `pingMaxRetries=2`; under load that means roughly ~6 s of missed pong budget before `terminate()`. Combined with the heavy join path, 1-second sim tick, and stress-command traffic, that is a plausible trigger for the observed mid-session socket loss.
- The load-test "stall at 50" is amplified by the harness: it waits for each ramp batch with `Promise.allSettled(batch)`, and each failed user can sit up to 30 s in `waitForSelector(...)`, so two stuck joins freeze the visible ramp for ~30 s even though the real issue is backend saturation/timeouts.

**Key file paths:**
- `infra/modules/container-apps.bicep`
- `packages/server/src/index.ts`
- `packages/server/src/config.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/client/src/services/connection.ts`
- `packages/client/src/pages/ZoneExploration.tsx`
- `packages/client/src/hooks/useZoneConnection.ts`
- `packages/e2e/src/load-test.ts`
- `packages/e2e/src/fixtures/player-fixture.ts`
- `node_modules/@colyseus/core/src/MatchMaker.ts`
- `node_modules/@colyseus/core/src/matchmaker/RegisteredHandler.ts`
- `node_modules/@colyseus/core/src/Room.ts`
- `node_modules/@colyseus/core/src/utils/Utils.ts`
- `node_modules/@colyseus/ws-transport/src/WebSocketTransport.ts`

### 2026-05-20T13:34:19.228+00:00: Zone Join Deferral, Heartbeat Relaxation, and Matchmaker Wait Tuning (DELIVERED)

**Task:** Implement the three approved server-side fixes for the hot-zone connection ceiling: relax WebSocket heartbeats, slim `ZoneRoom.onJoin()`, and stop duplicate zone-room creation during burst joins.

**Outcome:** ✅ DELIVERED — `npm run build`, `npm run lint`, and `npm test` all passed in `packages/server` after the changes.

**Architecture / design decisions:**
- `packages/server/src/index.ts` now sets `COLYSEUS_MAX_CONCURRENT_CREATE_ROOM_WAIT_TIME` before dynamically importing Colyseus, so the runtime actually picks up the longer wait budget instead of the library's 0.5 s default.
- The WebSocket transport is now configured from centralized config with `WS_PING_INTERVAL` / `WS_PING_MAX_RETRIES` defaults of `6000` ms and `4`, which gives overloaded replicas a much wider pong budget before forced termination.
- `packages/server/src/rooms/ZoneRoom.ts` keeps only identity resolution, room placement, lightweight player creation, and immediate client bootstrap in `onJoin()`. Profile, faction, character, flags, posture, inventory, exploration, loadout, and combat-stat hydration now run in a deferred async phase with `setTimeout(..., 0)` plus `setImmediate()` yields between heavy steps.
- Deferred join hydration is tracked per player and awaited during cleanup so a fast disconnect cannot persist half-hydrated default state back to storage.

**Patterns / user-relevant notes:**
- For Colyseus config sourced from env-backed constants, set the env var before importing the package or the default is frozen too early.
- The client already treats the connection as established once the room object is set; that makes staged post-join hydration safe as long as room header/look/zone state/player state arrive immediately and fuller inventory/loadout/map data follows quickly.
- `joinOrCreate('zone:<slug>')` relies on room-name matching, not `filterBy()`, so the duplicate-room fix here is startup tuning of the Colyseus concurrent-create wait rather than room-definition filters.

**Key file paths:**
- `packages/server/src/index.ts`
- `packages/server/src/config.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/server/src/__tests__/wave3-redis-contracts.test.ts`
- `node_modules/@colyseus/core/src/MatchMaker.ts`
- `node_modules/@colyseus/core/src/utils/Utils.ts`
- `node_modules/@colyseus/ws-transport/src/WebSocketTransport.ts`

### 2026-05-20T15:22:42.185+00:00: Browser-Free Colyseus Load Test Harness (DELIVERED)

**Task:** Build a lightweight e2e load test path that skips Playwright browsers and drives auth plus zone joins through raw HTTP + WebSocket.

**Architecture / design decisions:**
- `packages/e2e/src/load-test-ws.ts` now performs the full player bootstrap with HTTP calls (`/auth/login`, `/auth/register`, `/api/characters`, `/api/characters/:id/select`, `/api/spawn-zone`) and then joins the returned `zone:<slug>` room via the Colyseus JS SDK with `{ token, characterId }`.
- The WS harness reuses the same command pressure shape as the browser load test, but sends protocol-native `MessageTypes.COMMAND` payloads directly after parsing direction aliases into `go <dir>`.
- Local/dev websocket resolution now tries both the app host and the Colyseus dev port (`:2567`) so one CLI flag (`--url`) still works against browser-served local stacks and same-origin deployed stacks.
- The WS ramp no longer waits for each batch to finish connecting before spawning the next batch, avoiding the Playwright harness stall pattern when a subset of joins hang or time out.

**Patterns / user-relevant notes:**
- `/api/spawn-zone` is the canonical way to resolve which persistent zone room a selected character should join; it reflects the active character's starting zone and keeps the load harness aligned with the real client flow.
- For protocol-level load tests, joining `joinOrCreate(spawnTarget, { token, characterId })` plus sending `MessageTypes.COMMAND` traffic is enough; no DOM, localStorage, or browser navigation is required.

**Key file paths:**
- `packages/e2e/src/load-test-ws.ts`
- `packages/e2e/package.json`
- `package.json`
- `scripts/load-test-ws.cmd`
- `packages/client/src/services/connection.ts`
- `packages/client/src/pages/ZoneExploration.tsx`
- `packages/server/src/api/characters.ts`
- `packages/server/src/api/spawn-zone.ts`
