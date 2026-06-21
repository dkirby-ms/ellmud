# drizzt — History

**Summarized on 2026-06-21T16:08:38Z by Scribe because history exceeded 15,360 bytes.**

## Summary through 2026-05-20

- Built and iterated the external Playwright load test in `packages/e2e/src/load-test.ts`, including root `npm run load-test`, `scripts/load-test.sh`, active stress traffic with jittered movement/chat commands, and `--no-stress` opt-out.
- Implemented permadeath DB/API groundwork: migration 017 `hall_of_fame`, config for permadeath toggles, and Hall of Fame leaderboard/stats endpoints. Later direction simplified active logic to a boolean toggle while keeping config compatibility.
- Diagnosed UAT WebSocket load ceilings around 50–54 users. Key finding: ACA `concurrentRequests` is an autoscale trigger, not a WebSocket cap; one hot Colyseus room remains bounded by a single replica/process, and heavy join hydration plus aggressive heartbeats caused practical ceilings below configured room limits.
- Delivered ACA/Colyseus multi-replica fixes: Redis presence/driver already existed, but ACA ingress sticky sessions were required. `infra/modules/container-apps.bicep` now uses sticky affinity; `ZoneRoom` resolves active character IDs server-side and avoids invalid profile saves.
- Tuned hot-zone join behavior: set Colyseus concurrent-create wait before import, relaxed WebSocket heartbeat defaults (`WS_PING_INTERVAL`, `WS_PING_MAX_RETRIES`), deferred heavy `ZoneRoom.onJoin()` hydration, and awaited deferred hydration during cleanup to prevent persisting half-hydrated state.
- Built browser-free Colyseus load harness `packages/e2e/src/load-test-ws.ts`: HTTP bootstrap (`/auth/login`, `/auth/register`, `/api/characters`, `/api/characters/:id/select`, `/api/spawn-zone`), raw SDK room join, protocol-native `MessageTypes.COMMAND` traffic, local/deployed websocket resolution, non-blocking ramps, sink handlers, join timeout/retry, reconnect backoff, and `--quiet` noise suppression.
- Diagnosed and fixed ACA multi-replica seat-reservation failures in the raw WS harness. Colyseus seat reservations are process-local; Node SDK did not preserve ACA affinity cookies from matchmake HTTP to WebSocket. Harness now manually performs matchmake, captures `ARRAffinity` cookies, and consumes reservations with a `Cookie` header.
- Added operational room metrics: `room_join`, `room_leave`, `chat_message`, and throttled `room_snapshot`; migration 023 allows room-scoped metrics without player IDs. Metrics use room identity (`roomId`, `roomName`, `zoneSlug`) and classify transfer leaves before `onLeave()` cleanup.
- Added Grafana room/connection panels to `infra/grafana/dashboards/game-metrics.json`: active players by zone, room population table, join/leave rate, and chat messages. Used portable PostgreSQL datasource `${DS_POSTGRESQL}`, JSONB metadata access, `$__timeGroupAlias`, latest-snapshot table queries, and room metric thresholds.
- Investigated player skill persistence schema drift: profile remains account-scoped while `player_skills` moved to character-scoped uniqueness in migration 021. Future repo/schema tests should validate `ON CONFLICT (character_id, skill_name)` and the migration from the original `player_id` constraint.

## Durable patterns

- For Colyseus on Azure Container Apps, production-safe scale-out requires RedisPresence + RedisDriver + sticky ingress sessions, but a single named room still has a per-process ceiling unless room sharding is introduced.
- Long-lived WebSocket capacity should be tested with command traffic, not idle sockets. Jittered action loops avoid synchronized bursts.
- In Node-based Colyseus clients behind ACA, preserve `Set-Cookie` affinity from matchmake responses into WebSocket upgrades when consuming process-local seat reservations.
- Set Colyseus env-backed constants before importing Colyseus modules, or defaults may be frozen too early.
- Defer expensive room hydration after immediate client bootstrap, and track/await deferred hydration during cleanup.
- `/api/spawn-zone` is the canonical API for determining the persistent zone room a selected character should join.
- Room metrics should distinguish occupancy changes from transport/session displacement and should avoid inventing synthetic player IDs for room snapshots.
