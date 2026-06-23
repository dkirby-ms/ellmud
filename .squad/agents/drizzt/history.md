# drizzt — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Condensed prior work (through 2026-05-20T17:17Z)

- **Permadeath / Hall of Fame:** Added migration 017, permadeath config, and Hall of Fame stats/leaderboard APIs. The threshold model was simplified to a boolean toggle, while backward-compatible config remained.
- **Browser load testing:** Created `packages/e2e/src/load-test.ts`, e2e package script, root `npm run load-test`, and `scripts/load-test.sh`. The harness supports auto-register/token auth, Playwright browser contexts, status reporting, and active stress traffic with jittered movement/chat commands.
- **Player profile schema drift:** `player_profile` remains account-scoped, while `player_skills` moved to character scope in migration 021. `ZoneRoom` must bridge character IDs to backing player IDs; tests should assert `ON CONFLICT (character_id, skill_name)` and validate both original and migration constraints.
- **ACA / Colyseus baseline:** Production multi-replica safety requires Redis presence, Redis driver, and ACA sticky sessions. Sticky ingress was added in `infra/modules/container-apps.bicep`; local dev still falls back to in-memory presence/driver.
- **Hot-zone ceiling diagnosis:** The ACA HTTP concurrent-request scale rule is not a WebSocket cap. Practical limits came from single hot-room per process, heavy `ZoneRoom.onJoin()` hydration, short Colyseus heartbeat defaults, duplicate room creation during burst joins, and load-harness ramp stalls.
- **Hot-zone fixes:** `packages/server/src/index.ts` sets the Colyseus concurrent-create wait before importing Colyseus; config adds `WS_PING_INTERVAL`/`WS_PING_MAX_RETRIES` defaults; `ZoneRoom.onJoin()` was slimmed and expensive hydration deferred with cleanup awaiting pending hydration.
- **Browser-free WS harness:** Added `packages/e2e/src/load-test-ws.ts` to perform auth, character selection, `/api/spawn-zone`, and Colyseus room joins without Playwright. It sends protocol `MessageTypes.COMMAND` traffic and ramps without waiting for every batch to settle.
- **WS harness resilience:** Registered sink handlers for known server messages, added join timeout/retry, optional reconnect-on-unexpected-leave, and `--quiet` noise filtering. Use workspace import `@ellmud/shared` rather than relative shared source imports.
- **Grafana game metrics:** Dashboard JSON lives in `infra/grafana/dashboards/game-metrics.json` and references PostgreSQL by `${DS_POSTGRESQL}`. Use JSONB metadata queries, Grafana time macros, hourly/5-minute groupings as appropriate, and explicit windows for fixed leaderboards.

Key paths repeatedly touched or referenced: `packages/server/src/index.ts`, `packages/server/src/config.ts`, `packages/server/src/rooms/ZoneRoom.ts`, `packages/e2e/src/load-test.ts`, `packages/e2e/src/load-test-ws.ts`, `infra/modules/container-apps.bicep`, `infra/grafana/dashboards/game-metrics.json`, `packages/server/src/metrics/MetricsService.ts`.

---

## Recent detailed entries

### 2026-05-20T17:59:23.199+00:00: ACA Multi-Replica Seat Reservation Diagnosis (INVESTIGATED)

**Task:** Diagnose why the UAT WebSocket load test starts failing as soon as ACA scales `ellmud-uat-app` above one replica.

**Findings / patterns:**
- UAT had the intended stack: sticky ingress, Redis presence, and Redis matchmaker driver on each replica.
- `/api/spawn-zone` is not the seat-reservation boundary. The Colyseus reservation is created by `POST /matchmake/joinOrCreate/:roomName` and consumed by the WebSocket handshake.
- Colyseus stores reserved seats in the room process. Redis shares discovery/coordination, but does not make seat consumption replica-agnostic.
- The raw Node load harness was not affinity-safe on ACA because fetch and the SDK matchmake/WS steps did not share ACA affinity cookies.
- Log Analytics showed failures began with scale-out and that gameplay joins landed on multiple container groups.

**Key paths:** `infra/modules/container-apps.bicep`, `packages/server/src/index.ts`, `packages/server/src/api/spawn-zone.ts`, `packages/e2e/src/load-test-ws.ts`, Colyseus SDK/core transport files.

### 2026-05-20T18:12:16.280+00:00: ACA Affinity Cookie Passthrough for WS Load Testing (DELIVERED)

**Task:** Patch the raw Colyseus WebSocket load harness so ACA affinity survives the matchmake-to-WebSocket handoff during multi-replica scale-out.

**Architecture / design decisions:**
- `packages/e2e/src/load-test-ws.ts` manually performs `POST /matchmake/joinOrCreate/:roomName`, captures `ARRAffinity` / `ARRAffinity_SameSite`, and then calls `Client.consumeSeatReservation()`.
- The harness injects the captured cookie pair into the Node WebSocket upgrade via Colyseus `Client` options.
- Cookie passthrough is conditional so local/dev endpoints still work without ACA cookies.

**Patterns:** In Node, Colyseus can forward static WebSocket headers but does not automatically persist matchmake response cookies into the WebSocket handshake. The critical sticky-session boundary is matchmake HTTP to consume-seat WS.

### 2026-05-20T19:33:31.586+00:00: Zone Room Operational Metrics (DELIVERED)

**Task:** Add room-level metrics for joins, leaves, chat traffic, and throttled snapshots.

**Architecture / design decisions:**
- `MetricsService` supports `room_join`, `room_leave`, `chat_message`, and `room_snapshot` with fire-and-forget writes.
- Migration 023 makes `game_metrics.player_id` nullable for room-scoped snapshots.
- `ZoneRoom` reports Colyseus room identity (`roomId`, `roomName`, optional `zoneSlug`) and throttles snapshots to every 60 ticks.

**Patterns:** Join metrics should reflect real occupancy changes; transfer leave metrics should be latched before `ZONE_TRANSFER`; chat metrics can piggyback on successful speech commands without content analysis.

### 2026-05-20T20:00:00.902+00:00: Grafana Room & Connection Metrics (DELIVERED)

**Task:** Add dashboard panels for `room_snapshot`, `room_join`, `room_leave`, and `chat_message`.

**Architecture / design decisions:**
- Added a "Room & Connection Metrics" row after "Leaderboards & Hotspots" with panel IDs 200–204.
- Active Players uses AVG of `playerCount` per 5-minute bucket grouped by `zoneName`, not SUM, because multiple rooms in a zone each emit snapshots.
- Room Population uses `DISTINCT ON (metadata->>'roomId') ORDER BY created_at DESC` for the latest snapshot per room.
- Join/Leave Rate uses `event_type AS metric`; Chat Messages uses a bar chart style.

**Patterns:** `$__timeGroupAlias(..., '5m')` fits 60-second room snapshots; latest-room tables intentionally omit `$__timeFilter`; population thresholds provide congestion signals.

---

_Last summarized by Scribe on 2026-06-21T16:37:39Z._

### 2026-06-23T11:22:00Z: Redis non-blocking boot

- Made Redis cache, presence, and driver connect asynchronously so HTTP/Colyseus bind promptly and `/health` stays 200 during Redis cold start.
- Commit `520b575` supports PR #527 and preserves Redis-enabled deploys.
