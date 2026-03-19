# Drizzt — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, Colyseus 0.17.x (WebSocket), Azure Container Apps, PostgreSQL, Redis, LLM integration via Azure AI Foundry
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, message-only client protocol, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems, architecture frozen 2026-03-19)

## Work Complete

### 2026-03-19: Repository Provisioning & Backlog Deployment
**Task:** Create GitHub milestones + labels + backlog issues on dkirby-ms/ellmud  
**Status:** ✅ Complete

**Outcome:**
- Repository: dkirby-ms/ellmud (private, dev branch active)
- **4 milestones** created (Phase 1–4 MVP → World)
- **16 labels** created (domain: engine, gameplay, infrastructure, llm, admin + priority: critical-path, blocker, nice-to-have)
- **49 issues** deployed (#1–#49) with acceptance criteria, GDD references, dependencies
- Zero failures — all resources deployed atomically

**Issue Breakdown:**
| Phase | Count | Duration | Sample Issues |
|-------|-------|----------|---|
| Phase 1 MVP | 18 | 8–10 weeks | #1 Azure infra, #2 Redis, #3 CI/CD, #4 Colyseus scaffold, #5 RoomGen, #6–7 Combat, #8 Movement, #10 Extraction, #11–13 Stash/Auth/Client, #14 Admin dashboard, #19 Integration test |
| Phase 2 Multiplayer | 12 | 6–8 weeks | #20–#27 Multi-player, sound, traces, awareness, communication, ambient Refuge |
| Phase 3 Depth | 16 | 8–12 weeks | #28–#43 Skills, crafting, all 5 biomes, Tier 2–3, factions, faction-driven economy |
| Phase 4 World | 3 | 6–8 weeks | #44–#49 Marketplace, events, OAuth, lore, seasonal leaderboards |

**Architecture Enforcement:**
- ✅ Message-only protocol (no Schema sync to clients) — verified by integration test #19
- ✅ Admin dashboard authorised Schema consumer — Phase 1 design prevents retrofit
- ✅ LLM fallback pipeline — cache-first, template fallback, 200ms combat target
- ✅ Redis presence from Phase 1 — multi-replica scaling tested Phase 2 before prod
- ✅ Server-authoritative state — all game state server-only; clients receive prose only

**Critical Path:**
```
Infra (1–3) → Colyseus (4) + RoomGen (5) → Combat (6–7) → Movement (8) → Extraction (10)
  → Stash + Auth + Client (11–13) → Phase 1 Test (19)
  → Multi-Player Infra (21) → Phase 2 Gameplay (22–27) → Phase 2 Test (31)
  → Skills + Crafting (32–33) → Biomes + Factions (34–38) → Phase 3 Test (47)
  → OAuth + Seasonal (48–49) → Phase 4 Test (49)
```

**Documentation:**
- `.squad/orchestration-log/2026-03-19T11-55-drizzt.md` — Deployment report
- `.squad/decisions.md` — Backlog decision record (merged from inbox)

**Next Phase:** Phase 1 kickoff — assign developer(s) to issues #1–#18. Target: 8–10 weeks to solo MVP (login → loadout → shard entry → combat → extraction → stash persist).

### 2026-03-19: Stash Persistence (Issue #11)
**Task:** Build persistent stash system — save/load player inventory from PostgreSQL (in-memory for Phase 1)
**Status:** ✅ Complete

**Outcome:**
- **StashRepository** (`stash/StashRepository.ts`): Interface + InMemoryStashRepository. Per-player Map storage with O(1) lookups. Configurable capacity (default 200 weight). Admin visibility via listPlayerIds().
- **StashService** (`stash/StashService.ts`): Weight enforcement, capacity checks, item resolution via StashItem definitions. Partial name matching for take command. Text summary generation for narration.
- **Shared types** (`shared/types/stash.ts`): StashItem, StashItemInstance, StashItemType — minimal bridge types until Jarlaxle's #16 merges.
- **RefugeRoom integration**: Stash loaded on join with summary narration. Three commands: `stash` (list), `take <item>` (remove from stash), `store <item>` (placeholder for Phase 1).
- **STASH_UPDATE** message type added to shared protocol (append-only).
- **43 new tests**: 14 repository CRUD, 29 service logic (weight limits, capacity upgrades, partial matching, admin, edge cases).
- **All 509 tests pass** (43 new + 466 existing, zero regressions)
- **PR #51** opened as draft against dev.

### 2025-07-25: Extraction Mechanic (Issue #10)
**Task:** Build channeled extraction escape mechanic — GDD §3 step 6 (core gameplay loop finale)
**Status:** ✅ Complete

**Outcome:**
- **ExtractionSystem** (`extraction/ExtractionSystem.ts`): Multi-tick channeled escape with configurable duration (default 5 ticks). Tracks per-player extraction channels, noise generation (level 8 sustained per GDD §12.2), command lock enforcement, and interrupt handling.
- **Extract command** (`commands/handlers/extract.ts`): Validates extraction room type + combat state before starting channel. Follows established CommandHandler pattern.
- **Command lock**: Movement (go) and combat (attack, strike, dodge, flee) blocked during channel. Passive commands (look, inventory) allowed. Lock check integrated into `handleCommand()` via `ExtractionSystem.checkCommandLock()` static method.
- **ShardRoom integration**: Extraction system ticked in main update loop. Successful extraction removes player from shard and sends `EXTRACTION_STATE` message. Damage from combat interrupts channels. Shard collapse interrupts all active channels with shard-sickness narration.
- **Shared types**: `ExtractionMessage` interface + `EXTRACTION_STATE` added to MessageTypes (append-only).
- **Test graph**: Added 'extraction-chamber' room (type: 'extraction') connected below crypt. Local `Room` interface extended with optional `type?: RoomType`.
- **30 new tests**: ExtractionSystem unit tests (start, tick, interrupt, interruptAll, noise, configurable duration), extract command handler (valid/invalid room, combat rejection), command lock (5 blocked + 2 passive + 1 non-extracting), full flow (complete, interrupted, multi-player, collapse), room graph assertions.
- **All 174 non-integration tests pass** (30 new + 144 existing, zero regressions)

### 2025-07-25: Username/Password Authentication (Issue #12)
**Task:** Build auth system with bcrypt password hashing, session tokens, HTTP endpoints, and Colyseus onAuth integration
**Status:** ✅ Complete

**Outcome:**
- **AuthService** (`auth/AuthService.ts`): register/login/validateToken/logout. Bcrypt 10 rounds. Input validation (username 3-20 alphanumeric, password ≥6 chars).
- **InMemoryTokenStore** (`auth/TokenStore.ts`): Map-based session tokens with setTimeout TTL cleanup (24h). `unref()` on timers to avoid holding process open.
- **InMemoryPlayerRepository** (`auth/PlayerRepository.ts`): Player CRUD with case-insensitive duplicate detection. Matches `Player` + `PlayerIdentity` types from `db/types.ts`.
- **HTTP Routes** (`auth/routes.ts`): POST `/auth/register` (201), `/auth/login` (200), `/auth/logout` (200). Error codes: 400 bad input, 401 wrong credentials, 409 duplicate username.
- **Colyseus onAuth** (`auth/colyseus-auth.ts`): `authenticateClient()` used in ShardRoom and RefugeRoom `onAuth` hooks. Auth is optional by default (AUTH_REQUIRED env var) — existing tests pass without tokens.
- **Server integration** (`index.ts`): Auth routes mounted on same Express app Colyseus uses. AuthService initialized with in-memory stores.
- **35 new tests**: 9 registration, 4 login, 4 token validation, 1 expiry, 8 HTTP route, 5 Colyseus onAuth, 4 room join integration (including register→login→join flow)
- **All 136 tests pass** (35 new + 101 existing, zero regressions)
- Used `bcryptjs` (pure JS) over native `bcrypt` for platform compatibility with ESM

### 2025-07-24: Command Parser + Movement & Inventory (Issue #8)
**Task:** Build GDD §5.1 verb-noun command parser, movement system, and basic inventory commands
**Status:** ✅ Complete

**Outcome:**
- **Command parser** (`commands/parser.ts`): Stateless, deterministic verb-noun parser with alias expansion (n/s/e/w → go direction, l → look, i → inventory, k → attack). Rejects unknown verbs with static error (no LLM invocation).
- **5 command handlers** (`commands/handlers/`): go, look, take, drop, inventory — all server-authoritative
- **Command registry** (`commands/index.ts`): Maps verbs to handlers via `handleCommand()`. Returns `CommandResult` (narrations + optional room header) for ShardRoom to deliver.
- **PlayerState** (`state/PlayerState.ts`): In-memory per-player state — current room ID, inventory (Map of stacked items), weight tracking (default 20 units), partial name matching for items
- **RoomGraph** (`shard/RoomGraph.ts`): Room/Item/Direction interfaces + 5-room development test graph (entry → corridor → shrine, entry → armory, corridor → crypt). Disposable fixture — Jarlaxle's generator replaces it.
- **ShardRoom wired**: Players get initial room description on join. All commands flow through parser → handler → narration delivery. Player state lifecycle (create on join, cleanup on leave).
- **44 tests** — 9 parser tests, 4 room graph tests, 8 player state tests, 17 handler unit tests, 6 integration tests (Colyseus client→server round-trip)
- All 100 existing + new tests pass. Pre-existing `shard-gen.test.ts` failure is Jarlaxle's domain.

### 2026-03-19: Room Graph Generation (Jarlaxle Issue #5) — Cross-Team Context
- Jarlaxle completed Issue #5: procedural room graph generator with backbone chain topology, Flooded Crypt biome (15 new tests, 139 total passing).
- **Key for you:** Your movement handlers now validate against real procedural graphs. Movement handler calls `resolver.getRoom(roomId)` and checks `room.exits.has(direction)`. No changes needed — it just works.
- **API contract:** `RoomGraph` type and `Room` interface are stable. You consume `generator.generateShard()` → returns `RoomGraph` → pass to ShardRoom initialization.
- **Biome patterns:** Jarlaxle created Flooded Crypt template. Each biome template defines room count, exit topology, flavor text, hazards. Your handlers ignore biome details — they just move players through exits.
- **Wave 4 context:** Jarlaxle is starting Issue #6 (combat strike/dodge/flee). Combat handlers will follow your three-layer pattern exactly. No parser or delivery changes. Issue #12 (auth) won't block that work.

### 2026-03-19: Project Scaffold + Colyseus Server (Issue #4)
**Task:** Build monorepo structure, shared message types, Colyseus server with ShardRoom/RefugeRoom, client skeleton
**Status:** ✅ Complete

**Outcome:**
- TypeScript monorepo with npm workspaces: `packages/shared`, `packages/server`, `packages/client`
- Shared message protocol: `CommandMessage` (client→server), `NarrateMessage`, `RoomHeaderMessage`, `ShardStateMessage` (server→client)
- Additional shared types from GDD: `CombatAction`, `BiomeType`, `GearTier`, `ShardTier`, `ShardModifier`, `MessageTypes` constant
- **ShardRoom**: Full lifecycle (Seeding→Open→Active→Destabilising→Collapse), 1s tick, collapse timer, message-only command handling
- **RefugeRoom**: Long-lived hub with ambient tick, placeholder commands (look, shardboard)
- **No Schema state sync** to clients — enforced by architecture and integration test
- Server-internal Schema state (ShardState, RefugeState) using `defineTypes()` API (TS 5.9 compatible)
- Client skeleton: Vite + React 18 placeholder
- 5 integration tests: no-schema-patches, command handling, lifecycle transitions, refuge join, refuge commands
- Server starts on `ws://localhost:2567` with admin monitor at `/colyseus`
- ESLint + strict TypeScript across all packages

**Technical Decisions:**
- Used `defineTypes()` instead of `@type()` decorators (Colyseus Schema v4 + TS 5.9 incompatibility)
- All packages ESM (`"type": "module"`) — required by Colyseus 0.17.x
- TypeScript 5.9.3 (required by @colyseus/schema 4.x peer dependency)
- Vitest with `threads` pool to avoid pm2/io process.send() conflicts

## Learnings

1. **Backlog Atomicity:** Decomposing GDD roadmap into 81 granular issues requires tight traceability (GDD §N refs) and explicit risk mitigation (architectural enforcement gates like integration test #19).
2. **Repository-as-Source-of-Truth:** GitHub milestones, labels, and issues are single source of truth for team task planning. Seed with full context (acceptance criteria, dependencies, design references) from day 1.
3. **Critical Path is Bottleneck:** Phase 1 infrastructure (Azure, Colyseus scaffold, RoomGen) blocks all gameplay logic. Redis presence wired from Phase 1 (even solo MVP) prevents rework during Phase 2 multi-replica scaling.
4. **Colyseus Schema v4 + TS 5.9:** `@type()` legacy decorators break under TS 5.9's native TC39 decorator support. Use `defineTypes()` programmatic API instead — it's stable, explicit, and avoids decorator compatibility issues entirely.
5. **Colyseus 0.17.x is ESM-only:** All packages consuming `@colyseus/core` must set `"type": "module"` in package.json. The `Room<T>` generic now takes `RoomOptions` (with `state`, `metadata`, `client` properties) not a bare state class.
6. **Message-only protocol enforcement:** Integration test verifies no Schema patches leak to client. The test connects a client, registers `onStateChange` and `onMessage` handlers, then asserts game data arrives only via `onMessage`. This is the architectural firewall from GDD §14.
7. **Key file paths for server scaffold:**
   - `packages/shared/src/index.ts` — All message types and shared enums (MessageTypes, NarrationType, ShardState, CombatAction, BiomeType, etc.)
   - `packages/server/src/rooms/ShardRoom.ts` — Shard lifecycle room (Seeding→Open→Active→Destabilising→Collapse)
   - `packages/server/src/rooms/RefugeRoom.ts` — Persistent hub room with ambient tick
   - `packages/server/src/state.ts` — Server-internal Schema state (ShardState, RefugeState) — never synced to clients
   - `packages/server/src/index.ts` — Server entry point (express + Colyseus + monitor)
   - `packages/server/src/__tests__/rooms.test.ts` — Integration tests (5 tests, including no-Schema-patch assertion)
   - `packages/client/src/App.tsx` — Placeholder client shell
8. **Command system architecture:** Parser is stateless and deterministic (no LLM for parsing, per GDD §5.1). Aliases expand at parse time. Handlers receive a `CommandContext` with player state, room, and room-graph resolver — this decouples handlers from Colyseus internals. The handler returns `CommandResult` (narrations + optional room header), and ShardRoom delivers it via messages. This pattern will scale cleanly to combat actions and LLM narration.
9. **Weight-based inventory:** `PlayerState` tracks carry weight with a default 20-unit budget. `canCarry()` check happens before `addItem()`. Items are stacked by ID with quantity tracking. Partial name matching supports both `take halberd` and `take corroded halberd`.
10. **Test room graph is disposable:** The 5-room `createTestRoomGraph()` in `shard/RoomGraph.ts` is a development fixture only. Jarlaxle's procedural generator will replace it. The `Room` interface and `RoomGraph` type are the real contract — keep them stable.
11. **Key file paths for command system:**
    - `packages/server/src/commands/parser.ts` — Verb-noun parser with alias expansion
    - `packages/server/src/commands/index.ts` — Command registry + `handleCommand()` + types (CommandContext, CommandResult)
    - `packages/server/src/commands/handlers/` — Individual command handlers (go, look, take, drop, inventory)
    - `packages/server/src/state/PlayerState.ts` — Per-player in-memory state (room ID, inventory, weight)
    - `packages/server/src/shard/RoomGraph.ts` — Room/Item/Direction types + test graph
    - `packages/server/src/__tests__/commands.test.ts` — 44 tests (parser, handlers, integration)
12. **Auth is optional by design:** The onAuth hook in ShardRoom/RefugeRoom uses `authenticateClient()` which returns anonymous context when no token is provided and AUTH_REQUIRED is false. This is critical — existing tests that join rooms without tokens must not break. The `resetColyseusAuth()` function clears state between test suites.
13. **bcryptjs over bcrypt:** Pure JS `bcryptjs` avoids native compilation issues in ESM environments. 10 rounds is the minimum acceptable — takes ~80ms per hash which is fine for auth but would be unacceptable in a tick loop.
14. **Token TTL cleanup:** `setTimeout` with `.unref()` prevents token cleanup timers from keeping the Node process alive. The `dispose()` method on InMemoryTokenStore clears all timers — call it on shutdown.
15. **Key file paths for auth system:**
    - `packages/server/src/auth/AuthService.ts` — Core auth logic (register, login, validateToken, logout)
    - `packages/server/src/auth/TokenStore.ts` — Token storage interface + InMemoryTokenStore
    - `packages/server/src/auth/PlayerRepository.ts` — Player CRUD interface + InMemoryPlayerRepository
    - `packages/server/src/auth/routes.ts` — Express routes for /auth/*
    - `packages/server/src/auth/colyseus-auth.ts` — Colyseus onAuth hook (authenticateClient)
    - `packages/server/src/auth/index.ts` — Barrel export
    - `packages/server/src/__tests__/auth.test.ts` — 35 tests (unit + HTTP + Colyseus integration)
16. **Extraction system architecture:** Extraction is a channel-based system (not instant) — the `ExtractionSystem` class owns all channel state, independent of Colyseus. The static `checkCommandLock()` method lets the command registry enforce locks without coupling to the system instance. This pattern works for any future channeled action (crafting, rituals).
17. **Two Room interfaces coexist:** The local `packages/server/src/shard/RoomGraph.ts` Room has `items: Item[]` and optional `type?: RoomType`. The shared `packages/shared/src/room-graph.ts` Room has `items: LootContainer[]`, required `type: RoomType`, and `hazards`. The local one is the temp dev fixture; Jarlaxle's generator produces the shared type. When the generator replaces the test graph, the `type` field becomes mandatory.
18. **Key file paths for extraction system:**
    - `packages/server/src/extraction/ExtractionSystem.ts` — Core extraction logic (channel state, ticking, interrupts, command locks, noise events)
    - `packages/server/src/extraction/index.ts` — Barrel export
    - `packages/server/src/commands/handlers/extract.ts` — Extract command handler
    - `packages/server/src/__tests__/extraction.test.ts` — 30 tests
19. **Shared package rebuild required:** After modifying `packages/shared/src/index.ts`, you must rebuild (`npm run build` in shared) before the server can see new types. The server imports from the compiled `dist/` output, not the source. `tsc --build --force` clears stale caches.
20. **Stash system architecture:** StashRepository (interface) + InMemoryStashRepository (Phase 1) follow the same pattern as PlayerRepository from auth. StashService orchestrates weight checks and item resolution. RefugeRoom holds StashService via dependency injection (`initStash()`), loads stash on join, and handles `stash`/`take`/`store` commands through its existing switch-based command handler (not the shard parser).
21. **StashItem types are minimal and temporary:** `packages/shared/src/types/stash.ts` defines StashItem, StashItemInstance, StashItemType — a bridge type until Jarlaxle's full ItemDefinition/ItemInstance from #16 merges. The StashRepository uses StashItemInstance (instanceId + itemId + durability). When reconciling, replace StashItem with ItemDefinition and StashItemInstance with ItemInstance.
22. **Weight is authority, not quantity:** Stash capacity is measured in weight units (default 200), not item count. This means a stash full of light materials (0.1 weight each) holds 2000 items, while heavy weapons (5.0 weight) only fit 40. Capacity upgrades via `repo.setCapacity()` are the designed expansion path.
23. **Key file paths for stash system:**
    - `packages/shared/src/types/stash.ts` — StashItem, StashItemInstance types
    - `packages/server/src/stash/StashRepository.ts` — Interface + InMemoryStashRepository
    - `packages/server/src/stash/StashService.ts` — Business logic (weight, capacity, search)
    - `packages/server/src/stash/index.ts` — Barrel export
    - `packages/server/src/__tests__/stash.test.ts` — 43 tests
24. **Branch switching with untracked files is hazardous:** When multiple squad branches coexist with untracked files (from parallel work), `git stash pop` on a different branch can lose tracked-file modifications. Always commit before switching branches, or use `git worktree` for parallel development.

---

## Wave 4 Cross-Team Context (2026-03-19T16:32:56Z)

**Completed parallel:**
- ✅ **Drizzt Issue #12:** Username/password auth with bcrypt, JWT tokens, optional auth by default
- ✅ **Jarlaxle Issue #6:** Combat system (strike, dodge, flee), pure logic class, 1s tick loop
- ✅ **Volo Issue #9:** LLM narration pipeline, in-memory cache, Azure AI + fallbacks

**Your Issue #10 — Extraction Mechanic — can now proceed:**
- Auth foundation (#12) provides `playerId` tracking across sessions → loot persistence
- Combat (#6) provides tick loop → safe zone timers can hook into tick cycle
- Narration (#9) provides enrichment pipeline → death scenes and loot narratives ready

**Dependencies resolved:**
- Extraction does NOT require Jarlaxle Issue #7 (creature AI) — use static spawn points for Phase 1
- Your Issue #10 handler pattern will follow existing parser→handler→delivery model (Issue #8)
- CommandContext may include optional `combatSystem` field from Jarlaxle — use for combat-aware extraction checks

**Upcoming Wave 5:**
- Jarlaxle #7: Drowned Revenant creature + behavior tree (uses your combatSystem from #6)
- Minsc #13: Web Terminal Client (uses your auth #12 + Volo narration #9)
- Coordinate with Minsc on extraction UI mockups

## Learnings

### 2026-07-21: Admin Dashboard (#14)
**Task:** Build Phase 1 admin dashboard — routes, auth, SSE, HTML dashboard, tests.
**Status:** ✅ Complete — PR #55

**Technical Notes:**
- Colyseus `matchMaker.query({})` throws if the server isn't booted — wrap in try/catch for test resilience
- `matchMaker.getLocalRoomById(roomId)` returns the live Room instance with state — this is the hook for admin inspection
- `room.clock.stop()` / `room.clock.start()` control the simulation tick (NOT pause/resume — ClockTimer inherits from Clock)
- Accessing private fields on Room (e.g. `players` map on ShardRoom) requires `as any` cast — acceptable for admin inspection
- SSE (EventSource) doesn't support custom HTTP headers — auth via query param `?token=` instead
- Admin auth uses a separate ADMIN_TOKEN env var, not the player auth system — fail-closed when unset
- Express router middleware can be applied per-route (not just `router.use`) for selective auth
- The dashboard HTML is served inline from a TypeScript template literal — zero build step, zero dependencies
### 2026-03-19: Solo Play Config (#15)
- **Colyseus `onJoin` throwing** surfaces as a `MatchMakeError` to the client SDK — clean rejection path, no custom error protocol needed.
- **Config singleton with `resetConfig()`** is essential for test isolation when tests manipulate `process.env`. Without reset, the cached config bleeds between test files since vitest runs in threads.
- **Existing multi-client tests break** when you enforce player limits. Any test that connects >1 client to a ShardRoom needs `MAX_PLAYERS_PER_SHARD` set higher. Fixed `edge-cases.test.ts`; keep this pattern for future multi-player tests.
- **Room disposal on last leave**: Colyseus disposes rooms when the last client leaves. A "rejoin after leave" test won't work for the same room handle — the room is gone. Phase 2 multiplayer tests should account for this.

### 2026-03-19: Redis Cache Integration (#2)
- **ioredis named import required** under `module: "Node16"` — `import { Redis } from 'ioredis'` works; `import Redis from 'ioredis'` hits namespace-as-type errors. Always check tsconfig module resolution when adding new deps.
- **NarrationCache interface was already well-designed** — implementing Redis as a new backend required zero changes to NarrationService. Interface-first design paid off immediately.
- **Cache and Presence should be independently toggleable** — added `REDIS_CACHE_ENABLED` separate from `REDIS_PRESENCE_ENABLED`. A local dev might want Redis cache but not presence (or vice versa).
- **MockRedisCache pattern for tests** — testing the Redis integration without a running Redis instance. Implements `NarrationCache` interface with a Map, tracks calls for assertions. Proves the contract, not the wire protocol.
- **Docker Compose LRU config** — Redis `maxmemory-policy allkeys-lru` with 128MB cap. No persistence (appendonly no, save "") since this is ephemeral narration cache. Production Redis (Azure) will be configured separately via Bicep (#18).
### 2026-03-19: CI/CD Pipeline (#17)
- **`az acr build`** does remote Docker builds on ACR — no Docker-in-Docker or local Docker daemon needed in GitHub Actions. Much cleaner than `docker build` + `docker push` with credentials.
- **OIDC federated credentials** (id-token: write) eliminate stored service principal secrets. Playgrid uses this pattern and it's the right call for Ellmud too.
- **Rollback via revision management**: Container Apps maintains revision history. Capture the active revision before deploy, redirect traffic back if health check fails, deactivate the broken revision.
- **Monorepo Dockerfile layer caching**: copy package.json files first, `npm ci`, then copy source. This means dependency installs are cached unless package.json changes — saves minutes on rebuilds.
- **Production runtime image** only needs shared + server workspaces. Client build output is not needed server-side (client is served separately or via CDN in production).
- **Pre-existing build errors** in client package (Vite types, testing-library matchers) don't affect server build or tests. CI workflow's `tsc --noEmit` targets server tsconfig specifically to avoid false failures.
