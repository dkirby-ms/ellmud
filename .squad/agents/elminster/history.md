# elminster — History

**For a quick overview, see [summary.md](./summary.md)**

---


## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Core Context (Architecture, Decisions, Foundations — Completed)

**Foundation work (Phase 1: Repository + GDD):**
- ✅ **GDD Comprehensive:** Frozen on 2026-03-19, covers all systems (combat, zones, extraction, narration, auth, loot)
- ✅ **GitHub Backlog:** #1–#49 (4 phases, 16 labels, 4 milestones) fully triaged and decomposed from GDD
- ✅ **Colyseus + Azure Architecture:** WebSocket framework selected, Azure Container Apps + PostgreSQL + Redis, optional Auth via env var
- ✅ **Migration Consolidation:** 22 migrations consolidated into 4 semantic groups (schema, seed, entities, features)
- ✅ **Admin Dashboard:** Express routes, SSE broadcasts, content (creatures/items/zones) CRUD, separate ADMIN_TOKEN auth

**Team Architecture Decisions (Merged to decisions.md):**
- Stash persistence: InMemoryStashRepository + PgStashRepository (weight-based capacity)
- Room topology enforcement: biome → room_type rules (prevent invalid connections)
- Extraction state machine: clear messaging for different states (channeling, mid-flight, landed)
- Combat system: Pure logic + callback injection pattern for event handling
- In-memory cache default: Redis as optional config switch (backwards compatible)
- Colyseus test server: One per file, no file parallelism, polling over fixed waits
- Colyseus Schema types: `defineTypes()` over `@type()` decorators (TypeScript 5.9.3 compatibility)

**Design Specs Completed (Proposals in Decisions):**
- GDD Roadmap → GitHub Issues decomposition (roadmap architecture & priority framework)
- Creature room appearance (#383): Individual creature lines with ANSI tag support
- Optional user flags (#365): [Anon], [RP] flags via character_flags table + `/flag` command
- Figma export strategy: Conversion of design assets to TypeScript icon components

**Research & Analysis Completed:**
- User config file system (project-root based via env override)
- Direction shortcuts & speedwalks (root cause: React state race condition + key repeat)
- BFS layout engine (corridor-first generation, depth-first room building)
- Combat sandbox (isolated testing with minimal dependencies)

**All Phase 1 work complete. Zero test regressions. Ready for Phase 2 (Groups) and Phase 3 (Combat Rewards).**

---

## Team Updates

### 2026-04-06: Stronghold-Zone Connection Orchestration
- **Session orchestration coordinated** across design (Elminster), implementation (Regis x2), content (Bruenor, Laeral)
- **Issue #316 (Regis):** Delete modal replaced browser confirm() with styled dark-theme pattern
- **Issue #317 (Regis):** Context menu implementation deployed; direction conflict warnings included
- **Migration 022 (Bruenor):** Faction strongholds connected to world zones (6 rooms, 24 exits)
- **Route design (Laeral):** Stronghold-to-zone connection routes finalized
- **Decisions merged:** Design specs, implementation notes, UI patterns filed to squad decisions

---

## Learnings

### 2026-04-11: PR #414 Review — Group Formation System (#403 Phase 3)
**Task:** Code review of group formation system PR.

**Verdict: APPROVE**

**Architecture (Clean):**
- GroupManager is fully separated from ZoneRoom — pure in-memory state with no Room/Client dependencies. ZoneRoom holds a single `GroupManager` instance and calls it during lifecycle events. Clean interface boundary.
- The `_groupEvent` / `_gsay` sideband pattern on CommandResult is consistent with the existing `_followStopped` pattern from PR #408. Not the cleanest long-term pattern (typed sidebands on result objects), but consistent within the codebase.

**State Management (Correct):**
- Dual-map design (`groups` Map + `playerGroup` reverse index) ensures O(1) lookups in both directions.
- `handlePlayerLeave()` correctly handles both leader-disconnect (→ disband) and member-disconnect (→ remove + auto-disband if ≤1).
- Death cleanup calls `cleanupGroupMembership()` inside `handlePlayerDeath()`, correct ordering (before corpse/loot logic).
- `PlayerState.groupId` is kept in sync by command handlers (set on form/add, cleared on remove/leave/disband/death/disconnect).

**Security (Solid):**
- All leader-only commands (add, remove/kick, disband, leader transfer) check `group.leaderId !== requesterId` both in GroupManager and in command handler layer (defense in depth).
- `group add` requires target to be following leader OR have consented — no unconsented player additions.
- Non-leaders can only `removeMember` themselves (verified at GroupManager level).

**Edge Cases (All Covered):**
- Leader disconnect → disband ✓ (cleanupGroupMembership in onLeave)
- Max capacity (20) enforced on both formGroup and addMember ✓
- Player in two groups impossible — `playerGroup` reverse index checked on form and add ✓
- Auto-disband when group drops to ≤1 member ✓
- Leader can't self-kick (must disband or transfer first) ✓

**gsay (Correct):**
- Scoped to group members only via `memberIds` from group state.
- Cross-room delivery works: ZoneRoom iterates `memberIds` and finds clients by sessionId regardless of room.
- Uses `speech` type consistently.

**Follow-up Fixes (#411, #412, #413):**
- #411: `player-display.ts` extracts duplicated follow-display logic from look.ts and go.ts. Clean, correct.
- #412: `moveFollowers()` now calls `this.downingSystem.isPlayerDowned(followerId)` to skip downed followers. One-line fix, correct.
- #413: `handlePlayerDeath()` now calls `cleanupFollowRelationships(playerId)` before any other death logic. Correct.

**Test Coverage (57 tests — Thorough):**
- GroupManager unit tests: 22 (form, add, remove, transfer, disband, handlePlayerLeave, edge cases)
- Command handler tests: 22 (all 8 subcommands + error cases)
- gsay tests: 4 (delivery, metadata, error cases)
- formatPlayerLines helper: 5 (posture, following, anon, fallback)
- PlayerState fields: 2
- Max size: 3

**Minor Nit (Non-blocking):**
- Module-level `let nextGroupId = 1` in GroupManager.ts with `static resetIdCounter()` for tests is pragmatic but slightly impure. Acceptable for session-scoped in-memory state.

**Key File Paths:**
- GroupManager: `packages/server/src/systems/GroupManager.ts`
- Group commands: `packages/server/src/commands/handlers/group.ts`
- Player display helper: `packages/server/src/commands/handlers/player-display.ts`
- ZoneRoom integration: `packages/server/src/rooms/ZoneRoom.ts` (lines ~340, ~721-726, ~1197-1240, ~1337-1350, ~1551, ~1657-1715, ~2364-2370)
- Tests: `packages/server/src/__tests__/group.test.ts`

### 2025-07-22: Container Item System Architecture (#409)
**Task:** Scope and design architecture proposal for container item type, inventory persistence, and corpse loot system.

**Key Findings:**
1. **Death/corpse system already exists and is well-tested.** Full flow: DowningSystem (downed state, 10-tick bleed-out) → handlePlayerDeath() → CorpseSystem.addCorpse(). Loot command fully functional. Tests in `player-death.test.ts` and `corpse-loot.test.ts`.
2. **Bug: equipped items vanish on death.** `ZoneRoom.ts:2113-2145` iterates `player.inventory` for corpse items but equipped items live in `player.equippedItems` (private Map on PlayerState). They're cleared but never added to the corpse.
3. **Inventory is in-memory only.** `PlayerState.inventory` = `Map<string, InventoryEntry>`. No `player_inventory` table. Lost on disconnect. Stash IS persisted but inventory is not.
4. **Two parallel item type systems.** `RoomGraph.Item` (lightweight runtime: id, name, weight, description, equipSlot?) vs `@ellmud/shared ItemDefinition/ItemInstance` (registry/persistence). No bridging between them.
5. **Current ItemType enum lacks 'container'.** Types are: weapon, armour, consumable, material, tool, key.

**Architecture Decisions (Proposed):**
- 4-phase approach: inventory persistence → container type → death integration → world containers
- Keep CorpseSystem separate from container items (well-tested, zone-scoped lifecycle)
- Event-driven saves (not periodic) with 250ms debounce
- Max container nesting depth: 1
- `player_inventory` table mirrors `player_stash` schema for consistency

**Key File Paths:**
- Death handler: `packages/server/src/rooms/ZoneRoom.ts:2097-2260`
- CorpseSystem: `packages/server/src/systems/CorpseSystem.ts`
- DowningSystem: `packages/server/src/systems/DowningSystem.ts`
- DeathPenalty: `packages/server/src/systems/DeathPenalty.ts`
- PlayerState: `packages/server/src/state/PlayerState.ts`
- Item types (shared): `packages/shared/src/items.ts`
- Item types (runtime): `packages/server/src/generator/RoomGraph.ts:9-17`
- Item registry: `packages/server/src/items/registry.ts`
- Stash types: `packages/shared/src/types/stash.ts`
- DB schema: `packages/server/src/db/migrations/001_schema.sql`
- Loot command: `packages/server/src/commands/handlers/loot.ts`

**Deliverables:**
- Architecture proposal: `.squad/decisions/inbox/elminster-container-system.md`
- GitHub issue: #409
- 6 open questions for dkirby-ms on design decisions

### 2025-07-22: Creature Room Appearance Design (#383)
**Task:** Design spec for individual creature lines in room descriptions with ANSI tag support.

**Key Finding:** No schema migration or type changes needed. The `room_description` column already exists on `creature_definitions` (added by migration 009), and `roomDescription?: string` is already on `CreatureTemplate`, `Creature`, and `CreatureRef` interfaces. All seed creatures already have values. ANSI tag support (`[red]text[/red]`) works end-to-end via the client parser at `packages/client/src/lib/ansi-parser.ts`.

**Design Decision:** Rendering-only change. Replace creature aggregation-by-type logic (which shows `(xN)` counts) with a simple per-creature loop in 3 files:
- `packages/server/src/commands/handlers/look.ts` (lines 57-72)
- `packages/server/src/commands/handlers/go.ts` (lines 78-93)
- `packages/server/src/commands/handlers/goto.ts` (lines 84-99)

**Architecture Pattern:** Room rendering is duplicated across look/go/goto handlers — all three build creature lines identically. A future refactor could extract a shared `renderCreatureLines(creatures: CreatureRef[]): string[]` utility, but that's out of scope for this issue.

**Key File Paths:**
- Creature types: `packages/server/src/creatures/types.ts`
- Creature manager: `packages/server/src/creatures/CreatureManager.ts`
- Command context / CreatureRef: `packages/server/src/commands/index.ts:68-81`
- ZoneRoom context building: `packages/server/src/rooms/ZoneRoom.ts:1186-1222`
- Admin content store: `packages/server/src/admin/content/PgCreatureDefinitionsStore.ts`
- ANSI parser: `packages/client/src/lib/ansi-parser.ts`
- Seed data: `packages/server/src/db/migrations/002_seed_content.sql:84-150`

**Deliverable:** Full spec at `.squad/decisions/inbox/elminster-creature-appearance.md`, summary posted to issue #383.

### 2026-04-10: Optional User Flags Architecture (#365)
**Task:** Research and design optional user flags for player information visibility and roleplay indicators.

**Scope:** Two flags — [Anon] (hides username/level/class from non-roommates) and [RP] (visual indicator for roleplay engagement).

**Design Decisions (Approved):**
1. **Storage:** New `character_flags` table with JSONB `flags` column (not `players` table). Rationale: dedicated table for sparse optional data; JSONB allows Phase 2 extensibility without migrations.
2. **Flag definitions:** Hardcoded TypeScript enum in `@ellmud/shared` with `FLAG_DEFINITIONS` metadata (name, description, toggleable). Extensible via code; new flags need only enum addition.
3. **Toggle mechanism:** In-game command `/flag <name>` (e.g., `/flag anon`, `/flag rp`). No settings UI integration in v1.
4. **Visibility rules — [Anon]:**
   - Same room = visible (prevents abuse, information is inferred from proximity anyway).
   - Different room = generic description (e.g., "A mysterious figure").
   - Admin always sees truth (role='admin' bypass).
5. **Visibility rules — [RP]:** Always visible, no restrictions. It's a courtesy signal, not a mask.
6. **Server authority:** Server constructs player data for who/look responses; client receives only what server permits. No client-side filtering or data hiding logic.
7. **Data layer:** `CharacterFlagsRepository` interface with Postgres + InMemory providers (provider pattern, consistent with existing repo architecture like `UserSettingsRepository`).
8. **Migration 009:** Simple table creation + index. Idempotent. No seed data.

**Key Insight:** Flags are orthogonal to existing systems (combat, awareness, equipment). [Anon] applies *after* awareness tier is calculated (awareness still shows equipment descriptions, flags hide identity on top). Same-room exemption prevents anonymity from being an exploit vector in shared-room combat.

**Blockers & Dependencies:** None. Design is ready for implementation. Depends on shared types being extracted. Unblocks #366 (who list) which needs server-side visibility logic.

**Deliverable:** Full proposal (21.6K) at `.squad/decisions/inbox/elminster-user-flags-design.md` with data model, command syntax, visibility rules, repository interface, migration, tests, implementation checklist, and 5 open questions for dkirby-ms.

### 2025-01-14: User Config File System Research
**Task:** Research and design proposal for optional `.ellmudrc` user config file system (Issue #359).

**Scope:** DCSS-style player configuration to control display preferences, gameplay settings, keybindings, and macros.

**Current Surface Findings:**
- **Client:** localStorage persists 3 settings (fontSize, verbosity, narrationStyle) in Settings.tsx — no server sync, lost on logout
- **Server:** No `user_settings` table; `player_profile` schema holds only skills, equipment, carry weight (progression data, not preferences)
- **Architecture constraint:** Message-based (no Colyseus schema sync); all client-server communication via message types in `@ellmud/shared`
- **Auth model:** Token-based, `GET /auth/me` validates identity; no per-player settings endpoint yet

**Design Decisions (Approved):**
1. **Storage:** Server-primary (PostgreSQL `user_settings` table, JSONB `config` column) + client cache (localStorage). Rationale: server-authoritative prevents cheating (gameplay settings), persists across devices, survives logout.
2. **Format:** Plain-text `.ellmudrc` (user-facing, DCSS-inspired: `verbosity = standard`) stored as structured JSONB in DB (`{ "display": {...}, "gameplay": {...}, "accessibility": {...} }`). Phase 2 adds external file parsing.
3. **Sync:** HTTP API — `GET /api/user/settings` (load on login), `PUT /api/user/settings` (save on logout). localStorage as draft cache to avoid latency.
4. **v1 Scope:** Migrate existing 3 settings to DB + keybinds stub (store but don't wire to combat). Defer Lua macros, file import/export, presets to Phase 2.
5. **Authority Model:** Server-authoritative for gameplay settings (auto-attack, combat thresholds); client-trusted for cosmetics (fonts, colors, verbosity). Server echoes config on GET to validate client state.

**Architecture Pattern:**
- Similar to `PlayerProfileRepository` (interface + InMemory/Pg pattern)
- Migration 004: create `user_settings(player_id UUID PK, config JSONB DEFAULT '{}')`
- `UserSettingsRepository`: load/save + defaults + validation schema
- Auth routes: GET/PUT `/api/user/settings` (require Bearer token)
- Settings.tsx refactored to use API instead of direct localStorage

**Risk Analysis:**
- **Settings explosion:** v1 scoped to 6 essential options; code review gate before expansion
- **Gameplay exploits:** Server validates all gameplay settings; client-only for cosmetics
- **Sync latency:** localStorage cache reduces API calls
- **Unfinished keybinds:** Store in config but UI disabled ("Coming soon") — avoids re-work when combat input layer refactored

**Team Split:**
- **Frontend (2–3 days):** Settings service (GET/PUT wrappers), Settings.tsx refactor to API, localStorage → DB migration
- **Backend (1–2 days):** Migration, `UserSettingsRepository`, auth routes, validation schema
- **Estimated total:** 5 days, small scope, high UX value

**Decision Deliverable:**
- Full proposal posted to issue #359 as comment
- Decision doc: `.squad/decisions/inbox/elminster-user-config.md` (5100 words, storage architecture, format spec, v1 scope, risks, next steps, 3 open questions for user)

**Key Insights:**
- Existing localStorage pattern is client-only and breaks across devices — server persistence essential for multi-device play
- DCSS-style text config + JSON storage hybrid balances UX (players can edit plain text) + maintainability (JSON is queryable, versionable)
- v1 disciplined scope (migrate + stub) unblocks content team, avoids macro/Lua design yak-shaving
- Authority model (server validates gameplay, trusts cosmetics) parallels existing Colyseus pattern (server authoritative for game state, client for UI)

---

### 2026-04-08: Direction Shortcuts & Speedwalks Research
- **Task:** Research and design proposal for issue #357 — arrow key shortcuts + speedwalk command syntax.
- **Investigation:** Traced full client-server movement flow: CompassControl button → handleExitClick → sendRawCommand → parseCommand → handleGo. Mapped keyboard event handling in ZoneExploration.tsx, command parser aliasing (n→['go','north']), and server direction validation.
- **Current state:** Game supports 6 directions (n/s/e/w/u/d); compass renders 8 (ordinals missing from server). Text input currently handles arrow keys for command history (ArrowUp/Down).
- **Key design decision:** Client-side implementation for both features (zero server complexity). Phase 1: arrow key + numpad listener (50–100 lines, 2–4 hours). Phase 2: speedwalk parser (200–300 lines, 3–5 hours). Phase 3 (future): server-side speedwalk verb for atomic execution.
- **Feature 1 (Arrow Keys):** Map keyboard to directions; listener activates only when input not focused. Reuses existing `handleExitClick(direction)` flow. Numpad layout includes ordinals but server doesn't support them yet — decided to ignore ordinals in MVP, add in Phase 3 if design wants it.
- **Feature 2 (Speedwalk):** Parser expands `10e4n2s` to array of ['e','e',...,'n','n','n','n','s','s'], sends each as separate `go` command. Rate limit: 50 moves client-side. Fail-stop semantics: halts on first failure (wall, combat). Zero server changes for MVP.
- **Open questions identified:** 5 team decisions needed (ordinal support, numpad5 behavior, text focus handling, speedwalk feedback, combat interaction).
- **Deliverables:** Comprehensive proposal posted to issue #357; decision file `.squad/decisions/inbox/elminster-direction-shortcuts.md` with open questions, code sketches, testing checklist.
- **Key insight:** Classic MUD features like speedwalks translate beautifully to client-side parsing — no need for server state complexity. The server remains oblivious, processing each move normally. Keyboard shortcuts similarly benefit from client-side interception and existing callback reuse. Both features share the principle: client handles convenience, server handles authority.

### 2026-04-07: BFS Layout Engine Architecture Review
- **Task:** Full architecture review of `packages/client/src/map/computeLayout.ts` (2746 lines, BFS + 8 refinement phases).
- **Architecture:** BFS compass-aware placement → force-directed relaxation → diagonal cascade fix → direction violation repair → occlusion fix → iterative expansion + occlusion cleanup → final grid scaling. Pure function, no side effects.
- **Key strength:** Z-level isolation is excellent — each floor gets its own occupied set, sub-levels are anchored at entry points and expand independently. Grid cluster detection (perpendicular-path-convergence test) is mathematically sound.
- **Critical concern — scoring function duplication:** `layoutScore()` (L779) and `occlusionAwareScore()` (L1882) are ~95% identical, differing only in the occlusion penalty weight (3 vs 15). This is a DRY violation and a maintenance hazard — any future scoring change must be applied in two places.
- **Critical concern — O(n²) scoring on every candidate:** Every trial move in relaxation/occlusion phases calls `layoutScore(z)` which iterates all rooms × all exits × all rooms (for occlusion check). With pairwise swaps (O(n²) pairs), this is effectively O(n⁴) per iteration. The Siltgate test (59 rooms) takes 222ms — at 100+ rooms this will become a bottleneck.
- **Critical concern — diamond-search boilerplate:** The Manhattan-distance ring search pattern is copy-pasted 10+ times with varying radii. Should be extracted to a `generateDiamondCandidates(cx, cy, maxRadius)` generator.
- **Concern — magic numbers:** 23+ hardcoded limits (radius caps of 200, pass limits of 40/50/60/100, group size caps of 40/60/90, scoring weights 3/15/20/50) with no named constants or documented rationale.
- **Concern — GRID_STEP = 1:** The constant exists (L66) but is set to 1 (no-op multiplication). Commit `b7a86af` claims "add grid spacing" but the feature is effectively disabled. Either use it (set to 2) or remove the dead scaling loop at L766-768.
- **Good — test coverage:** 25 tests covering single rooms, corridors, grids, cycles, z-levels, collisions, disconnected subgraphs, direction correctness, and a real 59-room zone. Comprehensive.
- **Good — interface:** Clean `Map<string, LayoutRoom> → Map<string, RoomPosition>` contract. ELK adapter consumes it correctly, multiplying by GRID_SPACING for pixel coordinates.
- **Recommendation:** Decompose into ~5 files (types, helpers, BFS core, refinement phases, scoring). Extract the candidate-generation diamond pattern. Parameterize `layoutScore` with occlusion weight. Add named constants for all magic numbers.
- **Deliverable:** Full review written to `.squad/decisions/inbox/elminster-bfs-review.md`.

### 2026-04-07: Combat Sandbox Architecture Design
- **Task:** Design architecture for a combat sandbox dev tool inside the Refuge hub zone.
- **Analysis:** Read CombatSystem (tick-based encounter orchestrator), CreatureManager (template-based spawning), feature-room pattern (command gating by RoomType), Refuge zone structure (7-room hub-and-spoke from hearth), existing dev commands (goto, teleport, peaceful), RoomType dual-definition (shared + server packages), damage model (stance multipliers, dodge rolls, flanking, armour).
- **Decision:** Sandbox implemented as 3 feature rooms in the Refuge, not a new zone/Colyseus Room type. Follows the established feature-room pattern identically.
- **Architecture:**
  - 3 new RoomTypes: `feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats`
  - Lobby (browse/configure), Arena (fight), Stats Lab (inspect/tune) — separation enforces clean state boundaries
  - Same CombatSystem class with isolated instance — sandbox results reflect real combat
  - State isolation: no loot, no XP, no death penalty, no run history, HP reset on exit
  - CombatLogger (ring buffer, 200 ticks) for detailed numeric output — the core value proposition
  - Dev-gated via `getConfig().devModeEnabled` (same as peaceful)
- **Phased:** Phase 1 (spawn/fight/reset/log), Phase 2 (stat overrides/inspection), Phase 3 (scenario save/load/replay)
- **Key insight:** Feature rooms + `sandboxMode` flag on CommandContext is the minimal-surface-area approach. The sandbox doesn't need new Colyseus machinery — it needs command gating and side-effect suppression.
- **Deliverables:** `docs/design/sandbox-combat-arena.md` (full spec), `.squad/decisions/inbox/elminster-sandbox.md` (team decision)
- **Key lesson:** When designing dev tools for combat iteration, the value is in exposing the numbers the narrative layer hides — raw damage, dodge rolls, armour reduction. The combat resolution code should be shared (not duplicated), with only the lifecycle and side-effects differing.

### 2026-04-06: Migration Consolidation Design (001–022 → 4 files)
- **Task:** Design a consolidation plan to collapse 22 migration files into ~4 clean files for fresh-DB creation.
- **Analysis:** Read all 22 migrations end-to-end. Tracked every schema change, column rename, data insert, data update, topology fix, and inter-zone connection across the full migration history.
- **Key insight:** Migrations 011–020 are almost entirely renames and rewrites of data/columns created in 001–004. The consolidated version just uses final names/values, eliminating all ALTER/RENAME/UPDATE-after-INSERT patterns.
- **Proposed structure:** 001_schema.sql (27 tables, final column names), 002_seed_content.sql (factions, items, creatures with final names/stats), 003_seed_zones.sql (6 zones, 291 rooms, all exits), 004_reputation.sql (optional, could fold into 001).
- **Tricky spots documented:** Siltgate slug inconsistency (the-siltgate vs siltgate in 016), room description appends vs rewrites (019 overwrites all), idle tick multiplication (10x from 010), stronghold slug chains (013→016→017→022).
- **Deliverable:** `.squad/decisions/inbox/elminster-migration-consolidation.md`
- **Key lesson:** When consolidating migration histories, work backwards from the final state — track what each column/value IS, not what it WAS. Renames and updates become no-ops when you just use the final name from the start.

### 2026-01-19: Issue #317 — "Connect to Zone" Context Menu Design
- **Task:** Design spec for adding inter-zone portal creation to zone designer right-click menu
- **Research findings:**
  - Context menu currently offers 6 directional "Add Room" buttons, Edit Room, Copy/Paste Properties, Connect Exit, and Delete Room
  - Existing "Create Portal" button workflow already demonstrates the full UX pattern: zone picker → room picker → direction picker → API call
  - Portal exits use `target_zone_slug` + `target_room_slug` fields; `toRoomSlug` is set to `fromRoomSlug` (convention for portal exits)
  - Phantom portal target nodes already render in graph for horizontal-direction portal exits (cyan-colored, non-interactive)
  - API endpoint `POST /admin/api/zones/:zoneId/exits` accepts portal exit structure; no server-side validation of target zone/room existence
- **Design decisions:**
  - Extract existing portal dialog code to reusable `PortalDialog` component (eliminates duplication between button and context menu)
  - Add "Connect to Zone..." menu item with 🌐 icon after "Connect Exit..." option
  - Show non-blocking warning if direction already has exit (conflict detection) — admin may intentionally create overlapping exits for conditional logic
  - Skip undo/redo for MVP (existing portal button doesn't integrate with undo stack either — defer to future iteration)
- **Edge cases documented:**
  - Target zone with no rooms → disable Create button, show "No rooms in this zone yet" message
  - Direction conflicts with existing exit → show warning, allow creation (non-blocking)
  - Invalid target room slug → orphan exit created, handled by existing orphan cleanup tool
- **Reuse opportunities:** Portal dialog logic, direction conflict detection, zone filtering
- **Key lesson:** When adding context menu features, look for existing button workflows to reuse — the UX pattern and API calls are already proven. Extraction to shared components reduces duplication and makes future enhancements benefit all call sites.
- **Deliverable:** Design spec written to `.squad/decisions/inbox/elminster-connect-to-zone-design.md` (comprehensive spec with API details, UI flow, edge cases, code snippets, testing checklist)
- **Next:** Regis to review design, implement feature

### 2026-04-05 (Round 4): Triaging Issue #293 (LLM Narration Toggle)
- **Task:** Assess feature request for user-controlled LLM narration toggle (enable/disable)
- **Assessment:** Legitimate Phase 1 feature aligned with GDD §4.5 (LLM is optional fallback). Users may want to disable LLM for cost control, dev/test environments, or network constraints.
- **Design decision:** Implement via `ENABLE_LLM_NARRATION` environment variable (boolean). Factory-based control (not call-site checking) for cleanliness and performance.
- **Routing:** Assigned to Volo for implementation (owns NarrationService factory pattern from PR #292).
- **Outcome:** Volo implemented in PR #295. 9 tests, seamlessly integrates with fire-and-forget pattern. Ready for merge.
- **Key lesson:** Feature toggles for expensive services should gate instantiation (factory pattern), not individual calls. Cleaner code, better performance, easier to test.

### 2026-03-19: Colyseus Architecture Analysis
- **Decision:** Proposed adopting Colyseus 0.17.x as game-server framework with message-only client protocol (no Schema state sync to clients). Decision file: `.squad/decisions/inbox/elminster-colyseus-architecture.md`
- **Key pattern:** Colyseus supports a dual-channel architecture — Schema state for server internals + `onMessage`/`broadcast` for prose delivery. This resolves the tension between Colyseus's default state-sync model and the GDD's "prose-only client" requirement (§14).
- **Mapping:** Colyseus Room = Shard Instance (1:1). `setSimulationInterval(cb, 1000)` = 1s combat tick. Matchmaker = Shardboard. Reconnection tokens = latency tolerance model.
- **Risk identified:** Schema state leakage to clients is the critical failure mode. Must enforce at architectural level (custom client wrapper, integration tests, code review gate).
- **Risk identified:** Refuge Room scaling — single Colyseus Room caps at ~50-100 concurrent clients. Refuge needs sharding or a separate lightweight service.
- **Risk identified:** SSH/TCP support requires a gateway bridge service to proxy into Colyseus rooms.
- **Open:** Awaiting dkirby-ms input on SSH priority, Refuge architecture, admin tooling, client SDK choice.
- **Key files:** `GDD.md` (full game design), `.squad/decisions/inbox/elminster-colyseus-architecture.md` (this analysis)
- **User preference:** dkirby-ms suggested Colyseus specifically for WebSocket management, game state, and reconnect logic. Receptive to framework adoption.

### 2026-03-19: Azure Hosting Architecture
- **Decision:** Proposed full Azure architecture mapping all GDD components to Azure services. Decision file: `.squad/decisions/inbox/elminster-azure-architecture.md`
- **Platform directive:** dkirby-ms directed Azure as hosting platform and Azure AI Foundry for LLM model hosting.
- **Key services:** Container Apps (Consumption) for Colyseus game server, Azure AI Foundry serverless endpoints (GPT-4o-mini) for narrative LLM, PostgreSQL Flexible Server (Burstable B1ms) for player persistence, Azure Cache for Redis (Basic C0) for LLM cache + Colyseus presence.
- **Critical finding — LLM latency:** GPT-4o-mini TTFT (~1.75s median) far exceeds the GDD's 200ms combat narration target. Combat narration MUST be cache-first with template fallback. The LLM enriches cache asynchronously, not on the hot path. This is the single most important architectural insight for the narrative system.
- **Cost profile:** Phase 1 MVP estimated at ~$57-91/month. Container Apps scale-to-zero is critical for cost control during low-traffic periods.
- **Redis retirement risk:** Azure Cache for Redis (Basic/Standard/Premium) retiring September 2028. New creation blocked April 2026 for new customers. Migration to Azure Managed Redis (~$100-175/month minimum) is a Phase 2 cost increase to plan for.
- **LLM economics:** ~$0.006/player-hour with 50-70% cache hit rate. Content-addressable caching (SHA-256 hash of state snapshot → Redis key) is the primary cost control mechanism.
- **Phase 1 simplifications:** Single Colyseus replica, in-process matchmaker, no SSH gateway, GPT-4o-mini for all tiers, web terminal only.
- **Production-ready from day one:** Server-authoritative state, LLM template fallback, player data durability (PostgreSQL + backups), WebSocket reconnection, content-addressable cache key design.
- **Open:** Awaiting dkirby-ms input on Azure region, Redis cost tolerance, subscription/credits, Foundry access, auth strategy, custom domain, CI/CD pipeline.
- **Key files:** `.squad/decisions/inbox/elminster-azure-architecture.md` (this analysis), `.squad/decisions/inbox/elminster-colyseus-architecture.md` (Colyseus decision it builds on)

### 2026-03-19: GDD Comprehensive Architecture Update
- **Action:** Updated GDD.md to codify all architecture decisions from this session into the source-of-truth document.
- **Sections updated:**
  - §Platform — Changed to "Web browser only", removed SSH/TCP references.
  - §2.1 The Refuge — Added "The Refuge as a Living World" subsection: RefugeRoom with tick-driven ambient simulation (NPC activity, faction events, wandering merchants, weather).
  - §4.5 Caching & Performance — Complete rewrite with Azure AI Foundry specifics: GPT-4o-mini, 1.75s TTFT reality, SHA-256 content-addressable Redis cache, 3-tier timeout budgets (800ms/2s/3s), token economics (~$0.006/player-hour), narration pipeline flow.
  - §13 Technical Architecture — Major rewrite. Replaced generic architecture with concrete Colyseus 0.17.x + Azure Container Apps stack. Added ASCII architecture diagram, service map, data flow diagram, Room architecture (ShardRoom/RefugeRoom 1:1 mapping), message-only client protocol, Schema state isolation, admin dashboard design, tick model, horizontal scaling, Redis presence, deployment pipeline (GitHub Actions + Bicep), player auth strategy, custom domain.
  - §13.5 Networking — WebSocket-only via Colyseus, reconnection via allowReconnection(30-60s), disconnected players dodge.
  - §13.6 Hosting & Deployment — New section: Azure service table with Phase 1 costs (~$40-75/month with unmanaged Redis), CI/CD pipeline, Bicep IaC, region choice.
  - §14 Anti-Cheat — Updated to reference room.send("narrate") and Schema patches.
  - §17 Roadmap — All four phases updated to reflect concrete stack. Phase 1 now includes infrastructure provisioning, Colyseus scaffold, LLM pipeline, auth, admin dashboard. SSH gateway permanently removed. OAuth bolt-on moved to Phase 4.
  - §18 Open Questions — Updated LLM economics question with concrete cost data.
- **Key decisions codified:** Colyseus 0.17.x, message-only client protocol, Schema server-internal only, Azure Container Apps (Consumption), GPT-4o-mini via Foundry serverless, PostgreSQL Flexible, unmanaged Redis container, GitHub Actions + Bicep, East US 2 / West US 2, kirbytoso.xyz domain, simple auth Phase 1 with OAuth-ready schema, admin dashboard from day 1.
- **Preserved:** All existing GDD content not replaced by concrete decisions. Cardinal rule "The LLM describes; the server decides" remains in §4.1 and now also §13.1.

### 2026-03-19: GDD Roadmap Decomposition into GitHub Backlog
- **Action:** Decomposed GDD §17 Roadmap into granular, implementable GitHub issues across all four phases.
- **Output:** Two files generated in `.copilot/session-state/15d4fe47-09fd-48dd-9476-570c154a96d1/files/`:
  - **backlog-issues.json**: 81 total issues (18 Phase 1, 12 Phase 2, 16 Phase 3, 10 Phase 4, 3 cross-phase testing), each with title, body (acceptance criteria + GDD section references + dependencies), labels (phase + domain), and milestone.
  - **backlog-summary.md**: Human-readable table grouped by phase, showing issue titles, domain labels, dependencies, and scoping notes.
- **Key scoping decisions:**
  1. **Phase 1 MVP (8–10 weeks):** Solo play only. Single creature type (Drowned Revenant). Single biome (Flooded Crypt). Tier 1 shards (15–25 rooms). Focus on core loop: login → loadout → enter shard → combat → extract → stash persists. LLM narration cached or template-fallback (no combat latency). Admin dashboard wired from day 1 (Schema visibility for debugging). Message-only client protocol enforced (integration tests verify no Schema patches leak).
  2. **Phase 2 Multiplayer (6–8 weeks post-Phase 1):** Multi-player infrastructure (Redis presence + KEDA scaling). Sound propagation. Traces (footprints, blood, decay TTLs). PvP encounters. Death & downing. Ambient Refuge (NPCs, weather, faction events). WebSocket reconnection tuning. Proximity communication (say, whisper, emote). Entry: multi-replica load test + PvP smoke tests.
  3. **Phase 3 Depth (8–12 weeks post-Phase 2):** Full skill tree (6 categories, 20+ skills, use-based leveling). Crafting system (recipes, materials, quality variance). All 5 biomes. Shard modifiers (1–3 per shard). Tier 2 & 3 shards. Creature variety (5+ per biome). Faction system (reputation, rank, recipes, perks). Standalone matchmaker separation. Marketplace (direct trade + player posts). Faction world events. Contracts. Seasonal rotations. Optional: GPT-4o quality tier.
  4. **Phase 4 World (6–8 weeks post-Phase 3):** OAuth integration (GitHub, Discord, Entra ID). Anomalous-tier gear. Lore & narrative arcs. Quest chains. Refinement phase; gameplay largely complete, focus on polish and long-term engagement.
  5. **Testing:** QA issues per phase ensure progressive verification (solo → multiplayer → depth → world).
- **Dependency Enforcement:**
  - Critical path: Infrastructure (#1–3) → Colyseus scaffold (#4) + room graph (#5) → combat (#6–7) → movement (#8) → extraction (#10) → integration test (#19).
  - Phase 2 gating factor: Multi-player infrastructure (#21). After: sound, traces, awareness can parallelize.
  - Phase 3 parallelization: Skill tree + crafting independent until factions; biome work independent until faction recipes.
  - Phase 4: Mostly refinements; heavy parallelization.
- **GDD Alignment:** Every issue references relevant GDD sections (§N notation). All issues preserve core design pillars: server authority, LLM as narration layer, message-only client, Colyseus 0.17.x, Azure stack, content-addressable cache, sound as PvP detection, traces as espionage, factions as economy drivers.
- **Architecture Preservation:** Schema state leakage prevention (client integration tests), LLM fallback path (combat never blocks on LLM), tick model (1s for combat/exploration, 3–5s for background AI), reconnection tokens (30–60s window), Redis content-addressing (SHA-256 hashing state snapshots), zone of exclusion for secrets (no auth secrets in client code).
- **Risk Mitigations Embedded:**
  - Phase 1: Admin dashboard schema visibility (day 1, not retrofitted).
  - Phase 1: Message-only protocol enforced (integration tests + code review gate).
  - Phase 2: Redis presence wired Phase 1 (no rework on scale-out).
  - Phase 2: Sticky sessions explicitly tested (WebSocket routing to correct replica).
  - Phase 3: Creature behavior AI deterministic + testable (same resolution as player actions).
  - Phase 4: OAuth schema prepared Phase 1 (zero breaking changes on bolt-on).
- **Total Backlog:** 81 issues, estimated 28–38 weeks end-to-end (1 full-time dev). Linearly scalable to team size.
- **Open Questions Captured:** 5 questions for stakeholder review (Phase 1 scope, Phase 2 timing, skill respec economy, anomalous item gating, seasonal leaderboard frequency, OAuth timing).

### 2026-03-19: Figma Export Conversion Strategy
- **Action:** Audited Figma AI prototype export (`/tmp/figma-export/`) and produced comprehensive conversion strategy at `docs/figma-conversion-strategy.md`. Decision filed at `.squad/decisions/inbox/elminster-figma-conversion.md`.
- **Figma export quality:** Visual design is production-quality — colors, typography, layout proportions all match the GDD design prompt exactly. Code quality is scaffold-tier: hardcoded hex colors throughout (not using theme tokens), inline `style={{ fontFamily }}` everywhere, all data mock, zero state management or server integration. 6 screens, 3 tab components, 48 shadcn/ui primitives (mostly unused).
- **Key finding — NarrativeEntry types:** The ShardExploration component defines `room | combat | trace | sound | system | speech` entry types that map directly to the server message categories. This validates the message protocol design.
- **Key finding — Combat overlay pattern:** The conditional combat action bar rendering in ShardExploration is the correct UX pattern for transitioning between exploration and combat without leaving the narrative view.
- **Decision — Keep visual design, rewrite implementation:** The layouts and visual patterns are the reusable asset; the code logic is 100% replaced. Every page needs: mock data removed, Colyseus message handlers, state management hooks, loading/error states.
- **Decision — State management:** React Context + useReducer (no external library). The client is a thin view layer over server-authoritative state. ~10 state slices. Migration to Zustand available if needed.
- **Decision — Colyseus integration:** Message-only pattern. Client MUST NOT subscribe to `room.state`. All state via `onMessage()` handlers. Schema leakage prevention enforced at architecture level.
- **Decision — Dependency reduction:** ~55 → ~22 packages. Drop all MUI (conflicts with Tailwind), 12 unused Radix primitives, 15+ scaffold deps. Add only `colyseus.js`.
- **Decision — Theme token migration:** Phase A prerequisite. All hardcoded hex values → Tailwind theme tokens. Inline fontFamily styles → Tailwind utilities. The theme.css already defines correct tokens — page components just don't use them.
- **Decision — File placement:** `packages/client/` in monorepo. `packages/shared/` for message types shared with server.
- **Phased plan:** A (Foundation, weeks 1-2) → B (Core Screens, weeks 3-5) → C (Gameplay, weeks 6-8) → D (Polish, weeks 9-10).
- **Key files:** `docs/figma-conversion-strategy.md` (full strategy), `.squad/decisions/inbox/elminster-figma-conversion.md` (architectural decisions).

### 2026-03-19: Figma Export v2 Analysis
- **Action:** Comprehensive analysis of updated Figma export v2 responding to the gap-fill brief. Analysis document: `docs/figma-v2-analysis.md`.
- **What the design team delivered:** Three new production-quality overlay components (ChatPanel, ExtractionOverlay, InventoryOverlay) addressing §2D, §2C, §2B from the brief. Combat UI implemented inline in ShardExploration. Sound cues panel added to sidebar.
- **Coverage scorecard:** 55% of requested items fully or partially addressed (11/20), 45% missing (9/20). High-value items delivered: chat/social panel, extraction flow (all 3 states), inventory/loadout overlay.
- **Key finding — Zero new dependencies:** v2 has the exact same 55 dependencies as v1. No new bloat. All new components built with existing React/Lucide/Radix primitives.
- **Key finding — Theme tokens infrastructure added:** v2 theme.css grew from ~2K to 3.1K. Added `@theme inline` block exposing all color/typography tokens for Tailwind utilities (Tailwind v4 pattern). Tokens now cover tier colors, state colors, typography scale, font weights. BUT: No components migrated to use tokens yet — still all hardcoded hex values.
- **Key finding — Overlay architecture pattern:** All three new components use state-discriminated rendering (null | state string → different UI trees). Clean pattern for modal overlays. Props drive UI (isOpen, state, progress), callbacks for dismissal (onClose). Stateless, reusable, wire-able to Colyseus.
- **Key finding — Tier color modeling:** InventoryOverlay introduces `Item` interface with `tier` enum (common/sturdy/refined/masterwork/anomalous). `getTierColor()` function maps tier to hex. This is new modeling work (not in v1). Should be extracted to shared utils.
- **Remaining gaps:** 12 items still missing. High-priority (3): reconnection overlay, enemy status panel, tick timer. Medium-priority (4): mini-action buttons, ambient events feed, auto-complete hint, trade interface. Low-priority (5): button state variants, HP bar states, toasts, empty states, responsive breakpoints.
- **Impact on conversion strategy:** Phase C (Gameplay) shrinks from 3 weeks → 2.5 weeks due to overlay scaffolds. Total estimate: 10 weeks → 9.5 weeks (5% time savings). Phase A (Foundation) and Phase B (Core Screens) unchanged.
- **Combat UI implementation:** Combat banner (⚔ COMBAT with blood-red border), action quickbar (7 buttons with keyboard shortcuts 1-7), sound cues panel all inline in ShardExploration. No separate component. Works functionally but needs enemy status panel and tick timer added (Phase C work).
- **Decision — No further design iterations needed:** The remaining gaps are small enough to build in-house during Phase C/D. Patterns are clear from existing components. Proceed with conversion using v1 + v2 combined as design source.
- **Decision — Phase A priority:** Migrate all hardcoded hex → theme tokens BEFORE starting Phase B. The Tailwind v4 @theme inline block is ready — just need find-replace gruntwork across all components.
- **Open for Phase C:** Add enemy status panel (sidebar, during combat), tick timer (below combat banner), reconnection overlay (full-screen). Add trade interface to ChatPanel. All other gaps are Phase D polish or post-MVP.
- **Key files:** `docs/figma-v2-analysis.md` (full analysis with gap scorecard, component deep dives, theme audit, remaining gaps list).

### 2025-07-25: Wave 4 PR Reviews (PRs #80, #81, #82, #83)
- **Action:** Code review of four Wave 4 PRs. All four approved.
- **PR #80 — Stash Persistence Wiring (Drizzt, #11):** APPROVED. Clean singleton provider pattern (`stash-provider.ts`). Rooms share repository via `getStashRepository()`/`getItemDefs()`. Health and admin endpoints report backend. 14 tests. No issues.
- **PR #81 — Room Graph Topology (Jarlaxle, #5 reopened):** APPROVED. Critical fix — room types now enforce structural semantics. Dead-ends = exactly 1 exit (branched off backbone), junctions = ≥3 exits (post-distance-enforcement). Guaranteed ≥1 dead-end per graph. 7 tests across multiple seeds. Post-processing order matters: distance cuts → junction enforcement.
- **PR #82 — Creature Admin Visibility (Jarlaxle, #7):** APPROVED with minor notes. `AdminCreatureInfo` type, `/admin/api/creatures` endpoint, creature data in shard detail, SSE creature counts, dashboard HTML table. Minor: `(room as any)['creatureManager']` pattern duplicated 3 times — accessing private field for admin inspection is acceptable per GDD §13.4 but the inline type cast should be extracted to a helper.
- **PR #83 — Extraction State Messaging (Drizzt, #10):** APPROVED. All 4 EXTRACTION_STATE phases wired (started/progress/interrupted/completed). The `wasExtracting` → `isExtracting` detection pattern for 'started' is clean. `interruptAll()` return value now wired to per-player interruption messages. 9 protocol tests.
- **Cross-system assessment:** All 4 PRs modify non-overlapping code paths and are architecturally compatible. PRs #80 and #83 both touch ShardRoom.ts but in different methods — will merge cleanly. Room topology (#81) gives creature behavior (#82) meaningful patrol semantics. Extraction messaging (#83) works correctly with stash transfer (#80).
- **Lesson:** The `as any` bracket-access pattern for admin inspection of private fields is an acceptable compromise for debugging visibility, but duplication should be controlled — extract to a typed helper or add a public admin-only accessor method.

## Wave 4b Completion — PR Review Gate + All Phase 1 Server Complete (2026-03-20T22:11Z)

**Status:** ✅ Complete  
**Role:** Lead / Architect  
**Task:** Review PRs #80–#83 for architecture, cross-system integration, test coverage  
**All Approved:** No rejections, no architecture regressions

### Decisions Made

#### 1. Stash Persistence Pattern (PR #80 — Drizzt, #11)
- **Decision:** Singleton provider pattern is correct for server-wide state
- **Rationale:** Rooms consume via accessor functions; tests bypass via initStash()
- **Impact:** Extraction transfer, creature loot, persistent DB all share same repository
- **Status:** APPROVED

#### 2. Room Type Topology Enforcement (PR #81 — Jarlaxle, #5)
- **Decision:** Room types now structurally enforced
- **Semantics:** dead_end=1 exit, junction≥3 exits
- **Foundational:** Creature AI, minimap, movement all rely on these guarantees
- **Minor note:** Monitor ensureJunctionExits() at Tier 3 (60 rooms) — may need BFS caching
- **Status:** APPROVED

#### 3. Admin Dashboard Creature Visibility (PR #82 — Jarlaxle, #7)
- **Decision:** `as any` bracket-access acceptable for Phase 1
- **Follow-up:** Before Phase 2, extract to typed getAdminSnapshot() method
- **Status:** APPROVED with phase-2-note

#### 4. Extraction State Messaging (PR #83 — Drizzt, #10)
- **Decision:** `wasExtracting` detection pattern is correct
- **Why:** Decouples command handler from protocol messaging
- **Integration:** Works correctly with stash (#80) and doesn't block creatures (#82)
- **Status:** APPROVED

### Cross-System Integration Verdict
All four PRs merge cleanly to dev:
- Stash provider (#80) + extraction transfer (#83) share same repository
- Room topology (#81) enables creature patrol (#82)
- Admin dashboard (#82) reports stash backend

### Phase 1 Server Block Complete
**Issues Closed:** #2, #3, #5, #7, #9, #10, #11, #18
**Test Coverage:** 949 server + 80 shared = 1029+ passing
**Infrastructure:** Production-ready

---

**Recommendation:** Server block complete. Next: Phase 1 client UI batch (#66–#75) or Phase 2.

### 2025-07-25: Content Admin Tool Design Document
- **Action:** Created comprehensive design document at `docs/content-admin-tool.md` (1,463 lines) for a designer-facing content management tool, separate from the existing debug/admin dashboard.
- **Key architecture decision:** Content admin tool is a separate container (React + Express) in the same Container Apps Environment, sharing the PostgreSQL instance but introducing its own `content_*` tables. Does NOT use Redis — Redis remains game-server-only.
- **Content domains covered (12):** Creatures, Items, Biomes, Shard Modifiers, Loot Tables, Skills, Factions, Room Templates, Narrative Templates, Balance Constants, Contracts (Phase 4), Crafting Recipes (Phase 3).
- **Data flow:** Content Admin → PostgreSQL (content tables) → Game Server reads at startup / hot-reload / shard seeding. Atomic content snapshots for deployment and rollback.
- **Content lifecycle:** Draft → In Review → Published → Deprecated, with version history per entry and atomic deployment snapshots.
- **Integration pattern:** Game server gets `POST /admin/api/content/reload` endpoint for hot-reload. Backward compatible — falls back to hardcoded TypeScript content when content tables are absent.
- **Key files:** `docs/content-admin-tool.md` (the design document), `.squad/decisions/inbox/elminster-content-admin-tool.md` (team decision).
- **Audience:** Document is designed for UI/UX designers creating Figma mockups — includes ASCII wireframes for every major screen, field-level detail for every content type, and component descriptions.
- **GDD relationship:** This tool is NOT the admin dashboard described in GDD §13.3 (which is a debug/inspection tool using Colyseus Schema sync). This is a content authoring tool that feeds content into the game.

### 2026-03-21: UX Overhaul Code Review (squad/ux-overhaul branch)
- **Action:** Reviewed 149-file, ~21K-line UX overhaul branch. Figma SPA conversion with Tailwind CSS 4, shadcn/ui, React Router 7, and Colyseus wiring for Shard and Refuge pages.
- **Verdict:** Conditional approval — two blockers must be fixed before merge.
- **🔴 Blocker #1 — Rules of Hooks violation in Refuge.tsx:** `useCallback`, `useReconnection`, `useRef`, `useEffect` called after conditional early return. React will crash on auth state transitions. Fix: remove redundant auth guard (ProtectedRoute handles it).
- **🔴 Blocker #2 — Combat action values don't match server protocol:** ShardExploration sends display labels ("Strike", "Heavy Strike") but CombatAction expects snake_case ("strike", "heavy_strike"). Combat is non-functional. Fix: separate labels from action values.
- **🟡 Should fix:** Admin routes unprotected (no ProtectedRoute wrapper), no token validation on page load, no error boundaries, extraction_state handler registered outside connect(), reconnection "Return to Refuge" dispatches LOGOUT.
- **Architecture validated:** Message-only Colyseus protocol correctly enforced (zero Schema leakage). React Router structure sound. AppContext+RouterProvider integration correct. Token persistence pattern clean.
- **Key files:** `.squad/decisions/inbox/elminster-ux-review.md` (full review verdict).

## 2026-03-21: UX Overhaul Branch Code Review

**Session:** Post-wave-7 sprint review  
**Scope:** 149 files, ~21K lines (squad/ux-overhaul branch)

**Review focus:**
- Figma SPA conversion (11 screens, dark fantasy theme, responsive layout)
- Colyseus client integration (message-only protocol, no Schema leakage)
- React Router migration (route hierarchy, protected routes, error handling)
- Auth flow and token persistence
- Reconnection strategy and overlay integration

**Verdict:** 🟡 **CONDITIONAL APPROVAL** — Two blockers, five should-fixes, five notes

**Blockers identified:**
1. Rules of Hooks violation in Refuge.tsx (hooks after conditional return) → ✅ Fixed by Volo
2. Combat action values don't match protocol in ShardExploration.tsx (labels vs enum) → ✅ Fixed by Jarlaxle

**Should-fixes (filed as Phase 1.1+ issues):**
- Admin routes lack auth guard
- No token validation on page load
- No error boundaries
- `extraction_state` handler late registration
- Reconnection button behavior inconsistency

**Architecture findings:**
- Message-only Colyseus protocol correctly enforced throughout
- Connection service is clean single integration point
- AppContext wrapping provides context across routes
- Token persistence and reconnection patterns are sound
- Protocol contract split across `connect()` and `.then()` — consolidation recommended

**Notes for future work:**
- Hardcoded hex values (theme tokens unused) — recommend migration pass
- ShardboardTab mock data misleading to testers
- 48 shadcn/ui components with low utilization — pruning candidate
- 450 skipped tests for old components — cleanup candidate
- Bundle size optimization (code-split admin routes)

**Outcome:** Conditional approval granted. Two blockers fixed post-review. Branch ready for merge after final validation.

### 2026-03-22: Comprehensive UX Design Alignment Review
- **Action:** Full screen-by-screen audit of all 12 screens/overlays against 4 design spec documents.
- **Findings:** 38 total gaps: 2 critical, 24 moderate, 12 minor.
- **🔴 Critical #1 — Theme token adoption:** 478 hardcoded hex values across 13 files, zero theme tokens used. `theme.css` @theme inline block exists but is completely unused.
- **🔴 Critical #2 — Combat text not color-coded:** Spec requires hits dealt in gold (#C9A84C), hits taken in red (#8B2500), dodges in silver (#8A8B95). Implementation renders all combat text uniformly in bone white (#E8E0D0).
- **Screens fully aligned:** Login, Settings match spec precisely. Extraction overlay is 90%+ aligned.
- **Screens with gaps:** ShardExploration (10 gaps — most of any screen), Refuge (6 gaps, mostly Phase 2 stubs), Combat (4 gaps), all others 1-3 gaps.
- **Systemic issues:** Inline `style={{ fontFamily }}` on every text element instead of Tailwind utility classes; button state variants not systematically defined; no responsive breakpoints; no atmospheric empty states; toast notifications not styled per spec.
- **All hex values match spec:** Every hardcoded color is correct — #0A0B0F, #12131A, #C9A84C, etc. One non-spec color: #B89840 used for button hover (reasonable approximation). The palette is consistent by accident (same hex everywhere) but unmaintainable.
- **Font strategy is correct:** Serif (Crimson Text) for narrative, mono (JetBrains Mono) for commands/system, sans (Inter) for UI chrome. No font mismatches found.
- **Key files reviewed:** All 6 pages, 7 overlay/tab components, theme.css, styles.css, store.ts, App.tsx, routes.ts.
- **Decision output:** `.squad/decisions/inbox/elminster-ux-alignment-review.md`
- **Prioritized fix batches:** (1) Theme token migration, (2) ShardExploration combat/sidebar polish, (3) Overlay refinements, (4) Structural gaps, (5) Minor polish.
**Next:** Phase 2 planning — content admin tool design ready (docs/content-admin-tool.md), implement per priority.

## Learnings

### 2026-03-21: Batch A Phase 1 Client UI Review (#84–#88)
**Context:** Reviewed 5 PRs for Phase 1 client UI: Button (#84, Drizzt), Toast (#85, Jarlaxle), Clickable Exits (#86, Volo), Shardboard (#87, Volo), Reconnection Overlay (#88, Drizzt).

**Key findings:**
- **Test quality across all 5 PRs is excellent.** Every PR has meaningful behavioral tests with proper assertions, not just smoke tests. Multi-layered testing (unit, component, integration) where appropriate.
- **Accessibility is consistently strong.** ARIA attributes, role attributes, keyboard support, aria-live regions.
- **CSS variable compliance is inconsistent.** PR #87 (Shardboard) had 10+ hardcoded hex values where exact CSS variable equivalents exist (e.g., `#12131A` instead of `var(--bg-panel)`, `#C9A84C` instead of `var(--accent)`). PRs #84 and #88 had minor hex values for interactive states that lack existing variables.
- **Pattern consistency is good.** Components follow BEM naming, use TypeScript interfaces for props, export named functions.

**Decision:** Rejected #87 for systemic CSS variable violations. Approved #84/#88 with notes on minor hex values. Clean approval for #85/#86.

**Enforcement note:** The team decision "All future screens must use `:root` variables; no hardcoded colors" needs teeth. Three of five PRs had some level of hex leakage. May need a CSS lint rule.

### 2025-07-25: Batch B PR Review — Phase 1 Client UI (PRs #89–#93)
- **Action:** Code review of 5 Wave 7 client UI PRs for code quality, pattern consistency, CSS compliance, accessibility, and correctness.
- **PR #89 — Loading & Transition States (Drizzt, #71):** ✅ APPROVED. 4 transition components (RoomTransitionLoader, ShardEntryLoader, CombatInitiationBanner, LongRunningIndicator). 300ms minimum display time, 2s auto-dismiss, 5s cancel threshold. All CSS uses theme variables — zero hardcoded hex. 27 tests with behavioral verification. Excellent accessibility (role="status", role="alert", aria-labels). Clean PR.
- **PR #90 — Shard Exploration Sidebar & Combat Overlay (Jarlaxle, #66+#70):** ❌ REJECTED. Massive PR (24 files, 135 tests, 1200+ lines CSS). Components and logic are excellent — CombatOverlay with keyboard shortcuts, ShardSidebar with sound cues + timer, ReconnectionOverlay with exponential backoff, ShardCard with countdown. Store properly extended. However: **~23 hardcoded hex values in CSS** violating team decision (no hardcoded colors). Values like #12131A (=--bg-panel), #C9A84C (=--accent), #4682B4 (=--loot-refined), #7B4FA0 (=--loot-masterwork) have direct theme variable equivalents. Also: duplicate `.reconnect-overlay` CSS block (copy-paste). Also need new theme variables for: --border-subtle (#2A2B35), --border-hover (#3E3F4C), --accent-hover (#d4b35a), --hp-badly-wounded (#cc4400), --border-dark (#222). **Assigned to Drizzt for CSS variable migration.**
- **PR #91 — Refuge Hub (Jarlaxle, #68):** ⚠️ APPROVED WITH NOTES. 7-tab tabbed navigation matching issue spec exactly. Controlled component pattern (parent manages tab state). 59 tests. Stub panels appropriate for Phase 1 scaffold. 1 minor hex: #d4b35a hover state. Clean accessibility (tablist/tab/tabpanel pattern). Tab names match issue spec per decisions.md.
- **PR #92 — Extraction Screen (Drizzt, #72):** ⚠️ APPROVED WITH NOTES. Discriminated union props pattern for 3 phases (extracting/success/failure). Shared extraction-types.ts. 52 tests. Proper accessibility. 1 minor hex: #d4b35a hover. Minor: `formatTime()` duplicated across ExtractionSuccess and ExtractionFailure — should extract to shared util.
- **PR #93 — Chat & Social Panel (Volo, #73):** ✅ APPROVED. ChatPanel with channel filtering + @mention highlighting. PlayersNearby with faction icons. TradeRequest with auto-decline timer. 78 tests. Zero hardcoded hex. Clean accessibility. Good edge case handling (empty states, char counter warning).
- **Cross-PR assessment:** PR90 is the only blocker. The CSS variable violation is extensive (~23 instances) and directly contradicts the team's established design token policy. Fix is mechanical (find-replace hex → var()) but some new :root variables are needed. All other PRs meet the quality bar.

### 2026-03-22: PR #104 Review — UX Batch 2 Combat/Sidebar Polish
- **Action:** Code review of PR #104 (Volo implementation, Drizzt test regex fix, Minsc anticipatory tests). 7 files, +705/-13 lines.
- **Verdict:** ✅ APPROVED. All 10 UX gaps correctly addressed. 101/101 client tests pass. Zero regressions.
- **Regex fix validated:** `^\d*\s*${label}$` with `i` flag correctly anchors to prevent substring matching (e.g., "Strike" no longer matches "Heavy Strike"). Safe for all 8 current action labels.
- **Quality notes:** healthState DRY pattern (one computation, two render sites). Theme tokens used consistently. Data attributes enable precise test targeting. State extensions minimal and well-typed.
- **Minor nits (non-blocking):** Unused `DIRECTIONS` const (dead code), stability bar color logic duplicates `getCollapseColor()` thresholds (DRY opportunity), standalone Skill test uses unanchored regex.
- **Key files:** `packages/client/src/pages/ShardExploration.tsx`, `packages/client/src/store.ts`, `packages/client/src/__tests__/ux-batch2-combat-sidebar.test.tsx`
- **Decision output:** `.squad/decisions/inbox/elminster-pr104-review.md`

### 2026-03-23: PR #119 Review — Awareness & Stealth
- **Action:** Code review of PR #119 (Drizzt implementation).
- **Verdict:** ❌ CHANGES REQUESTED. Core logic is correct but integration is incomplete.
- **Issues:** Hardcoded zero stats in ShardRoom (feature disabled), missing PlayerState updates for skills/equipment, tests verify local helpers not implementation.
- **Key files:** packages/server/src/systems/AwarenessSystem.ts, packages/server/src/rooms/ShardRoom.ts, packages/server/src/__tests__/awareness-stealth.test.ts

---

## Wave 2 Complete — All Issues Shipped (2026-03-23)

**Status:** ✅ Complete — PR #119 re-reviewed and approved, dev → uat promotion (PR #120) complete

**My review cycle on PR #119:**
1. **Initial review:** ❌ CHANGES REQUESTED
   - Found hardcoded stealth: 0, awareness: 0 in ShardRoom — system non-functional
   - PlayerState missing skills/equipment fields
   - Tests verifying local helpers, not AwarenessSystem implementation
   - Forwarded to Jarlaxle with requirements

2. **Re-review after Jarlaxle fixes:** ✅ APPROVED
   - PlayerState now carries `skills: { stealth, awareness, tracking? }` and `equipment: VisibleEquipment | undefined`
   - ShardRoom.runAwarenessChecks() correctly reads real data from PlayerState
   - Tests rewritten to verify AwarenessSystem logic directly (75 tests passing)
   - All acceptance criteria met

3. **Deployment notes**
   - Performance monitoring needed: awareness checks are O(N) where N = players in room
   - Client rendering of narrative messages should be validated
   - Formula `awareness - stealth` with thresholds (0, 5) locked and exported as constants

**Wave 2 verification:**
- Issue #22 (Sound): ✅ 33 tests, per-room BFS functional
- Issue #23 (Trace): ✅ 34 tests, TTL decay + skill scaling working
- Issue #25 (Awareness): ✅ 75 tests, detection formula + equipment narration working
- Total: 1084+ tests passing, zero regressions, all systems production-ready

**Key pattern:** Code review caught that hardcoding game stats at the system layer breaks integration. The fix (PlayerState as source of truth) establishes the pattern for all Phase 2 systems. Jarlaxle's decision doc on PlayerState ownership is reference material.

**Phase 2 readiness:** UAT branch now has all Wave 2 systems. Phase 2 QA (Minsc) can begin testing. All systems follow the same architecture: pure logic classes, ShardRoom wiring, state passed as params.


---

## Phase 2: Code Review (2026-03-23)

### Review Cycle: All 4 PRs Reviewed (Round 1, 2, 3)

**PR #124 (Matchmaker):** ✅ APPROVED Round 1
- Clean design, 0 regressions, ready immediately

**PR #122 (PvP Combat):** ❌→❌→✅
- Round 1: Missing shard-sickness integration in acceptance criteria
- Round 2: Stale DowningSystem reference after rebasing
- Round 3: Approved after wiring complete + merge conflicts resolved

**PR #125 (Death & Downing):** ❌→✅
- Round 1: killingBlow + ShardSickness not wired into game loop
- Round 2: Approved after Drizzt wired both systems + E2E test added

**PR #123 (Refuge Ambient):** ❌→❌→✅
- Round 1: Stale system exports (DowningSystem/ShardSickness not in branch)
- Round 2: TypeScript build failure (WEATHER_TRANSITIONS enum type)
- Round 3: Approved after stale exports removed + types fixed

### Review Standards Locked

1. Acceptance criteria verified against implementation (not just PR body claims)
2. All wiring required (pure logic classes must be instantiated + called)
3. Integration tests required (end-to-end feature validation)
4. Build must pass (TypeScript types resolve, no circular deps)

### Phase 2 Complete
- ✅ All 4 PRs reviewed, 5 rejection rounds caught issues early
- ✅ Final approvals: 2026-03-23T0100Z–0106Z

---

## Phase 2.5: Admin Audit Decomposition (2026-03-23)

### Admin Screen Audit Results (Minsc)

**Finding:** All 25 React admin pages render hardcoded mock data with ZERO API integration.
- 27 dead buttons (Save/Submit, Deploy, Bulk Actions, Pagination, etc.)
- 8 non-functional cosmetic forms (data lost on refresh)
- 12 mock data lists (Dashboard, entity lists, etc.)
- 3 stub pages ("Coming soon": Balance, Contracts, Recipes)
- 8 orphan server endpoints (implemented but no client calls them)
- 1 stub server endpoint (Spawn only broadcasts chat)

**Architecture Assessment:**
The admin UI was built as a purely visual scaffold. It's not broken—it's incomplete. This is Phase 2.5 work: wire the client UI to existing/new API endpoints.

### Phase 2.5 Decomposition Strategy

**Principle:** Group by functional area + dependency order, not by individual button.

**Issue Structure (12 issues total):**

1. **#139 FOUNDATIONAL**: Content CRUD API endpoints (blocker for all detail pages)
   - GET/POST/PUT/DELETE endpoints for: items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative
   - All detail pages depend on this

2. **#128**: CreaturesList + CreaturesDetail wiring (creatures CRUD)
   - Fetch, save, re-roll simulation

3. **#129**: ItemsList + ItemsDetail wiring (items CRUD)
   - Fetch, save

4. **#130**: BiomesList + BiomesDetail wiring (biomes CRUD)
   - Fetch, save + 3 stub tabs (Room Descriptions, Loot Table, Hazards)

5. **#131**: Remaining detail pages wiring (modifiers, skills, loot-tables, factions, rooms, narrative)
   - Same pattern repeated for 6 entity types

6. **#132**: Dashboard wiring (metrics, recent changes, pending reviews, validation warnings)
   - NEW endpoints: /admin/api/dashboard/metrics, /recent-changes, /pending-reviews, /validation-warnings

7. **#133**: Deploy page implementation (Preview Diff, Deploy Staging, Deploy Production)
   - NEW endpoints: /admin/api/deploy/diff, /deploy/staging, /deploy/production
   - Deployment flow, status tracking, logs

8. **#134**: User Management implementation (Add, Edit, Roles)
   - NEW endpoints: GET/POST/PUT/DELETE /admin/api/users
   - Role-based access (admin, moderator, viewer), permission granularity

9. **#135**: Audit Log implementation (filtering by action, user, entity)
   - NEW endpoint: /admin/api/audit-log with query params
   - Real audit trail (not hardcoded), export functionality

10. **#136**: Loot Drop Simulator + Creature Re-roll (simulation features)
    - POST /admin/api/loot-tables/:id/simulate (count parameter)
    - GET /admin/api/creatures/:id/simulate

11. **#137**: Orphan endpoints finalization (rooms pause/resume, spawn, SSE)
    - Wire existing pause/resume endpoints to UI buttons
    - Implement actual spawn logic (not just chat broadcast)
    - Document or remove SSE endpoint

12. **#138**: Stub pages + AdminLayout features (Balance, Contracts, Recipes, search, notifications)
    - Replace "Coming soon" with roadmaps + GitHub links
    - Search input handler + global admin search
    - Notification bell + notification system

### Dependency Order (Suggested execution sequence)
```
#139 (CRUD API) ←─ must complete first
  ├─→ #128, #129, #130, #131 (all detail pages)
  ├─→ #132 (Dashboard depends on CRUD endpoints existing)
  ├─→ #135 (Audit Log)
  ├─→ #134 (User Management)
  ├─→ #136 (Simulators)
  ├─→ #137 (Room endpoints)
  └─→ #133, #138 (Deploy + Stubs can start in parallel)
```

### Key Decisions

1. **Do not create 27 separate issues for each button.** Group by functional area and entity type.

2. **Content CRUD API is foundational.** All detail pages must complete before Deploy/Dashboard, since they need stable CRUD endpoints.

3. **Endpoint design:** No breaking changes to existing data model. Admin endpoints are additive.

4. **Labels used:** `phase:2.5` (new), `admin` (new), `type:feature`, `server`, `client` (as appropriate), `priority:p1` (foundational only)

5. **No milestone yet.** These 12 issues define the scope. Timeline to be determined after Drizzt/Jarlaxle assess endpoint complexity.

### Learnings

1. **Admin UI Pattern:** Visual scaffold without wiring is valid for early iterations, but requires explicit tracking (audit) to identify all missing endpoints.

2. **Decomposition Rule:** Group by data model entity + feature area, not by UI widget. This reduces issue count by 75% and clarifies dependencies.

3. **Orphan Endpoints:** Server endpoints without client callers should be flagged in code review. Add a linting check or docs policy.

4. **Form Handling:** React forms without backend wiring lose data on refresh—this caught immediately because forms are cosmetic. Fixture: add error message if form has unsaved changes (client-side warning).



## Wave 2 Review Cycle: Admin Wiring PRs #142-#145 (2026-03-23T20:00Z)

### Review Summary

**Role:** Lead/Architect Review  

**PRs Reviewed:**
1. PR #142 (Items) — ✅ APPROVED & MERGED
2. PR #143 (Creatures) — ⚠️ CHANGES REQUESTED → FIXED
3. PR #144 (Biomes) — ⚠️ CHANGES REQUESTED
4. PR #145 (Remaining 6 entities) — ⚠️ CHANGES REQUESTED

### Key Verdicts

**PR #142:** Implementation solid, correct patterns. Merged.

**PR #143:** Loot Table disconnected from API → data loss. Fix applied: load in useEffect, include in save payload.

**PR #144:** Validation warnings only, no enforcement. Fix required: add guard clauses in handlers.

**PR #145:** Fake validation + missing fields (effects, tags, requirements). Fixes required: real validation function + component editors.

### New Standards Established

**Validation Enforcement:** Form validation requires both UX warnings AND handler-level enforcement.

**State Wiring:** All component state must be explicitly loaded from API and included in save payloads.

**Surgical Fixes:** When fixing reviewer feedback, address specific issues without rewriting files.

**Next Steps:**
1. Drizzt: Fix PR #144 validation
2. Jarlaxle: Fix PR #145 validation + fields  
3. Elminster: Re-review PRs upon fixes
4. Merge: Approved PRs to dev


---

## 2026-03-23: Milestone — Entity Wiring Complete (All PRs Approved)

**Work:** Re-reviewed and approved PR #145 (validation fixes by Drizzt)
- **Status:** Validation logic correct, guard clauses proper, field additions correct, error display working
- **Decision:** Approved for merge

**Milestone:** All entity wiring complete (issues #128–#131 closed). PRs #143, #144, #145 all merged. Admin dashboard fully functional for all entity types. Validation pattern established and documented.

**Next:** Phase 2.5 continues; entity wiring closed. Validation pattern available for future admin components.


---

## 2026-03-24: Review — PR #154 (Admin Users Fix) + Lint Sweep

### PR #154 (Drizzt) — APPROVED WITH NOTES

**Work:** Reviewed UserStore abstraction for admin user routes. Extracted `UserStore` interface with `PgUserStore` (production) and `InMemoryUserStore` (CI/dev). Auto-selects based on `DATABASE_URL` presence.

**Findings:**
- Architecture follows StashRepository/PlayerRepository patterns correctly
- All 39 tests pass on PR branch (19 previously-failing CRUD tests now work)
- PgUserStore preserves all original SQL/transaction logic
- InMemoryUserStore faithfully simulates key DB behaviours

**Notes filed:** Dead code in test file (db imports, cleanupTestUser), no resetStore() for test isolation, InMemoryUserStore missing DuplicateProviderError enforcement. Assigned Jarlaxle for post-merge cleanup.

### Lint Sweep (Jarlaxle) — APPROVED

**Work:** Verified 0 lint errors remain across all packages. Spot-checked 10+ files. All fixes mechanical — no-explicit-any replaced with proper types, unused vars removed or prefixed, void→undefined in generics, catch error handling cleaned.

### Learnings

1. **Repository abstraction completeness:** When creating in-memory implementations of a repository interface, all unique constraint paths in the PG implementation must be mirrored. The InMemoryUserStore omits `DuplicateProviderError` enforcement — a fidelity gap that could mask production bugs if provider-uniqueness tests are added later.

2. **Test cleanup after abstraction:** When extracting a repository abstraction from inline DB code, the test file must also be updated to remove direct DB imports and cleanup functions. Dead cleanup code that silently fails creates false confidence and import-time side effects (eager Pool creation).

3. **Singleton vs explicit DI in tests:** Module-level singletons (like `sharedInMemoryStore`) work for test isolation only because vitest isolates per file. Prefer explicit DI (`createUserRouter(new InMemoryUserStore())`) in test files for robustness — matches the stash-provider pattern with `resetStashProvider()`.


### 2026-03-25: Full GDD vs. Implementation Code Review
**By:** Elminster (Lead)
**Requested by:** dkirby-ms
**Output:** `.squad/decisions/inbox/elminster-gdd-code-review.md` (comprehensive gap analysis report)

**What**
Performed comprehensive code review of entire Ellmud codebase against GDD.md and 19-issue open backlog. Produced structured report with GDD coverage matrix, backlog gaps, implementation concerns, backlog prioritization recommendations, KNOWN_ISSUES triage, and top 10 priority recommendations.

**Key Findings — Architecture & Core Loop**
- ✅ **Architecture is sound**: Server-authoritative state enforcement is clean. Message-only client protocol is correctly implemented (no Schema leakage). LLM cache-first architecture works as designed. Deterministic combat with simultaneous resolution matches GDD §6.3 exactly.
- ✅ **Core loop is complete**: Login → Loadout → Shard Entry → Combat → Extraction → Stash Persistence works end-to-end. Solo play tested (`__tests__/solo-play.test.ts`).
- ✅ **Production patterns**: PostgreSQL persistence with repository pattern, Redis content-addressable cache, Azure Container Apps deployment with GitHub Actions CI/CD, admin dashboard with SSE updates.

**Key Findings — Missing Systems**
- ❌ **Economy systems designed but not implemented**: Marketplace, crafting, contracts have database schema and client UI stubs, but zero server logic. No trade transactions, no recipe resolution, no contract assignment.
- ❌ **Currency/resource types missing**: GDD §9.1 specifies 5 resource types (Shardsteel, Echo Dust, Anomalous Fragments, Shard Keys, Blueprints). None exist in database or code. Without these, economy cannot function.
- ⚠️ **Skill progression non-functional**: Skills are tracked in database (`003_create_skills.sql`) but never increase. No XP system, no skill checks, no use-based leveling. GDD §7.1 core mechanic is missing.
- ⚠️ **Durability/degradation missing**: GDD §7.2 specifies gear durability depletes during runs and must be repaired. Item definitions have durability fields but no degradation logic. Players can reuse gear indefinitely (removes economic sink).
- ⚠️ **Dodge is non-functional**: GDD §6.4 specifies dodge grants % chance to avoid damage. Code sets dodge state flag but damage calculation never checks it. Dodge action does nothing.

**Key Findings — Content Variety**
- ⚠️ **Only 1 of 5 biomes implemented**: `shard/biomes/flooded-crypt.ts` is the only biome. GDD §10.2 specifies 5 biomes. 4 are missing.
- ⚠️ **Shard modifiers not integrated**: 5 modifier types exist as data structures but are not applied to gameplay. Modifiers don't affect room descriptions, creature behavior, loot quality, sound propagation, etc.
- ⚠️ **Limited creature variety**: Only 1 creature type exists (Drowned Revenant). GDD implies 25+ creatures across 5 biomes. Creature AI framework is solid but content is minimal.

**Key Findings — Implementation Quality Issues**
- ⚠️ **Combat does not block movement** (KNOWN_ISSUES #1): Players can use `go north` to escape combat without fleeing. Violates GDD §6.3.
- ⚠️ **No rate limiting on auth endpoints** (KNOWN_ISSUES #6): `/auth/register` and `/auth/login` vulnerable to brute-force attacks.
- ⚠️ **Azure LLM transport not tested** (KNOWN_ISSUES #2): Zero integration test coverage. Transport bugs won't be caught until deployment.
- ⚠️ **Background LLM enrichment errors swallowed** (KNOWN_ISSUES #4): No logging or telemetry for persistent LLM failures.
- ⚠️ **Stash capacity overflow silent failure**: Items disappear silently when stash is full.

**Key Findings — Backlog Gaps**
Identified 13 GDD features that are not implemented AND have no corresponding backlog issue:
1. Durability & gear degradation (§7.2) — High impact
2. Skill leveling through use (§7.1) — High impact
3. Dodge chance calculation (§6.4) — High impact
4. Currency & resource types (§9.1) — High impact (blocks all economy)
5. Shard modifier integration (§10.3) — Medium impact
6. Loot tier scaling with room danger (§10.4) — Medium impact
7. PvP trading (`offer <item>`) (§8.4) — Medium impact
8. Configurable narration verbosity (§15) — Low impact
9. Squad formation (§8.4) — Medium impact
10. Extraction noise attenuation tuning (§12) — Low impact
11. Pause on prompt (solo mode) (§15) — Low impact
12. Respec mechanic (§7.1) — Low impact
13. Creature loot drop tables (§10.4) — Medium impact

**Key Findings — Backlog Prioritization**
- **Issue #157 (CI/CD failure on UAT)** is blocking deployments. Mislabeled as `phase:4-world`. Should be `critical, infra`.
- **Phase 3 issues (#32-#42) are blocked by untracked foundational issues**: Skill leveling logic, resource types, faction commands not tracked.
- **3 issues should be split**: #32 (Skill Tree), #35 (Shard Modifiers), #37 (Creature Variety) are too broad.
- **3 KNOWN_ISSUES should be promoted to backlog**: #1 (combat-blocks-movement), #2 (Azure transport test), #6 (rate limiting).
- **1 KNOWN_ISSUE is obsolete**: #7 (Token TTL configurable) — fixed by PR #53 `config.ts` module.

**Recommendations — Top 10 Priorities**
1. Fix CI/CD failure (#157) — CRITICAL blocker
2. Implement combat-blocks-movement — Phase 2 PvP blocker
3. Add rate limiting to auth endpoints — Phase 2 security gap
4. Add Azure LLM transport integration test — Phase 2 reliability
5. Implement currency & resource types (§9.1) — Phase 3 foundation
6. Implement skill leveling logic (§7.1) — Phase 3 foundation
7. Implement dodge damage reduction (§6.4) — Phase 2 combat fix
8. Implement durability & gear degradation (§7.2) — Phase 3 economy sink
9. Implement all five biomes (§10.2) — Phase 3 content variety
10. Split and prioritize shard modifiers (§10.3) — Phase 3 variety

**Architectural Insight — "Schema-First, Logic-Later" Pattern**
Multiple systems follow a pattern: database schema + client UI stub are created first, server logic is deferred. Examples:
- Marketplace: `item_definitions` table + client Marketplace tab exist, but no trade transaction logic.
- Crafting: `RecipesList.tsx` admin page exists, but no recipe resolution engine.
- Factions: `004_create_factions.sql` + 3 factions seeded, but no faction commands or reputation gain.
- Skills: `003_create_skills.sql` + 6 categories tracked, but no skill leveling or XP system.

This pattern is efficient for rapid iteration (UI can be mocked against real schema), but creates a **"last 20% takes 80% of the time"** risk — the schema is done, but the complex server logic (transaction atomicity, skill checks, reputation thresholds, crafting RNG) is all deferred.

**Lesson for Future Phases**
When planning Phase 3 work:
1. **Identify foundational systems first** (currency types, skill leveling, durability) and implement before dependent features.
2. **Split broad issues into sub-issues** with explicit acceptance criteria and dependencies.
3. **Promote KNOWN_ISSUES to backlog** with priority labels before starting new feature work.
4. **Test multi-replica deployment** in Phase 2 before declaring Phase 2 complete.

**Files Created**
- `.squad/decisions/inbox/elminster-gdd-code-review.md` — Full review report (30+ pages, structured analysis)

### 2026-03-20: Entra External ID Auth Architecture Assessment
- **Decision:** Entra auth architecture is correctly scoped — identity-only provider, no API protection, no role claims. The design matches the stated intent precisely. Filed at `.squad/decisions/inbox/elminster-entra-auth-scope.md`.
- **Critical finding — Redirect URI mismatch:** `.env.example` documents `ENTRA_REDIRECT_URI=http://localhost:3000/auth/callback` but the server route is `/auth/entra/callback`. This is the primary blocker — Entra redirects to a path the server doesn't handle.
- **Critical finding — Tenant ID vs. subdomain:** `EntraAuthService` uses `tenantId` as both the `ciamlogin.com` subdomain AND the OIDC path segment. For Entra External ID, the subdomain must be the tenant name (e.g., `contoso`), not the GUID. Using a GUID as subdomain produces an unresolvable DNS hostname.
- **Architecture confirmed correct:** `EntraAuthService` → OIDC code flow → extract `oid` → `AuthService.loginOAuth()` → find-or-create player → issue our own UUID session token. No Entra tokens stored, no Entra APIs called post-login, no Entra middleware on any API. This is the minimal viable integration.
- **Security note:** Session token passed in redirect URL query params (browser history, logs). Recommend one-time code exchange pattern.
- **Config inconsistency:** Entra env vars read from `process.env` in `index.ts` instead of centralized `config.ts` module.
- **Bicep correct:** `@secure()` on `entraClientSecret` param. But `ENTRA_CLIENT_SECRET` is plain env var in container spec (should be secretRef long-term).
- **Key files:** `packages/server/src/auth/EntraAuthService.ts`, `packages/server/src/auth/entra-routes.ts`, `packages/server/src/auth/AuthService.ts` (loginOAuth), `packages/client/src/pages/Login.tsx`, `packages/client/src/pages/AuthCallback.tsx`, `infra/modules/container-apps.bicep` (lines 48-65, 149-154).
- **User preference:** dkirby-ms wants Entra as identity-only. No Entra roles, groups, or API protection. All authorization is ours.

### 2026-03-25: PR #201 Review — PlayerProfileRepository (save/load cycle)
- **Reviewer:** Elminster (Lead/Architect)
- **PR:** #201 — Implements issue #199
- **Status:** ✅ APPROVED

**Review Checklist Results:**

1. **Architecture Pattern** ✅
   - Correctly implements Interface + InMemoryImpl + PgImpl (matches StashRepository)
   - DATABASE_URL gating properly done (boot-time toggle)
   - Provider initialized at server boot after stash provider
   
2. **ShardRoom Integration** ✅
   - `onJoin`: Loads profile by playerId, graceful fallback to defaults for new players, correct error handling
   - `onLeave`: Saves profile only during cleanup (consented leave or timeout), properly awaited
   - New players get DEFAULT_PROFILE (skills: {stealth: 5, awareness: 5}, maxCarryWeight: 20)
   
3. **Pg Implementation** ✅
   - Uses existing `player_skills` table (migration 003) correctly
   - Parameterized queries (SQL injection safe)
   - Transaction-wrapped saves with ON CONFLICT upsert semantics
   - Proper client lifecycle management (no connection leaks)
   - Skill-to-category mapping hardcoded (reasonable for MVP, acknowledged limitation)
   
4. **In-Memory Implementation** ✅
   - Uses structuredClone for isolation (prevents external mutation)
   - Test isolation guaranteed
   - Behavioral equivalence with Pg impl via contract tests
   
5. **Edge Cases** ✅
   - DB down during save: Caught, logged, cleanup continues
   - Concurrent joins/leaves: Each player isolated, PG UPSERT handles concurrent saves
   - Default values sensible for new players (matches PlayerState defaults)
   - Optional tracking skill correctly handled (can be undefined)
   - Disconnection logic correct: saves on consented leave only (allows reconnection to restore mid-combat state)
   
6. **Test Coverage** ✅
   - 39+ contract tests (save/load round-trip, upsert, isolation, skill progression, edge cases)
   - Parallel operations tested (50 concurrent saves)
   - Provider wiring tests (singleton, DATABASE_URL gating, reset)
   - 6 placeholder integration tests (Colyseus-specific, acceptable to defer)
   - All 1600 existing tests passing, zero lint errors

**Known Limitations (Acceptable for MVP):**
- Equipment persistence not yet in DB schema (uses defaults until migration added)
- maxCarryWeight persistence not yet in DB schema (uses defaults until migration added)
- Skill-to-category mapping hardcoded (should externalize if categories evolve)

**No blockers. Merge approved.**


### 2026-03-25: PR #202 Review — FactionRepository & RunHistoryRepository (wire-up)
- **Reviewer:** Elminster (Lead/Architect)
- **PR:** #202 — Implements issue #198
- **Status:** ✅ APPROVED

**Review Checklist Results:**

1. **Architecture Pattern** ✅
   - Both repositories correctly implement Interface + InMemoryImpl + PgImpl (matches PlayerProfileRepository and StashRepository)
   - DATABASE_URL gating properly done (boot-time toggle via USE_PG flag)
   - Providers initialized at server boot after ProfileProvider
   - No deviation from established pattern

2. **FactionRepository** ✅
   - **Interface:** `getPlayerFactions(playerId)` / `updateFaction(playerId, factionId, standing)`
   - **Schema:** Uses migration 004 (faction_membership table) correctly
   - **Pg Implementation:** ON CONFLICT (player_id) DO UPDATE enforces one-faction-per-player UNIQUE constraint
   - **In-Memory:** Map-based storage with structuredClone isolation
   - **Contract Tests:** 22 tests covering CRUD, upsert semantics, multi-player isolation, edge cases (INT boundary, zero/max standing)

3. **RunHistoryRepository** ✅
   - **Interface:** `recordRun(run)` / `getPlayerHistory(playerId, limit?)`
   - **Schema:** Uses migration 005 (run_history table) correctly
   - **Pg Implementation:** INSERT with JSON serialization of extractedItems, proper field mapping
   - **Query:** SELECT ... ORDER BY created_at DESC LIMIT (reverse chronological)
   - **In-Memory:** Array-based with reverse-chronological ordering, respects limit parameter
   - **Contract Tests:** 26 tests covering CRUD, chronological ordering, limit behavior, isolation, copy semantics

4. **ShardRoom Integration** ✅
   - **Faction Loading on Join:** Fire-and-forget pattern, informational logging only, exception caught
   - **Run History Recording on Extraction:** Called before player removal, sets extracted=true, records inventory
   - **Run History Recording on Leave:** Called in onLeave() if player exists, sets extracted=false
   - **Duration Calculation:** playerJoinTimes Map tracks join time, durationSec calculated to nearest second
   - **No Interference:** PlayerProfileRepository untouched, new init methods are additive

5. **Provider Initialization** ✅
   - Both providers initialized at server boot in index.ts:
     ```typescript
     initFactionProvider(USE_PG);
     initRunHistoryProvider(USE_PG);
     ```
   - Proper sequencing: after ProfileProvider, before ShardRoom creation
   - Both log their persistence mode (PostgreSQL or in-memory)

6. **Test Coverage** ✅
   - **Total:** 48 contract tests (22 faction + 26 run-history)
   - **Methodology:** Real module imports (not self-contained test doubles)
   - **Coverage:** CRUD operations, upsert semantics, multi-player isolation, edge cases, copy semantics, input mutation protection
   - **Results:** All 1648 server tests pass, zero regressions

7. **Pre-Existing Issues** ✅
   - CI build failure: TypeScript errors in creature files (missing `agility` in CombatStats)
   - **Not caused by PR #202** — creature files not modified
   - **Pre-existing** — unrelated to repository implementations
   - No impact on merge decision

**Architecture Scorecard:**
| Criterion | Status |
|-----------|--------|
| Pattern adherence | ✅ Perfect |
| Schema compliance | ✅ Correct (migrations 004, 005) |
| Provider gating | ✅ DATABASE_URL aware |
| ShardRoom wiring | ✅ Clean, non-invasive |
| Test doubles | ✅ Real imports, comprehensive |
| Regressions | ✅ None (1648 pass) |

**Recommendation:** Merge. Closes issue #198.


### 2026-03-25: Player Persistence Lifecycle Investigation
- **Requested by:** dkirby-ms
- **Status:** Root cause identified — critical identity handoff bug

**Root Cause: `client.auth.playerId` never read by rooms**

The `onAuth()` → `onJoin()` handoff in Colyseus 0.17 works like this:
1. `onAuth(client, options)` returns `{ playerId, username }`
2. Colyseus assigns this to `client.auth`
3. `onJoin(client, joinOptions, client.auth)` is called

But both `ShardRoom.onJoin` and `RefugeRoom.onJoin` read `options['playerId']` — which is the client's raw join options (`{ token }`), NOT the auth return value. `options['playerId']` is always `undefined` in production. The code falls back to `client.sessionId`, a 9-character nanoid that is:
- Not a UUID (Postgres `player_id` columns are UUID type)
- Not in the `players` table (FK violations on every game table)
- Transient (changes every connection)

**Impact Chain:**
1. Auth (register/login) correctly creates `players` + `player_identities` rows with real UUIDs ✅
2. Token store maps token → `{ playerId: <real-uuid>, username }` ✅
3. `onAuth` validates token and returns `{ playerId: <real-uuid>, username }` ✅
4. `onJoin` ignores `client.auth` and uses `client.sessionId` (nanoid) ❌
5. All game persistence (profile, stash, factions, run-history) keyed to nanoid ❌
6. Pg saves fail silently (nanoid isn't a valid UUID for FK-constrained columns) ❌
7. InMemory stores accept it but data is unlinked and transient ❌

**Why user sees "placeholders":**
- The `players`/`player_identities` rows ARE real (created during registration)
- But they look bare — no associated skills, stash, factions, or run history
- Game tables (`player_skills`, `player_stash`, `faction_membership`, `run_history`) are empty
- All game writes silently fail because `client.sessionId` (nanoid) violates UUID type + FK constraints

**Fix:** Both ShardRoom and RefugeRoom must read `client.auth?.playerId`:
```typescript
const authData = client.auth as { playerId?: string; username?: string } | undefined;
const playerId = authData?.playerId || (options['playerId'] as string) || client.sessionId;
```

**Tests pass because** `@colyseus/testing`'s `connectTo()` passes options directly to `onJoin` — the test helper bypasses `onAuth` and merges `{ playerId }` into `options`. Production auth flow does NOT do this.

**Two separate systems confirmed:**
| System | Tables | Written By | Written When |
|--------|--------|-----------|-------------|
| Auth/Identity | `players`, `player_identities` | `PgPlayerRepository` | Registration |
| Player Profile | `player_skills` | `PgPlayerProfileRepository` | Shard onLeave |
| Stash | `player_stash`, `player_stash_capacity` | `PgStashRepository` | Extraction, stash commands |
| Factions | `faction_membership` | `PgFactionRepository` | Faction events |
| Run History | `run_history` | `PgRunHistoryRepository` | Shard onLeave/extraction |

The link between them is `players.id` = `player_skills.player_id` = `player_stash.player_id` etc. This link is never established because rooms use the wrong ID.

**Key files:**
- `packages/server/src/rooms/ShardRoom.ts:252` — the bug (reads `options['playerId']`)
- `packages/server/src/rooms/RefugeRoom.ts:91` — same bug
- `packages/server/src/auth/colyseus-auth.ts` — auth returns correct data
- `node_modules/@colyseus/core/build/Room.mjs:735` — Colyseus passes `client.auth` as 3rd arg
- `packages/server/src/auth/PgPlayerRepository.ts` — correct auth persistence
- `packages/server/src/player/PgPlayerProfileRepository.ts` — correct profile persistence (but receives wrong ID)

---

## 2026-03-25: Identity Handoff Bug Fixed

**Status:** ✅ Resolved and test-covered  
**Teams:** Drizzt (Engine Dev) + Minsc (Tester)  
**Branch:** fix/player-identity-handoff

The critical player persistence bug identified in the 2026-03-25T15:23Z investigation has been **fully resolved**:

### Root Cause (Previously Identified)
- ShardRoom and RefugeRoom read `options['playerId']` (always `undefined` in production)
- Fallback to `client.sessionId` (9-char nanoid, not a UUID)
- All player_skills FK writes failed silently; no persistence

### Fix Implemented
- Both rooms now read `client.auth.playerId → options['playerId'] → client.sessionId`
- The `'anonymous'` sentinel is excluded from the chain
- `playerIds` map now contains correct persistent UUIDs

### Test Coverage
- **11 new integration tests** exercise the real `onAuth → client.auth → onJoin` pipeline
- Tests verify server-side state with UUID keying
- 1659 total tests passing (1657 baseline + 11 new, 1 duplicate removed)
- No regressions

### Key Learning
`client.auth` only exists on server-side `Client` objects, not SDK-side clients. Auth handoff tests must inspect server-side room state, not SDK properties.

### Canonical Pattern Filed
All future rooms must follow: `client.auth?.playerId` (excluding 'anonymous') → `options['playerId']` → `client.sessionId`. Decision documented in `.squad/decisions/decisions.md`.

**Next:** This branch is ready to merge to main.

### 2026-03-25: Stash ↔ Loadout Integration Scoping
- **Task:** Scope a plan to combine stash and loadout screens into a unified UI where players can equip items from persistent stash into temporary loadout.
- **Investigation:** Completed comprehensive audit of client UI (StashTab, LoadoutTab, InventoryOverlay), server stash system (StashService, StashRepository, RefugeRoom commands), extraction pipeline (ExtractionSystem, stash-transfer), and shared schemas (StashItem, Loadout, validation).
- **Key findings:**
  - Client UI exists as prototype with mock data; no server integration yet
  - Server stash persistence is solid (weight-based, capacity-enforced, test-covered)
  - Loadout structure defined in shared types but not persisted server-side
  - Shard key consumption not implemented; durability degradation not wired
  - RefugeRoom stash/take commands exist (text-only); store command is placeholder
  - Message types `STASH_UPDATE` and `LOADOUT_UPDATE` defined but not actively sent
  
- **Architecture decisions made:**
  - **Combined UI layout:** Left pane is stash (10×12 grid, drag-drop), right pane is loadout (equipment slots, consumables, tools, key). Drag items between panes to equip/unequip.
  - **Loadout state machine:** Refuge (equip/unequip freely) → ShardEntry (validate, consume key) → Run (locked, can't change equipment) → Extraction (items return to stash) → Refuge.
  - **Validation layers:** Client (drag zones, warnings) + Server (equip handler, shard entry gate).
  - **Stash-loadout invariant:** Item cannot be in both simultaneously; atomic remove+add with rollback.
  - **Shard key model (Phase 1):** Keys don't degrade; they move from loadout to stash on shard entry. Phase 2 will add durability → 0 for "consumed" semantics.
  - **Phase 1 scope:** In-memory loadout repository, no cosmetic presets, no mid-run equipment swaps, no repair system (TBD).

- **Plan deliverables:**
  - Server: LoadoutService (equip, unequip, validate, clear), LoadoutRepository (in-memory), RefugeRoom handlers, ShardRoom entry validation
  - Shared: LoadoutState type, validateLoadout() function, message types (EQUIP_ITEM, UNEQUIP_ITEM, LOADOUT_UPDATE)
  - Client: CombinedStashLoadout component with drag-drop exchange, validation feedback, real-time stats
  - Tests: Unit (LoadoutService, validation), integration (RefugeRoom→StashService round-trip), component (drag interactions, server sync)

- **Risks identified:**
  - State divergence (client ≠ server): Mitigated by strict server validation + rollback on error
  - Stash-loadout double-spend: Mitigated by atomic operations
  - Concurrency (two clients equip same item): Server-side race won by first; others get error
  - Performance with 100+ items: Mitigated by pagination/virtual scroll if needed
  - Shard key loss on entry: Mitigated by not deleting; mark durability 0 in Phase 2

- **Work breakdown:** Drizzt (2 days, client), Jarlaxle (2.5 days, server/schemas), QA (1 day, integration), Elminster (distributed review).

- **Open questions for dkirby-ms:**
  1. Shard key durability model in Phase 1 (consume vs. mark 0)?
  2. Cosmetic loadout presets (save/load gear combos)?
  3. In-shard equipment swaps allowed or locked?
  4. Repair system design (NPCs, crafting, consumables)?
  5. Multi-hand weapon model (separate slots or 1-of-2 pool)?
  6. Tool slot restrictions (0, 1, or many)?

- **Key files:** `.squad/decisions/inbox/elminster-stash-loadout-plan.md` (full 32KB plan with code examples, edge cases, test strategy, timeline).

- **Success criteria:** Players can equip/unequip via drag-drop, loadout validation prevents broken/incomplete entry, shard key consumed, multi-player sync works, full test coverage, no state divergence.

## 2026-03-25: Stash ↔ Loadout Unification Design (Completed)

**Task:** Design comprehensive plan for unifying stash and loadout screens, including current state analysis, proposed UI, and implementation roadmap.

**Deliverables:**
- **Current State Analysis:** 4 working components (stash persistence, loadout schema, extraction pipeline, prototype UI) + 4 critical gaps (no client-server integration, no server persistence, placeholder commands, edge cases)
- **Proposed Unified UI:** Single merged screen with stash grid (left), equipment + consumables + tools (right), drag-and-drop exchange, real-time validation feedback
- **Implementation Roadmap:** 5-phase plan (~3–5 workdays), phased delivery from server persistence through edge case handling
- **Architecture Design:** 
  - Client: Unified component with message types (EQUIP, UNEQUIP, STASH_UPDATE, LOADOUT_UPDATE)
  - Server: Loadout state tracking, equipment validation, shard key consumption enforcement
  - Shared: Extended Loadout schema with persistence, constraint metadata
  - Integration: Drag-and-drop mechanics, weight/capacity indicators, real-time validation UI
- **Risk Assessment:** Medium (touches auth/persistence, existing patterns solid)

**Key Decisions:**
- Single merged screen improves UX vs separate tabs
- Server-authoritative validation with client real-time feedback
- Shard key consumption checked at extraction gate
- Durability degradation integrated into damage pipeline

**Next Steps:** Break down implementation plan into task cards; assign to Drizzt for sprint execution.

**Decision Record:** See `.squad/decisions.md` — 2026-03-25T23:16:00Z entry.

### 2026-03-27: Hand-Crafted Zones Architecture v2

**Requested by:** dkirby-ms  
**Context:** User rejected previous procedural zone proposal (`.squad/decisions/inbox/elminster-zone-system-proposal.md` recommended procedural sub-regions). User wants traditional MUD-style hand-crafted zones where builders define specific rooms and connections.

**Requirement:** Support hand-crafted zone layouts — admin/builder defines specific rooms, descriptions, and exact topology (exits/connections). Both hand-crafted zones AND procedural shards must coexist.

**Architecture Decision:**

Zones are **persistent, authored room graphs** stored in PostgreSQL and served via a generalized `ShardRoom` implementation. The existing procedural shard system remains unchanged for dungeon-crawl instances.

**Core Components:**

1. **Data Model:**
   - `zones` table: metadata (name, slug, description, level range, tier, lifecycle, category, max_players, pvp_enabled, entry_room_ids)
   - `zone_rooms` table: room definitions within zones (slug, name, description, type, properties, loot_containers, hazards, npcs)
   - `zone_exits` table: directed connections (from_room_slug, direction, to_room_slug, locked, hidden, condition)
   - Full relational schema — no JSONB blobs for core topology
   - Migration: `030_create_zones.sql` + `031_seed_refuge_zone.sql`

2. **Server Architecture:**
   - **Polymorphic ShardRoom:** `onCreate()` accepts optional `zoneSlug` parameter
   - If `zoneSlug` provided: load via `ZoneRepository.getZoneBySlug()` → convert to `RoomGraph` via `convertZoneToRoomGraph()`
   - If no `zoneSlug`: call `generateShardGraph()` (existing procedural path)
   - Rest of ShardRoom logic unchanged — operates on `RoomGraph` regardless of source
   - New files: `packages/server/src/zones/PgZoneRepository.ts`, `packages/server/src/zones/zone-adapter.ts`
   - Modified: `packages/server/src/rooms/ShardRoom.ts` (add zone loading path)

3. **Zone Repository Interface:**
   - `getAllZones()` — for matchmaker listing
   - `getZoneBySlug(slug)` — returns full `ZoneData` (metadata + rooms + exits)
   - CRUD operations for admin: create/update/delete zones, rooms, exits
   - Lives in `packages/server/src/zones/`

4. **Refuge Migration:**
   - Refuge becomes the first hand-crafted zone
   - Zone data: `slug: 'the-refuge'`, `lifecycle: 'persistent'`, `category: 'hub'`, `pvp_enabled: false`
   - Rooms: `refuge-main` (Hearth), `refuge-stash` (Stash Alcove), `refuge-training` (Training Grounds), `refuge-board` (Shardboard)
   - RefugeRoom loads topology via `ZoneRepository.getZoneBySlug('the-refuge')`
   - Ambient simulation (NPCs, events) runs on same tick model as before

5. **Admin UI:**
   - Zone list page (`ZonesList.tsx`) — table with actions (edit, clone, delete)
   - Zone detail page (`ZonesDetail.tsx`) — 3 sections:
     - Zone metadata form (name, slug, description, tier, lifecycle, category, max_players, pvp_enabled)
     - Rooms section (nested list, modal editor for add/edit)
     - Exits section (table, modal for add/edit connections)
   - Backend routes: `/api/admin/zones/*` for CRUD (admin role required)
   - Pattern: follows existing admin content pages (`NarrativeDetail.tsx`, `BiomesDetail.tsx`)

6. **Client Integration:**
   - Room header message enhanced with `zoneSlug?`, `zoneName?` fields (mutually exclusive with `shardSeed`, `shardBiome`)
   - Client renders zone name when present, shard info when not
   - Navigation unchanged — zones use same `RoomGraph` structure as shards
   - Matchmaker UI lists zones separately from shards
   - Collapse timer hidden for zones (only shown for shards)

**Zone Lifecycle:**
- `lifecycle: 'persistent'` zones are always available, no collapse timer
- Multiple concurrent instances allowed if `max_players > 0` and capacity reached
- Phase 1: stateless templates (loot/NPCs respawn on instance creation)
- Phase 2: optional instance state persistence (items looted, NPCs killed)

**Key Design Insights:**
- Zones and shards are polymorphic — both use `RoomGraph` in-memory structure
- No client protocol changes required — navigation messages identical
- Coexistence achieved via `ShardRoom` refactor (one line: add `zoneSlug` option)
- Refuge retroactively becomes a zone (validates the abstraction)
- Admin UI follows established patterns (reduces implementation risk)

**Open Questions for User:**
1. Zone instance state persistence (stateless vs persistent)?
2. Inter-zone connections (isolated vs connected)?
3. Zone-specific mechanics (parity vs enhanced)?
4. Zone builder permissions (admin-only vs builder role)?
5. Refuge navigation (UI hub vs navigable zone)?

**Recommendation for Q5 (Refuge):** Make Refuge a navigable zone with 5-7 rooms. Players move via text commands (`go north` to Stash). Aligns with MUD genre and validates zone system architecture.

**Scope:** 5–7 developer days
- Phase A (Days 1-2): Data layer — migrations, TypeScript types, repository, zone-adapter, unit tests
- Phase B (Days 3-4): Server integration — ShardRoom refactor, RefugeRoom migration, integration tests
- Phase C (Days 5-6): Admin UI — zone list/detail pages, backend routes, validation
- Phase D (Day 7): Client polish — room header rendering, matchmaker UI, zone indicators

**Implementation Todos:** 29 tasks across 8 categories (database, shared types, server core, admin backend, admin UI, client gameplay, documentation, testing)

**No breaking changes:** Existing procedural shards continue to work. This is purely additive.

**Key Files:**
- Proposal: `.squad/decisions/inbox/elminster-handcrafted-zones-v2.md` (full 27KB architecture document)
- Current codebase context:
  - `packages/shared/src/room-graph.ts` — Room and RoomGraph types (reused for zones)
  - `packages/server/src/shard/generator.ts` — procedural generation (unchanged)
  - `packages/server/src/rooms/ShardRoom.ts` — will become polymorphic
  - `packages/server/src/rooms/RefugeRoom.ts` — will load zone topology
  - `packages/server/src/admin/content/PgNarrativeDefinitionsStore.ts` — admin CRUD pattern to follow
  - `packages/client/src/pages/admin/NarrativeDetail.tsx` — admin UI pattern to follow

**Lesson:** When a user rejects a procedural approach and asks for hand-crafted content, the architecture must pivot from generation algorithms to database persistence and builder tooling. The key insight here is making zones polymorphic with shards by converging on a shared `RoomGraph` structure — allows reuse of all navigation/combat/extraction logic without duplication.

**Orchestration Log:** `.squad/orchestration-log/2026-03-25T2316-elminster.md`

### 2026-03-27: Character Creation & Management System Design

- **Task:** Design the character creation and management system — audit existing state, identify gaps, propose architecture.
- **Audit findings:**
  - Identity model is 1:1 (account = player). No "character" entity exists. All per-player tables FK to `players.id` directly.
  - Auth flow is solid: register/login → token → join room with token → resolve playerId.
  - `CharacterSelect.tsx` exists at `/characters` route with mock data (1 hardcoded character, 3 factions) but is never visited — Login and AuthCallback both navigate directly to `/refuge`, skipping character selection.
  - **Critical faction mismatch:** Three different naming schemes — DB (`ironwright`, `veil`, `scarlet`), client (`ironwright`, `veilkeepers`, `ashenguard`), content_definitions (`ironhearth`, `veilwalkers`, `ashborn`). Must reconcile before faction selection can work.
  - GDD confirms no classes/races. Everyone is a Shardwalker. Skills-based progression. Gear is primary power source. Character names exist but are anonymous in shards.
  - 16 DB migrations, 8 per-player tables that would need FK re-keying if we separate characters from accounts.

- **Architecture decisions:**
  - **1:many account → character model**, with MVP = 1 slot. Schema supports multi-character from day one to avoid painful migration later.
  - **Character = progression container** owning skills, stash, loadout, faction, run history. Account = auth credentials + settings.
  - **REST endpoints for character CRUD** (not Colyseus messages). Client calls REST before joining any room. CharacterId passed as join option.
  - **Creation fields:** Name + faction slug only. No class, race, stats, or appearance (per GDD's skills-based design).
  - **New `characters` table** + FK re-key migration for all 8 per-player tables.
  - **Auto-migration** for existing players: create one character per account with username as name.
  - **Login redirect change:** `/` → `/characters` → `/refuge` (inserting character selection into the flow).

- **Open questions for dkirby-ms:**
  1. Faction slug reconciliation (which naming is canonical?)
  2. Character deletion policy (soft-delete with grace period?)
  3. Starting loadout for new characters (starter kit or bare?)
  4. Existing player migration strategy (auto-name or prompt?)

- **Deliverable:** `.squad/decisions/inbox/elminster-character-system-design.md` — full design proposal with DB schema, message protocol, client screens, migration path, MVP scope, and implementation sequence.
- **Key files:** `CharacterSelect.tsx`, `004_create_factions.sql`, `001_create_players.sql`, `RefugeRoom.ts`, `ShardRoom.ts`, `connection.ts`, `Login.tsx`, `AuthCallback.tsx`


### 2025-03-25: Content Store Refactor — Scoping

- **Task:** Scope the removal of the generic `content_definitions` table by migrating all 9 entity types to dedicated tables + stores (following the successful `items` → `item_definitions` pattern).
- **Audit findings:**
  - **Items:** ✅ Already migrated to `item_definitions` table with `PgItemDefinitionsStore`. Admin UI shows all 40+ items from registry, not 18 stale seeded copies. Reference implementation.
  - **Creatures:** 1 template (`drowned_revenant`), 1 seed row. No dedicated table. Admin UI expects more fields (description, behavior, status) than template provides. High priority.
  - **Biomes:** 5 well-defined seed rows, 5 in-memory definitions. Simple flat schema (TEXT arrays). Medium priority, quick win.
  - **Modifiers:** 5 well-defined seed rows, 5 in-memory definitions. Simple schema (JSONB effects, TEXT array tags). Medium priority, quick win.
  - **Skills:** `player_skills` table exists (for progression), but no skill definitions table. 0 seed rows, 0 registry. Low priority, clean slate.
  - **Loot Tables:** No table, 0 seed rows, 0 registry. Low priority, clean slate.
  - **Factions:** **Two faction systems found!** Migration 004 created `factions` table (3 rows: Ironwright, Veil, Scarlet) for player membership. Migration 008 seeded `content_definitions` with 3 different factions (ironhearth, veilwalkers, ashborn) for admin content. Medium priority, requires reconciliation.
  - **Rooms:** No table, 0 seed rows, 0 registry. Low priority, clean slate.
  - **Narrative:** No table, 0 seed rows, 0 registry. Low priority, clean slate.

- **Key architectural insights:**
  - **Store pattern:** `PgItemDefinitionsStore` flattens relational columns + JSONB into flat ContentEntity on read, expands on write. Allows zero client/route changes.
  - **JSONB strategy:** Use columns for queryable fields (name, type, tier), JSONB for nested/variable structures (loot tables, effects).
  - **ID strategy:** UUID primary key + text slug for human-readable references. Existing `content_definitions.id` maps to `slug`.
  - **In-memory mode:** Keep in-memory ContentStore for `usePg=false` mode alongside dedicated stores (dev velocity, testing).
  - **Client-side API unchanged:** Admin UI continues to use generic `listEntities()` / `getEntity()` API. All stores implement `IContentStore<ContentEntity>`.

- **Implementation phases:**
  - **Phase 1 (Quick Wins):** Biomes, Modifiers, Narrative (14.5h) — simple schemas, establishes pattern
  - **Phase 2 (High Impact):** Creatures (9h, HIGH priority), Factions (11h, table reconciliation required)
  - **Phase 3 (Low Priority):** Skills, Loot Tables, Rooms (15.5h) — defer until admin usage proves necessary
  - **Cleanup:** Drop `content_definitions` table, delete `PgContentStore.ts` (5h)
  - **Total:** ~55 hours (7-8 developer days)

- **Critical decisions:**
  - **Faction reconciliation (Decision 6):** Merge both faction tables into single `faction_definitions` table. Migrate both sets (6 total factions), update `faction_membership` FK, drop old `factions` table. Chosen over keeping separate to avoid confusion and dual sources of truth.
  - **UI schema mismatch risk:** Admin UI expects fields not in TypeScript interfaces (e.g., creature.description, creature.status). Mitigation: audit each UI detail page before creating schema, add missing fields as nullable columns.

- **Success criteria:**
  1. All 8 entity types migrated to dedicated tables
  2. Admin UI CRUD works for all types (no client changes)
  3. All seed data preserved
  4. Query performance improved (indexed columns vs JSONB scan)
  5. Dev mode (in-memory) still works
  6. `content_definitions` table dropped
  7. Code registries sync with DB

- **Deliverables:**
  - **Scoping plan:** `~/.copilot/session-state/5a9420c4-0061-4d0f-8cbb-1ca9bf942ad1/plan.md` — comprehensive 27KB document with entity-by-entity audit, proposed schemas, migration strategies, effort estimates, implementation order, risks, client compatibility analysis
  - **Architectural decisions:** `.squad/decisions/inbox/elminster-content-store-refactor.md` — 8 key decisions with rationale, alternatives rejected, implementation checklist
  
- **Key files referenced:** 
  - `content-types.ts` (TypeScript interfaces)
  - `init.ts` (store initialization)
  - `PgContentStore.ts` (generic store to be replaced)
  - `PgItemDefinitionsStore.ts` (reference implementation)
  - `007_create_content_definitions.sql`, `008_seed_content_definitions.sql` (existing migrations)
  - Admin UI: 9 list pages + 9 detail pages (`packages/client/src/pages/admin/`)
  - Registries: `items/registry.ts` (40+ items), `creatures/templates/drowned-revenant.ts` (1 template)

- **Next steps:** Review with team, confirm faction reconciliation strategy, start Phase 1 (biomes, modifiers, narrative).


### 2026-03-27: Zone System Architecture Analysis & Proposal

**Task:** Architecture proposal for a ZONE SYSTEM — grouping rooms into named zones like traditional MUDs.

**Analysis performed:**

1. **What zones mean in traditional MUDs:** Named persistent areas (e.g., "Dark Forest"), hand-authored room graphs, durable across game sessions, navigable landmarks, administrative boundaries.

2. **How zones fit Ellmud's architecture:** Three options analyzed in detail.

**Three Design Options Evaluated:**

- **Option 1: Persistent Non-Instanced Zones (❌ Rejected)**
  - Create persistent zone + room tables. Shards are instances within zones.
  - ✅ Fully traditional MUD experience.
  - ❌ **Breaks procedural identity.** Every run to the Flooded Crypt identical — no surprises. Contradicts GDD §10.
  - ❌ **Breaks ephemeral guarantee.** Shards are supposed to collapse; persistent zones underneath conflict.
  - ❌ **High admin burden:** 500-1000 hand-authored rooms across 5 biomes × 2-4 zones.
  - ❌ **Large migration.** Rewrite procedural generator to spawn within persistent topologies.
  - **Verdict:** Fundamentally conflicts with Ellmud's identity.

- **Option 2: Biome-Scoped Named Regions Within Shards (✅ RECOMMENDED)**
  - Zones are **procedurally generated sub-regions of individual shards**, unique per seed.
  - Generator partitions each shard into 2–4 named zones at generation time.
  - Zones persist for shard lifetime, collapse when shard collapses (ephemeral).
  - Admin defines zone templates per biome (not per-shard).
  - ✅ Preserves procedural identity. Zones vary per shard.
  - ✅ Maintains ephemeral guarantee. Zones live with shards.
  - ✅ Minimal schema. Only 1 new `zone_definitions` table + optional Room fields.
  - ✅ Player clarity. Zone names orient players in large shards (40–60 rooms).
  - ✅ Admin-friendly. Define zone templates, apply procedurally.
  - ✅ LLM-ready. Zone themes feed into narration.
  - ✅ Low cost. ~2–3 dev days.
  - ⚠️ Zones non-persistent. Knowledge doesn't transfer across runs (acceptable for roguelike).
  - **Trade-off acceptance:** Player knowledge is about shard *patterns*, not memorized maps — fits roguelike identity.

- **Option 3: Zones as Biome Sub-Templates (Simple, Less Powerful)**
  - Zones are purely **thematic room name groupings** within biome definitions.
  - No runtime zone objects. Room names convey zones ("Antechamber", "Deep Crypt").
  - ✅ Simplest. ~4–6 hours.
  - ❌ Zones implicit, not first-class. No zone header in room messages.
  - ❌ No zone metadata. No admin UI.
  - ❌ Future scaling problem. No hooks for zone quests, modifiers, events.
  - **Verdict:** Weak option. Less satisfying.

**Recommendation: Option 2 — Biome-Scoped Named Regions Within Shards**

**Rationale:**
1. Respects core identity — proceduralism + ephemerality preserved.
2. Delivers player value — zones orient players, make shards feel structured.
3. Admin-friendly — zones are templates, not per-shard hand-craft.
4. Future-proof — foundation for zone-level features (quests, modifiers, ambient events).
5. Reasonable scope — 2–3 dev days. Fits Phase 2 post-MVP.
6. No breaking changes — existing code paths work unchanged.

**Implementation Scope:**

| Component | Changes | Effort |
|-----------|---------|--------|
| `room-graph.ts` | Add Zone interface, optional zoneId/zoneName to Room | 30 min |
| `generator.ts` | Add `partitionIntoZones()`, zone assignment, load zone definitions | **2.5 days** |
| `ShardRoom.ts` | Store zones, include zone name in room header messages | 1 hour |
| `PgZoneDefinitionsStore.ts` (new) | CRUD for zone_definitions | 2 hours |
| Admin UI (new) | Zone list + edit pages | 3 hours |
| DB migrations | Create `zone_definitions` table | 1 hour |
| Tests | Unit + integration tests for partitioning | 4 hours |
| **Total** | | **~2.5 dev days (18 hours)** |

**Key data model changes:**

```sql
CREATE TABLE zone_definitions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  biome_id TEXT NOT NULL REFERENCES biome_definitions(id),
  tier SMALLINT,  -- NULL = all tiers
  room_type_bias TEXT[],  -- e.g., '{"entry", "corridor"}'
  min_rooms SMALLINT DEFAULT 3,
  max_rooms SMALLINT DEFAULT 8,
  loot_concentration NUMERIC(3, 2) DEFAULT 0.5,
  theme_adjectives TEXT[],  -- for LLM narration
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**Player experience:** Zone names appear in room header messages. Players see "You've entered the Ossuary Heart" + room-specific description. Zone IDs help with future zone-level features.

**Migration path:** Phase 1 (no changes). Phase 2: Add `zone_definitions` table, deploy biome zone templates, update generator, launch zone names in client messages. **No breaking changes.**

**Open decisions for dkirby-ms:**
1. Zone granularity per tier? (2 zones for Tier 1, 3-4 for Tier 2/3?)
2. Zone name style? (Thematic like "Ossuary Heart" vs descriptive like "Boss Chamber"?)
3. How many zone templates per biome to seed? (Recommendation: 2–3 initially)
4. Zone-level features in future? (Loot concentration, creature types, modifiers?)
5. Client display location? (Room header, sidebar, or both?)

**Key files:** 
- Decision: `.squad/decisions/inbox/elminster-zone-system-proposal.md` (full 16.8KB analysis)
- Affects: `generator.ts`, `room-graph.ts`, `ShardRoom.ts`, `RefugeRoom.ts` (room header messages)
- New: `PgZoneDefinitionsStore.ts`, admin UI for zones, `zone_definitions` migration

**Architecture insight — Traditional MUD vs Ellmud zones:**
- **Traditional MUD zones:** Persistent, hand-authored, reused across all players, deep knowledge maps.
- **Ellmud zones:** Ephemeral (shard lifetime), procedurally generated (unique per seed), templated (biome-level), spatial orientation per run.
- **Core difference:** Ellmud prioritizes **roguelike proceduralism** over **persistent world simulation**. Zones are landmarks, not persistent geography.

**Status:** Awaiting dkirby-ms review and decision on the 5 open questions.

### 2026-03-27: Unified Zone UX Architecture Plan
- **Action:** Produced comprehensive architecture plan for unifying Refuge and Shard exploration experiences. Plan at session workspace `plan.md`. Decision filed at `.squad/decisions/inbox/elminster-unified-zone-ux.md`.
- **Problem:** Two completely different UX patterns for the same activity — Refuge uses tab-based menu UI while Shards use narrative room exploration. Duplicate server command handling (~300 lines), jarring player context switches, double work for every new feature.
- **Core concept — Feature Rooms:** New `feature_`-prefixed `RoomType` values (`feature_stash`, `feature_shardboard`, `feature_marketplace`, etc.) that signal the client to show a feature panel when the player enters that room. Feature rooms are normal rooms in the graph — the type is the only discriminant. `RoomHeaderMessage.roomType` (already exists) carries the signal.
- **Server decision:** RefugeRoom adopts ShardRoom's modular `parseCommand()` → `handleCommand()` pipeline. Feature-specific commands become handlers in `commands/handlers/`, gated by `ctx.room.type` checks. `requireRoom()` deleted. `CommandContext` extended with optional service references.
- **Client decision:** `ShardExploration.tsx` becomes universal exploration view. Feature panels are lazy-loaded React components keyed by feature type. `Refuge.tsx` deleted after migration. New route: `/zone/:zoneSlug`.
- **RefugeRoom preservation:** Not retired immediately. Keeps ambient tick simulation and shard creation. Evaluation of retirement deferred to Phase 5 after client unification is validated.
- **5-phase rollout:** Types (1-2d) → Server unification (3-4d) → Client unification (3-4d) → Feature UIs (2-3d each) → Cleanup (1-2d). Parallel routes during transition, no big bang.
- **Key insight:** The existing `RoomHeaderMessage.roomType` field and ShardRoom's `isZone` mode mean minimal new protocol needed. The infrastructure is already 80% there.
- **Open questions for dkirby-ms:** Feature panel placement (sidebar vs main column), feature room type naming convention, ambient events rendering, RefugeRoom retirement timing.
- **Key files:** Session workspace `plan.md`, `.squad/decisions/inbox/elminster-unified-zone-ux.md`

### 2026-03-27T01:25Z: User directives on unified zone UX decisions
- **Feedback received from dkirby-ms:**
  1. ✅ Ambient events → render as inline narrative prose (not dedicated sidebar)
  2. ✅ Players Nearby → always show in all zones (special effects deferred)
  3. ✅ RefugeRoom retirement → yes, plan to retire, but defer validation to Phase 3
  4. ✅ Feature room type naming → `feature_` convention accepted
  5. ✅ Feature panel placement → right sidebar, replacing status/inventory section
  6. ✅ Feature room descriptions → narrative prose + stats summary line (e.g., "STASH: 12 items · 45/100 weight")

- **Integration point:** These user directives directly answer all open questions from elminster-unified-zone-ux.md. Feature panel placement (Q1) resolved to right sidebar. Feature room naming (Q2) confirmed `feature_` pattern.

- **Next action:** Hand-crafted zones proposal (elminster-handcrafted-zones-v2.md) also needs dkirby-ms approval on 4 key decisions before implementation can proceed.

- **Status:** User feedback integrated into master decisions.md. Both Volo's GDD refresh and Elminster's zone architecture plans are now approved at open-question level with user direction. Ready for Phase 2 implementation kickoff.


### 2026-07-22: Unified Room Architecture Plan
- **Decision:** Comprehensive architecture plan for unifying ShardRoom + RefugeRoom into a single Colyseus room class with composable systems. Decision file: `.squad/decisions/inbox/elminster-unified-room-arch.md`.
- **Key insight — System composition over inheritance:** Zone config (`zone.category`, `zone_rooms.type` feature types) determines which systems are active. Combat, ambient, extraction, creatures — all conditionally instantiated. No class hierarchy.
- **Key insight — Feature-gated command pipeline:** The shared command pipeline gains middleware that checks `ctx.room.type` against a required `FeatureRoomType`. Commands like `stash` only work in `feature_stash` rooms. This replaces RefugeRoom's manual `requireRoom()` pattern.
- **Key insight — Colyseus routing:** Zones registered as `zone:{slug}` room names. Auto-provisioned at server boot for persistent zones. Client `switchRoom()` already accepts any room name string — minimal client changes.
- **Key insight — Reconnection gap:** RefugeRoom has ZERO reconnection support. The unified class adds 10s grace for hub/social zones, 30s for dungeon zones. This is a net improvement.
- **Key insight — Exploration tracking:** New `character_explored_rooms` table with upsert semantics (INSERT ON CONFLICT). Per-character, per-room, fire-and-forget recording on room entry. Follows established Interface + PgImpl + InMemoryImpl + Provider pattern.
- **Migration strategy:** 5 phases (A: Foundation, B: Absorption, C: Routing, D: Exploration, E: Cleanup). A1 (exploration) fully parallelizable. C gated on ALL B items. Only 1 new DB migration (032).
- **RefugeRoom analysis:** 1,015 lines. Key unique capabilities: AmbientSystem, shardboard/enter commands (matchMaker integration), stash commands (stash/take/store), room-gated commands, arrival/departure announcements, fallback refuge graph, pendingEnter guard.
- **ShardRoom analysis:** 2,022 lines. Already has zone mode (isZone, zoneSlug, zoneData), shared command pipeline, reconnection, all combat systems. The `isNonCombatZone` check already gates combat/extraction/downing for hub/social zones.
- **Key files:** ShardRoom.ts (2,022 lines), RefugeRoom.ts (1,015 lines, to be deleted), commands/index.ts (command pipeline), shared/room-graph.ts (feature room types), zones/zone-adapter.ts, shard/graph-adapter.ts.
- **Open questions for dkirby-ms:** Room name format, exploration coordinates timing, take command disambiguation, shardboard service extraction, ambient system scope.

### 2026-03-26: NPC and Item Room Management — Deep Systems Analysis

- **Commissioned by:** dkirby-ms (Zone Designer feature planning)
- **Task:** Analyze current state of NPC and loot management, identify gaps, propose a plan for two new admin features (NPC Management per Room, Item/Loot Management per Room).
- **Key Finding — Foundational Support Already Exists:** The `ZoneRoomDefinition` interface already exposes `npcs[]` and `lootContainers[]` fields (client-side). Database stores both as JSONB in `zone_rooms` table (migration 030). Runtime spawning logic already implemented in `CreatureManager.spawnCreaturesFromZone()` and `ShardRoom` loot initialization. The gap is **admin UI only**, not architecture.
- **NPC Data Model:** Stored as `{creatureId: string, spawnCount: number}` array in `zone_rooms.npcs` JSONB. At runtime, `CreatureManager` iterates rooms and spawns N instances of the template. Creatures tracked for repop (respawning after death). Creature templates defined in code (`/creatures/templates/*.ts`, registered in `CREATURE_TEMPLATES` map). Currently only `drowned_revenant` is registered; `gutterspawn`, `slum_rat`, `rubble_scavenger` are in-use but not explicitly registered.
- **Loot Data Model:** Stored as `{id: string, type: string, items: string[]}` array in `zone_rooms.loot_containers` JSONB. Items are slugs (e.g., "bent_rebar") resolved to `item_definitions` table at runtime. Container types include "crate", "corpse", "sack", "altar". Items are searchable by players via `search` command.
- **Hazards (out of scope but documented):** Stored as `{type: string, severity: number}` array in `zone_rooms.hazards` JSONB. Intensity 0.0–1.0. Types include "unstable_rubble", "standing_water".
- **Admin API Status:** Zone CRUD routes exist (`POST /zones/{zoneId}/rooms`, `PUT /zones/rooms/{roomId}`, etc.) via `packages/server/src/admin/zones/zone-routes.ts`. Validation only checks slug and name; no validation on `npcs` or `lootContainers`. No endpoints to list creature templates or item definitions.
- **Design Decisions Made:**
  1. **No new DB tables:** Store `npcs` and `lootContainers` inline as JSONB (matches existing `hazards` pattern). Room-level data authoritatively owned by room definition.
  2. **Creature templates read-only:** Expose via API as metadata (`GET /admin/api/creatures`) but no CRUD. Templates are global, code-defined, seeded via migrations.
  3. **Item definitions read-only:** Expose via API as metadata (`GET /admin/api/items`) but no CRUD. Items are global definitions.
  4. **Phase 1 keeps NPC structure minimal:** `{creatureId, spawnCount}` only. Aggression, patrol routes, carried items are per-template, not per-spawn. Phase 2 can extend structure with behavior overrides if needed.
  5. **Loot containers always spawn in Phase 1:** No `spawnRate` or `hidden` fields yet. Phase 2 can add if search/detection mechanics mature.
- **Implementation Plan (2 weeks, ~13.5 days):**
  - **Server (6d):** (1) Register missing creature templates in `CREATURE_TEMPLATES` (~1d). (2) Implement `GET /admin/api/creatures` endpoint (~1d). (3) Implement `GET /admin/api/items` endpoint (~1d). (4) Enhance room validation to check `npcs` and `lootContainers` (~1d). (5–6) Unit + integration tests (~2d). Parallelization: endpoints 2–3 independent.
  - **Client (7.5d):** (1) Add `listCreatures()` and `listItems()` to `zone-api.ts` (~0.5d). (2–3) Build NPC and loot UI panels (~4d, parallelizable). (4–5) Integrate into room editor (~2d). (6) E2E tests (~1d). Parallelization: UI components 2–3 independent; server and client fully parallel after API spec.
- **Work Breakdown Table:** Provided in decision file with dependencies and effort estimates. Server and client work can parallelize once initial API specs agreed. NPC UI and loot UI components can be built in parallel.
- **Risks & Mitigations:**
  1. **Missing creature templates:** Audit `/creatures/templates/` and seed migrations; register all in-use types during task 1. Add test to verify coverage.
  2. **Item definition gaps:** Items referenced in seed may not exist in `item_definitions`. Add optional validation; seed migration may need follow-up.
  3. **Complex NPC behaviors:** Zone designers may want per-NPC aggression/patrol/items. Phase 1 keeps simple; Phase 2 can extend structure with behavior overrides.
  4. **Loot spawn rates:** Some zones may want conditional spawning (50% chance). Phase 1: always spawn. Phase 2: add `spawnRate` field.
- **Future Enhancements (Phase 2+):** NPC behavior overrides, loot spawn rates, hidden items flag, creature type creation UI, item type creation UI, loot table editor integration, multi-zone NPC wandering.
- **Success Criteria:** API endpoints return correct metadata; room validation rejects invalid NPC/loot; admin UI provides add/remove/configure workflows; creatures and loot spawn correctly at runtime; unit, integration, and E2E tests all pass.
- **Deliverable:** Decision document `.squad/decisions/inbox/elminster-npc-item-plan.md` (22.5 KB) with detailed architecture, data model, implementation plan, work breakdown, risks, and success criteria. Ready for dkirby-ms review and implementation handoff.

### 2026-03-29: DB-Driven Content Definitions Architecture
- **Decision:** Proposed architecture to move all creature and item content definitions from hardcoded TypeScript to PostgreSQL. Decision file: `.squad/decisions/inbox/elminster-db-content-architecture.md`
- **Problem identified:** Five concrete failures in the current code-based approach: (1) phantom creature/item references in zone seeds (`slum_rat`, `sewer_lurker`, `rat_tail`, `corroded_pipe` exist nowhere in code), (2) registry drift (5 creature template files, only 1 registered), (3) data duplication in loot tables (LootEntry embeds item name/weight/description), (4) no admin authoring capability, (5) dead DB tables (`creature_definitions` exists since migration 023 but code never reads it).
- **Key design decisions:**
  - TEXT primary keys for both tables (matching existing JSONB slug references in zone data)
  - JSONB for `base_stats` (item stat shapes differ by type) and `loot_table` (creature drop tables)
  - Load-all-at-startup strategy (real-time game, can't query DB per-tick; dataset is small)
  - `ContentRegistry` singleton replaces both `CREATURE_TEMPLATES` Map and `ITEM_REGISTRY` Map
  - Loot table normalization: creature loot entries store only `{itemId, dropWeight}`, join with item_definitions at load time
  - Soft deletes via `status` column (draft/published/deprecated)
  - No SQL FKs on JSONB references — integrity enforced at application level (startup validation + admin API validation)
- **Migration strategy:** Three phases — (1) seed DB from existing TypeScript (non-breaking), (2) wire ContentRegistry behind feature flag, (3) remove code registries after UAT validation.
- **Risks flagged:** Stale cache in multi-server, missing phantom content needs design before seeding, type safety regression from DB-loaded JSON (mitigate with Zod), admin UI scope creep.
- **Affected files:** `CreatureManager.ts`, `registry.ts`, `admin/routes.ts`, `graph-adapter.ts`, `ShardRoom.ts`, all creature template files, zone seed migrations.
- **Open questions:** Loot table junction table vs JSONB, multi-server cache invalidation, content versioning.

### 2026-03-29: DB-Driven Content Architecture — APPROVED & HANDED OFF

- **Status:** Architecture proposal approved by dkirby-ms with defaults (JSONB loot, single-server, no versioning)
- **Next phase:** Handed off to Drizzt (Engine Dev) for SQL migrations (034–036) and data seeding
- **Handoff:** Jarlaxle (Systems Dev) to follow with ContentRegistry wiring and admin CRUD endpoints
- **Orchestration log:** `.squad/orchestration-log/2026-03-29T13-45-00Z-elminster.md`

## Learnings

### GDD Major Overhaul (2024)
**Context:** Comprehensive restructure of GDD.md to reflect evolved design direction — from procedural "shard" focus to hand-crafted zone-based content.

**Key Learnings:**

1. **Design Documentation Must Track Reality:** The GDD had documented the game as "procedural-first with static zones as secondary," but the implementation and design evolution showed hand-crafted zones were actually primary. Documentation drift creates confusion for contributors and undermines design clarity.

2. **Flavor Terminology Has Outsized Impact:** Player-facing terms like "Shardwalker" and "shard-sickness" aren't just naming — they communicate the game's identity. Changing from "Shardwalker diving into procedural shards" to "explorer in hand-crafted extraction zones" fundamentally reframes what the game is about. This shift required updates in 100+ locations across the GDD.

3. **Placeholder > Deprecated Documentation:** When the combat system needed a ground-up redesign, I replaced 50+ lines of detailed (but obsolete) combat mechanics with a clear placeholder acknowledging the redesign. This is better than leaving deprecated details that contributors might implement.

4. **Biome Systems Are Pervasive:** Removing the biome concept required changes in:
   - Content sourcing tables
   - Database schema documentation
   - LLM narrative prompts
   - Creature spawn rules
   - Loot distribution
   - Skill descriptions
   Lesson: Environmental categorization systems touch everything. Removing one requires systematic review of the entire document.

5. **Roadmap Alignment Is Critical:** The Phase 1-4 roadmap had items like "All five biomes" and "Shard modifiers runtime" that assumed the old design direction. Updated roadmap to reflect "Environment variety" and "Zone modifiers" — small changes that signal the new direction.

6. **Technical vs Design Terminology:** Preserved `ShardRoom` as a codebase class name while updating conceptual references to `InstanceRoom`. This separation acknowledges that code refactoring is separate from design documentation — we can update docs immediately while code changes happen incrementally.

7. **Surgical Edits Over Wholesale Deletion:** Rather than deleting sections wholesale, I reframed and rewrote to preserve structure and completeness. The GDD remains comprehensive (~1094 lines), just with updated direction. This approach maintains the document's utility as a reference.

8. **Combat Systems Deserve Their Own Design Phase:** Attempting to document a complex combat system before it's been prototyped and validated leads to documentation churn. Better to acknowledge "redesigning from ground up" and document once the design is settled.

9. **Database Terminology Matters for Migration:** Noting that `zones.biome` should become `zones.environment` and `player_shard_sickness` should become `player_death_tracking` sets clear expectations for future migration work. Documentation should call out these alignment tasks.

10. **Open Questions Show Design Maturity:** Added "Hand-crafted vs procedural balance" to Open Questions because even though we've de-emphasized procedural generation, the question of its role remains open. Good design docs acknowledge what's still being figured out.

**Artifacts Created:**
- Decision document: `.squad/decisions/inbox/elminster-gdd-overhaul.md` (comprehensive change log and rationale)
- Updated: `GDD.md` (major restructuring across all sections)

**Recommended Follow-Up:**
1. Combat system design workshop → document in §6 once validated
2. Schema migration plan for biome/shard terminology in database
3. Code refactoring plan for ShardRoom → InstanceRoom (if desired)
4. Content authoring focus: hand-crafted zones as primary deliverable

---

### 2025-07-22 — Refuge Repurposed + Faction Starting Areas

**Task:** Reframe the Refuge from player hub to designer/debug tool; introduce faction starting zones.

**Scope:** GDD.md only, ~25 edits across 10+ sections.

## Learnings

1. **Hub Abstraction Is Overdue:** The Refuge was serving double duty — player home *and* the only persistent hub implementation. Splitting into faction-specific hubs and a designer hub forces us to think about the hub as a pattern (feature rooms, persistent lifecycle, stash/board/market) rather than a singleton. This abstraction will simplify the eventual `FactionHubRoom` implementation.

2. **Zone Category Enum Needs Expansion:** The current `hub` category was a catch-all. Splitting into `faction_hub` and `dev` is cleaner but requires a DB migration and audit of any code that filters on `category = 'hub'`. Flag for implementation phase.

3. **Player Routing Is a New Concern:** With multiple starting zones, the server needs logic to resolve which zone a player spawns into after login, extraction, or death. This depends on `faction_membership` — a table that exists but has no runtime consumers yet. This is a new system boundary that didn't exist when everyone landed in the Refuge.

4. **Cross-Faction Interaction Becomes a Design Question:** If players live in separate faction hubs, where do cross-faction trades happen? The GDD currently says "same faction stronghold" for direct trade. Neutral zones or marketplace mechanics are needed for cross-faction economy. Noted as a future design question.

5. **Surgical GDD Editing Scales:** This was ~25 targeted edits across the document, not a rewrite. The grep-first approach (find all "Refuge" references → classify each → edit contextually) avoids drift and ensures nothing is missed. Same pattern used in the previous GDD overhaul works well for thematic pivots.

**Artifacts Created:**
- Decision document: `.squad/decisions/inbox/elminster-refuge-faction-starts.md`
- Updated: `GDD.md` (Refuge → designer hub, faction starting zones introduced)

---

### 2025-07-22 — Extraction Removal + MUD-Style Death

**Task:** Remove the extraction mechanic entirely from the GDD and replace it with MUD-style death as the primary risk mechanic. Requested by dkirby-ms.

**Scope:** GDD.md only, ~30 edits across 15+ sections plus two new sections (§6.5, §6.6).

## Learnings

1. **Genre Identity Was Load-Bearing:** "Extraction RPG" was woven into nearly every section — genre line, core fantasy, design pillars, gameplay loop, zone design, PvP framing, sound system, roadmap, and open questions. A grep for "extract" (case-insensitive) hit 30+ lines. Removing a genre identity from a GDD is not a find-and-replace — each reference requires contextual rewriting because the surrounding language was shaped by the extraction assumption.

2. **Death-as-Risk Is Simpler and More MUD-Native:** The extraction mechanic was a genre import that fought the medium. A channeled extraction ritual in text lacks the physical tension of a 3D game. MUD-style death (corpse drop, gear loss, corpse run) is native to the form, creates continuous tension rather than point-of-extraction tension, and is mechanically simpler. This is a case where removing complexity improved the design.

3. **Zone Lifecycle Needed a Split:** The old lifecycle (Seeding → Open → Active → Destabilising → Collapse) was entirely extraction-driven. Without extraction, zones don't inherently need a collapse timer. The replacement is a dual model: Persistent zones (the primary model, always available) and Instanced zones (future, optional timer). This is more flexible and better matches the MUD paradigm of persistent areas you enter and leave.

4. **Equipment Loss Is a Design Space, Not a Single Mechanic:** Death is now the primary gear loss vector, but acknowledging other vectors (durability, curses, theft, traps) early prevents the design from over-indexing on death as the only meaningful risk. Planting these seeds now means future designers won't have to retcon the philosophy.

5. **Open Questions Are the Right Place for Unresolved Death Parameters:** Corpse persistence, recovery mechanics, death penalty severity — these are all playtest-dependent. Specifying them prematurely in the GDD would create false precision. The §18 additions are correctly framed as questions, not answers.

**Artifacts Created:**
- Decision document: `.squad/decisions/inbox/elminster-extraction-removal.md`
- Updated: `GDD.md` (extraction removed, death & corpse system added, genre reframed)

---

## Learnings — GDD vs Codebase Audit (2026-03-20)

**Context:** Audited the full codebase against the updated GDD after three major revisions (shards/biomes removed, Refuge repurposed, extraction removed).

### Key Findings

1. **Extraction system is deeply embedded.** `ExtractionSystem` (server), `ExtractionOverlay` (client), `extract` command handler, `EXTRACTION_STATE` message type, extraction room type in `RoomType` union, and `extractionRoomIds` on all graph types. The generator has ~200 lines dedicated to extraction room placement and distance constraints. Full removal required.

2. **"Shard" permeates everything.** 93 occurrences in `ShardRoom.ts` alone (2491 lines). The class name, state class, shared types (`ShardState`, `ShardTier`, `ShardModifier`, `ShardStateMessage`, `ShardSicknessInfo`), the `shard/` directory, client hooks (`useShardConnection`), client pages (`ShardExploration`), store actions (`SET_SHARD_STATE`), and the Colyseus room registration (`server.define('shard', ShardRoom)`) all use "shard". Renaming is a cross-cutting concern touching every package.

3. **"Shardwalker" is player-facing.** Used on Login (`"Create Shardwalker"`), CharacterSelect (`"Your Shardwalkers"`, `"+ New Shardwalker"`). Must be renamed before any public release.

4. **Biome system is in DB schema.** `biome_definitions` table exists (dead code), `biome` columns on `zones`, `room_definitions`, `creature_definitions`, `run_history`, and `character_explored_rooms` tables. `BiomeType` is a shared type used across 15+ files. The Siltgate zone uses `biome: 'urban'` which isn't even in the `BiomeType` union — the type is already stale.

5. **Death routes to Refuge, not faction stronghold.** Both `handlePlayerDeath()` and `handleSuccessfulExtraction()` send `ROOM_SWITCH` to `zone:the-refuge`. No faction-based routing exists. The faction module can look up player factions but doesn't influence spawn/death routing.

6. **Corpse system is a trace, not an entity.** Death creates a `corpse` trace (visual marker with TTL) and drops items as loose floor objects. There's no corpse *entity* with an inventory that other players can `loot`. The test `it.todo('PvP death drops non-soulbound items as lootable corpse')` confirms this is known-missing.

7. **Refuge is `category: 'hub'` in DB, should be `'dev'`.** GDD says Refuge is `category: 'dev'` for designers. Faction strongholds (category: `faction_hub`) don't exist yet.

8. **DB schema has extraction-centric columns:** `run_history.extracted`, `run_history.extracted_items`, `run_history.shard_tier`, `player_shard_sickness` table name, `biome` columns across 5+ tables.

**Audit report:** `.squad/decisions/inbox/elminster-gdd-code-audit.md`

### 2026-04-01: Combat System Design — GDD §6 & §8
- **Action:** Drafted complete Combat System (§6) and PvP System (§8) sections in GDD.md, replacing placeholder sections.
- **Design direction (user-confirmed):** Real-time continuous combat with auto-attack baseline on 1s tick, UI-assisted input (5-slot ability bar, hotkeys 1–5, clickable buttons), server-authoritative resolution via Colyseus.
- **Key architecture:** Auto-attack fires every tick by default; abilities replace the auto-attack for that tick (one ability per tick). Enemy telegraphs (2–4 tick wind-ups) create reaction windows. Signal classification + colour coding + temporal micro-batching for narration readability. PvP uses identical combat system with faction-based soft flagging.
- **Excluded from brainstorm:** Layer 3 (spatial anchoring), Layer 4 (threaded logs), Layer 8 (cinematic screen effects), Layer 9 (multiple readability modes), Layer 10 (architecture diagram).
- **Section renumbering:** Death & Corpse moved to §6.8, Equipment Loss to §6.9, Future Considerations added at §6.10. All cross-references updated across GDD.
- **User preference:** dkirby-ms wants combat accessible without rapid typing — UI buttons and hotkeys are the primary combat input, not typed commands.
- **Decision file:** `.squad/decisions/inbox/elminster-combat-system.md`
- **Key files:** `GDD.md` (§6, §8), `docs/combat-brainstorm.md` (raw ideas, selectively adopted)

### 2026-04-01: GDD Group Combat Scale Update
- **Directive:** dkirby-ms requested group combat scaling from "squads of 3" to groups of up to 20 players. Directive file: `.squad/decisions/inbox/copilot-directive-2026-04-01T010720.md`
- **Sections updated:**
  - §2.2 Adventure Zones — Zone capacity updated from "1-6 players / squads of 3" to "1-20+ players / groups of up to 20".
  - §3 Core Gameplay Loop — "squad" references updated to "group".
  - §6.2 Combat Flow — Added "Group Combat" subsection: group zone entry, tab-cycle/click targeting in multi-enemy fights, shared target damage aggregation, tick loop scaling for 20P+NC rooms, O(P+C) performance constraint.
  - §6.3 Abilities & Cooldowns — Added AoE Attack, Group Buff, Group Heal, and Taunt ability types to the ability table. Taunt mechanic defined (set to highest threat + 10%, fixated debuff).
  - §6.4 Combat HUD — Added "Group Frames" subsection: compact party member display (HP, status, role indicator derived from behaviour), scaling rules (1-5 expanded, 6-20 compact grid), out-of-room greying. Target panel updated with tab-cycling and scrollable target list. Narration feed references verbosity filtering.
  - §6.5 Enemy Telegraphs — Added "Group Telegraph Design" subsection: room-wide AoE telegraphs, targeted telegraphs (personalised vs third-person variants), cleave/cone telegraphs (melee vs ranged stance), telegraph priority ordering.
  - §6.6 Combat Narration — Added group-scale micro-batching rules (ally damage summarisation, healing batching, kill events always individual). Added "Narration Verbosity" subsection: 4-level client-side verbosity filter (Mine Only / Party Focus / Balanced default / Full).
  - §6.10 Threat & Aggro System — New section. Threat table per creature per player. Threat generation table (damage 1:1, healing 0.5:1 split, taunt highest+10%, AoE per-target, base entry threat 10, skill multipliers). Threat resolution (highest-threat targeting, room exit fallback, death fallback, no decay during combat). Design intent: emergent roles without hard classes.
  - §7.1 Skills — "squad buff radius" updated to "group buff radius" in Social category.
  - §8.5 Cooperation — Complete rewrite from 3-line squad stub to full group system: formation (invite/leave), group leader role (invite/kick/loot/promote), loot distribution (Round-Robin default, Free-for-All, Need/Greed), friendly fire protection (server-enforced), group zone entry.
  - §18 Open Questions — Squad size question updated to group size question with load testing focus. Solo viability and communication meta questions updated from "squad" to "group" terminology.
- **Design constraints respected:** No hard class roles (threat system enables organic specialisation via skills). No instanced dungeons (groups enter persistent zones). Same death mechanics in groups. Server-authoritative combat. 1-second tick budget. Text narration primary, HUD augments.
- **Key cross-references added:** §6.10 referenced from §6.2 (tick loop), §6.3 (taunt/heal threat), §6.4 (group frames threat sorting), §6.5 (telegraph priority).
- **Section renumbering:** Threat & Aggro takes §6.10 (previously "Future Considerations" which was removed in the combat system update).
- **Key files:** `GDD.md` (§2.2, §3, §6.2-6.6, §6.10, §7.1, §8.5, §18)

### 2026-04-01: Room Positioning System (§6.11)
- **Action:** Designed and added §6.11 Room Positioning to GDD.md — a new abstract positional combat system with three zones (Front, Flank, Rear).
- **Core design:** Three position zones per room. Front (default, melee, tank zone), Flank (melee with flanking bonus, offset from primary target line), Rear (ranged only, protected from melee creatures). Solo players can ignore positioning entirely — default is Front.
- **Repositioning cost:** Changing position costs the player's action for that tick (no auto-attack or ability). 3-tick cooldown prevents constant shuffling. Meaningful commitment without being punitive.
- **Creature positioning:** Creatures also have position zone assignments per creature type (melee → Front, ranged → Rear, skirmisher → Flank, boss → All). Creature repositioning costs a tick. Aggressive creatures chase unreachable high-threat targets; steady creatures attack the highest-threat *reachable* target.
- **Threat integration (§6.10):** Threat resolution extended with reachability — melee creatures target highest-threat player they can reach from their current position. Ranged and boss creatures reach all zones. Taunt overrides reachability (creature repositions toward taunter).
- **Cross-references updated:** §6.2 tick loop (added position resolution as step 1), §6.3 abilities (melee/ranged position requirements, AoE zone targeting, taunt repositioning), §6.4 HUD (position badges on group frames and target panel, zone buttons, telegraph warnings), §6.5 telegraphs (cleave/cone now zone-based instead of engagement-stance-based), §6.10 threat resolution (reachable target mechanic, unreachable target AI decisions), §8.3 PvP (positioning applies, less impactful 1v1 but significant in group PvP).
- **Design principles preserved:** No hard class enforcement (anyone can go Front). Server-authoritative (position is server state). Meaningful but not mandatory (solo play unaffected). Scales with group size (3-player → light tactical layer; 20-player → critical for survival). No grid, no action points, no tactical miniatures — keeps the MUD feel.
- **Key files:** `GDD.md` (§6.2, §6.3, §6.4, §6.5, §6.10, §6.11, §8.3)

---

## 2026-04-01: Agent Work Summary

**Two tasks completed:** Group Combat System (20-player scale) and Room Positioning System (§6.11). Total updates: 2 major GDD sections (§6.10, §6.11) + 8 cross-references updated. Decisions recorded in `.squad/decisions.md`. Orchestration logs created in `.squad/orchestration-log/`.

### 2026-04-02: Zone Instancing & Multi-player Scaling (§2.4)
- **Action:** Added comprehensive §2.4 Zone Instancing & Multi-player Scaling to GDD.md — a new subsection documenting how persistent shared zones work at scale.
- **Core design:** Zones are **Colyseus Rooms** with shared persistent instances. When a player enters a zone, the server routes them to the **least-full existing instance**. Only when an instance hits max capacity does overflow create a new instance. This is **shared-world design**, not instanced dungeons.
- **Key principles documented:**
  - **Instancing Model**: Server checks capacity, joins existing instance, or creates overflow. Each instance is a separate `ShardRoom` with isolated creatures/loot.
  - **Max Player Capacity**: Default 100+ players per instance, configurable per zone and globally via `MAX_PLAYERS_PER_SHARD`.
  - **Instance Lifecycle**: Persistent zones spawn on-demand, timed zones have collapse timers. Empty instances cleaned up after grace period (default 5 min).
  - **Group Guarantee**: Groups always placed in same instance regardless of cap, ensuring group cohesion. Group size counts against capacity.
  - **Player Experience**: Shared zones create emergent encounters, PvP, and a living world. This is core MUD design — players feel less alone.
  - **Awareness & Visibility**: Players discover each other via room presence, traces (footprints, blood), and proximity communication (`say`, `emote`).
- **Cross-references added:** §2.3 (timed instance lifecycle), §4.4 (LLM indirect player description), §5.3 (traces and sound for detection), §8.2 (PvP flagging), §8.4 (proximity communication), §8.5 (group guarantee), §13 (Colyseus Room architecture).
- **Design alignment**: Respects the cardinal rule — players share the world by default. Overflow is transparent infrastructure, not a user-facing mechanic. Reinforces the MUD ethos of unscripted player interaction.
- **Key files:** `GDD.md` (§2.4 new subsection)

### 2025-07-18: PR Reviews — #255 and #256

**PR #255 — fix: disable text selection in zone designer (issue #251)**
- Reviewed and merged. CSS-only change: `select-none` on ZoneDesigner root div with form element exclusions via Tailwind arbitrary variants (`[&_input]:select-text`, etc.).
- Zero risk — no logic modifications. TypeScript compiles clean.

**PR #256 — feat: insert room on exit (issue #252)**
- Reviewed and merged. Adds `handleInsertRoomOnExit()` to ZoneDesigner — creates a corridor room at midpoint between two connected rooms, rewires exits bidirectionally.
- Non-atomic multi-step operation (create room → delete old exits → create 4 new exits) is consistent with existing zone designer patterns. Proper guards: confirm dialog, busy state, portal exclusion.
- Button appears in both exit-pair and single-exit panels. Purple dashed border styling distinguishes from standard CRUD.
- TypeScript compiles clean. `Split` icon from lucide-react added to imports.
- **Key file:** `packages/client/src/pages/admin/ZoneDesigner.tsx`

### 2026-04-01: Sprint 3 PR Review — Corpse, Strongholds, Refuge, Death Routing
- **PRs Reviewed:** #258 (Corpse/Loot), #259 (Faction Strongholds), #260 (Repurpose Refuge), #261 (Death/Spawn Routing)
- **Verdicts:**
  - #258 ✅ APPROVE — Solid CorpseSystem, proper soulbound filtering, 33 tests. GDD §6.8 alignment strong.
  - #259 ✅ APPROVE — Clean stronghold zones, proper migration 013, good routing utilities. 21 tests.
  - #260 ❌ REQUEST CHANGES — Missing migration for Refuge category hub→dev. Modified 003_seed_zones.sql which is already applied. Needs new 014_repurpose_refuge.sql. Assigned to Jarlaxle.
  - #261 ⚠️ APPROVE WITH NOTES — Good death/spawn routing integration. Client needs /api/spawn-zone wiring (Regis follow-up). 17 tests.
- **Cross-PR risks:** All 4 branches share dependency commits from #258 and #259. PRs #260 and #261 both include all changes from the dependency branches. Merge order must be: #258 → #259 → #260 (after fix) → #261.
- **Architecture observations:**
  - Client hub detection hardcodes 4 zone slugs — fragile pattern, needs server-sent isHub flag in future
  - playerFactionSlugs cache won't update mid-session — acceptable since faction changes require re-login
  - All 3 strongholds use flooded_crypt theme — should be diversified in future pass
  - Migration system tracks by filename — modifying already-applied seed files is a recurring team pitfall

---

## 2026-04-04: Merge Round — All 7 Sprint 3/4 PRs to Dev

**Status:** ✅ Complete

### PRs Merged (in order)

1. ✅ **PR #258** (Corpse/Loot) — Drizzt author. Clean merge. Base for later PRs.
2. ✅ **PR #259** (Faction Strongholds) — Jarlaxle author. Clean merge. Unblocks #260, #261.
3. ✅ **PR #264** (DB Schema) — Drizzt author. Clean merge. Independent.
4. ✅ **PR #262** (Client UI Terminology) — Independent. Clean merge.
5. ✅ **PR #263** (Generator Cleanup) — Jarlaxle author. Merge after base moved. 3 conflicts resolved (config, test imports). 153 tests pass.
6. ✅ **PR #261** (Death/Spawn Routing) — Drizzt author. Depends on #259. Clean merge.
7. ✅ **PR #260** (Repurpose Refuge) — Jarlaxle author. Rejected once (missing migration), fixed by Drizzt, then merged.

### Test Results

- Server: 2187 tests passing
- Client: All passing
- Zero regressions

### Key Outcomes

- All 7 squad issues (#236-#242) completed and merged to dev
- Migration Discipline decision established (seed files pair with numbered migrations)
- Full backlog clear
- Ready for Sprint 5 planning

### Elminster's Role in Merge Round

- Reviewed all 7 PRs and established merge order (#258→#259→#260→#261 dependency chain)
- Flagged PR #260 rejection (missing migration for Refuge category change)
- Documented Migration Discipline decision (seed files must pair with numbered migrations for existing databases)
- Identified cross-PR architecture observations (client hub detection fragile, faction cache acceptable, stronghold theme diversity deferred)
- Approved all 7 PRs once corrections applied (PR #260 fix by Drizzt)
- Verified zero regressions post-merge

---

## 2026-04-04: Zone Designer Migration Architecture
**Scope:** Long-term strategic redesign of zone designer from hand-rolled BFS + SVG to elkjs + ReactFlow

### Analysis Completed
- **Current architecture review:**
  - Layout: `computeLayout.ts` (~2700 lines, 8-phase BFS pipeline, no crossing penalty)
  - Rendering: `ZoneDesigner.tsx` (~3600 lines, hand-rolled SVG, <line> elements, no routing)
  - Grid: 100×100 cells with 50×50 room nodes
  - Features: Room CRUD, exit pairing, floor switching, orphan detection, context menus, insert-room-on-exit
  
- **Pain points identified:**
  - Exit crossings (15–30% unnecessary) make topology hard to trace
  - No pan/zoom/minimap for large zones (100+ rooms)
  - No edge routing; straight lines cross visually even when topologically valid
  - Visual polish ceiling (curves, glow, shape variety require manual SVG work)
  - Tight coupling of layout + rendering logic

### Decision Approved
**Strategic direction:** 6-phase migration to elkjs + ReactFlow with visual improvements
- **Why elkjs:** Proven crossing minimization (Sugiyama algorithm), direction-aware port constraints, Z-axis support, fast (~100–300ms for typical MUD zones)
- **Why ReactFlow:** Complete pan/zoom/minimap/routing built-in, component-based rendering (decouples UI from graph logic), active maintenance, React-friendly
- **Why phased:** Each phase delivers standalone value; no big-bang rewrite; parallel work possible; reversible

### Phased Breakdown
1. **Phase 0 (2–3d):** Dependencies, wrapper modules, verification (no behavior change)
2. **Phase 1 (1–2w):** Visual polish—Bezier curves, direction coloring, room shapes, glow (isolated SVG work, immediate user value)
3. **Phase 2 (1–2w):** Layout engine swap to ELK (crossing reduction, coordinate mapping)
4. **Phase 3 (2–3w):** ReactFlow migration (pan/zoom/minimap, full rendering refactor, major testing)
5. **Phase 4 (1–2w):** Post-migration polish (curved edges, shape variety leverage ReactFlow, animations)
6. **Phase 5 (1–2w):** Optional advanced features (undo/redo, search/filter, copy/paste rooms, templates)
7. **Phase 6 (1w):** Cleanup & deprecation (remove hand-rolled code, update tests, documentation)

### Architecture Decisions Recorded
- **File:** `.squad/decisions/inbox/elminster-zone-designer-migration-plan.md`
- **Key points:**
  - All existing CRUD operations preserved identically across all phases
  - Portal (inter-zone) exit logic separates from main layout (fallback to BFS if needed)
  - Z-axis (multi-floor) mapped as ELK layer constraints; verified in Phase 2 & 3
  - Floor switching pans reset on phase 3; pan position preserved within floor
  - Comprehensive testing checklist included (Phase 3)
  - Risk assessment: ELK visual diffs, ReactFlow accessibility, performance regression, Z-axis breakage—all mitigated

### Implementation Pattern
- **Codebase organization:**
  - `packages/client/src/map/elkLayout.ts` (NEW; ELK adapter)
  - `packages/client/src/components/map/ZoneDesignerFlow.tsx` (NEW; ReactFlow wrapper)
  - `packages/client/src/components/map/nodes/ZoneRoomNode.tsx` (NEW; room card)
  - `packages/client/src/components/map/edges/ZoneExitEdge.tsx` (NEW; exit line)
  - `packages/client/src/pages/admin/ZoneDesigner.tsx` (MODIFY; integrate ReactFlow)
  - `packages/client/src/map/computeLayout.ts` (KEEP; deprecate, used by player minimap)

- **Feature preservation matrix:** All room/exit CRUD, validation, floor switching, context menus, orphan detection, insert-room-on-exit—intact
  
- **New capabilities:** Exit crossing minimization (ELK), minimap (ReactFlow), Bezier curves & direction coloring & room shapes (Phase 1 & 4)

### Key Files
- **Plan:** `/home/saitcho/.copilot/session-state/f6a3b783-2d96-47f3-a91f-4e2737117cc2/plan.md` (20.5 KB, detailed 6-phase breakdown with risk matrix, timeline, success criteria)
- **Decision:** `.squad/decisions/inbox/elminster-zone-designer-migration-plan.md` (8 KB, architectural decision summary)
- **Source:** 
  - `packages/client/src/pages/admin/ZoneDesigner.tsx` (3625 lines)
  - `packages/client/src/map/computeLayout.ts` (2700+ lines, read first ~100 lines)

### Learnings & Patterns for Future Work
1. **Phased UI migrations:** Decompose big rewrites into 6–8 week phases where phases 1-2 can run in parallel, phases 3+ depend on prior. Early phases deliver user value (visual polish) while infrastructure (layout engine) is being built.

2. **Rendering + layout decoupling:** Hand-rolled SVG tightly couples layout computation (BFS order, coordinate transformation) with rendering (line drawing, text labels). Separating these into layers (layout adapter → coordinate map → rendering component) makes it easier to swap engines (BFS → ELK) without cascading UI changes.

3. **Compass direction constraints:** Game UIs with directional semantics (north/south/east/west exits) map cleanly to ELK's port-side constraints (NORTH/SOUTH/EAST/WEST), reducing impedance mismatch and making layouts more "correct" (respecting player mental models).

4. **Z-axis as layer assignment:** For multi-floor zones, treating vertical depth (up/down exits) as layer rank constraints (not spatial offsets) preserves 2D layout while encoding floor relationships—cleaner than forcing Z into spatial coordinates.

5. **Feature preservation audit:** Comprehensive feature matrix (CRUD, validation, interactions, new capabilities) essential for phased migrations. Ensures no silent regressions during refactor phases.

6. **Testing as architecture:** Phase 3 includes 16-item testing checklist (node click, edge click, context menu, floor switch, minimap, validation, content badges, etc.). This checklist is part of the architecture plan—not an afterthought.

---

## Learnings

### Architecture Patterns
- **Phased UI migration pattern:** Long-running UI refactors benefit from 6–8 week phase decomposition with early user-visible value (visual polish) running in parallel with infrastructure work (layout engine). Each phase is independently shippable; later phases depend on prior. Parallelization reduces wall-clock time.
- **Rendering + layout decoupling:** Separating layout computation from rendering (via an adapter layer) reduces coupling and makes swaps like BFS → ELK less disruptive. Component-based rendering (ReactFlow) vs. hand-rolled SVG further decouples concerns.
- **Compass direction constraints:** Game UIs with directional semantics map direction strings (north/south/east/west) directly to graph layout engine constraints (ELK port sides), respecting player mental models and improving layout quality.
- **Z-axis in graph layout:** Multi-floor zones encode vertical relationships as layer rank constraints (not spatial offsets), preserving 2D layout while capturing floor structure.
- **Feature preservation matrix:** Comprehensive table of CRUD/validation/interactions vs. phases ensures regressions are caught early. Serves as architecture spec + testing guide.

### User Preferences (Inferred from Requirements)
- **Visual polish matters:** User requested Bezier curves, direction coloring, room shapes, glow—suggests designers spend substantial time in zone designer, value aesthetic clarity
- **Topology clarity is blocking issue:** 15–30% unnecessary exit crossings mentioned as pain point—suggests current designer makes some zones hard to navigate visually
- **No breaking changes acceptable:** All existing CRUD operations must work identically; feature parity required across migration
- **Incremental delivery preferred:** User accepted 6–8 week timeline over 2-week big-bang, indicating preference for steady progress with early wins (Phase 1 visual polish available week 1–3)

### Zone Designer Feature Scope (Verified)
- **Room operations:** Create, rename, edit type/properties/description, assign NPCs/loot/hazards, delete (all with side panel editing)
- **Exit operations:** Create bidirectional or one-way exits, edit direction/modifiers (locked/hidden), create portal exits (cross-zone), delete, insert room on exit
- **Floor switching:** Multi-level zones supported; Z-axis computed from up/down exit graph structure; floor selector shows room counts per floor
- **Validation:** Entry room required, disconnected room detection, one-way exit warnings (computed in useMemo, displayed in bottom banner)
- **Context menus:** Room menu (add in 6 directions, edit, copy/paste properties, connect, delete), exit menu (insert room, edit, delete), canvas menu (clear selection)
- **Orphan management:** Detect exits pointing to non-existent rooms, bulk cleanup or selective removal
- **Visualization:** Room type colors, portal/floor-exit badges, disconnected room warnings, NPC/loot/hazard content badges, property tags
- **Interaction:** Select rooms/exits (side panel), hover tooltips, zoom (+ / - / 0 keyboard shortcuts, mouse wheel), pan (drag canvas), legend toggle

---


### 2026-04-04: Zone Designer Migration — Squad Label Triage Review
**By:** Elminster (Lead)  
**Reviewed:** Issues #266–#273 (Epic + 7 phases)  

## Triage Decisions

**Issue #266 — Epic (Tracking)**
- **Label:** `squad`, `squad:elminster`, `squad:minsc`, `squad:regis`
- **Rationale:** Epic is a tracking issue; all three squad members involved across phases. Elminster (added): architectural oversight of entire migration. Minsc (existing): testing in Phases 3 & 6. Regis (existing): primary implementer across all phases.
- **Removed:** `go:needs-research` — detailed plan exists; research complete.

**Issue #267 — Phase 0: Dependencies**
- **Label:** `squad`, `squad:regis`
- **Rationale:** Simple scaffolding work. Regis implements (npm install, wrapper stubs). No architecture review needed. Removed Elminster tag (not needed for routine setup).
- **Removed:** `go:needs-research`

**Issue #268 — Phase 1: Visual Polish**
- **Label:** `squad`, `squad:regis`
- **Rationale:** CSS/SVG work (Bezier curves, coloring, shapes, glow). Design is isolated from core layout/rendering architecture. Regis implements independently.
- **Removed:** `go:needs-research`, `squad:elminster` (not needed; no architecture decisions)

**Issue #269 — Phase 2: Layout Engine Swap (elkjs)**
- **Label:** `squad`, `squad:elminster`, `squad:regis`
- **Rationale:** Major architectural change (BFS → ELK). Regis implements; Elminster reviews layout adapter, Z-axis mapping, fallback strategy, and visual correctness vs. BFS. Added `squad:elminster`.
- **Removed:** `go:needs-research`

**Issue #270 — Phase 3: ReactFlow Integration**
- **Label:** `squad`, `squad:elminster`, `squad:minsc`, `squad:regis`
- **Rationale:** Most complex phase (full rendering refactor, interaction layer, pan/zoom/minimap). Regis implements. Elminster reviews architecture (decoupling, event handlers, state management). Minsc tests 16-point checklist (node/edge interaction, context menus, floor switching, validation, minimap). Added `squad:elminster` and `squad:minsc`.
- **Removed:** `go:needs-research`

**Issue #271 — Phase 4: Visual Enhancements**
- **Label:** `squad`, `squad:regis`
- **Rationale:** Leverages ReactFlow capabilities (curves, shapes, animations). Regis implements; no architecture decisions.
- **Removed:** `go:needs-research`

**Issue #272 — Phase 5: Advanced Features (Optional)**
- **Label:** `squad`, `squad:regis`
- **Rationale:** Optional scope (undo/redo, search, copy/paste). Regis if prioritized. No review needed unless blocking.
- **Removed:** `go:needs-research`

**Issue #273 — Phase 6: Cleanup & Deprecation**
- **Label:** `squad`, `squad:minsc`, `squad:regis`
- **Rationale:** Final cleanup (remove old code, update tests/docs). Regis implements; Minsc verifies nothing broke (regression test suite).
- **Removed:** `go:needs-research`

## Pattern: `go:needs-research` Removal

All 8 issues had `go:needs-research` labels despite a **detailed 20KB plan with 6-phase breakdown, risk matrix, feature preservation matrix, and success criteria already written**. Research is complete; work is implementation-ready. Removed from all issues.

## Assignment Rationale

**Regis (Primary):** Frontend dev, zone designer domain expert. Implements all phases.

**Elminster (Review):** Architecture decisions occur in Phases 2 & 3 (layout engine swap, rendering refactor, integration). Reviews to ensure:
- ELK adapter correctly maps compass directions to port constraints
- Z-axis handling preserves multi-floor correctness
- ReactFlow integration properly decouples layout from rendering
- Event handler architecture is sound (context menus, node/edge clicks)
- State management doesn't regress on existing CRUD operations

**Minsc (Testing):** Phases 3 & 6 include comprehensive testing (16-point checklist in Phase 3, regression suite in Phase 6). Minsc verifies:
- Node/edge interaction correctness
- Floor switching preserves state
- Validation warnings display correctly
- Performance on large zones (100+ rooms)
- No regressions to existing CRUD

## Outcome

All 8 issues now have correct squad labels aligned with work scope. Epic (#266) clearly owns the tracking and team alignment. Phases with architecture decisions (2, 3) include Elminster review. Phases with testing scope (3, 6) include Minsc QA. Regis owns implementation across all phases.

### 2026-04-05: Triage Action Mislabeling Investigation

**Reported issue:** Squad triage GitHub Action "seems to mislabel things often."

**Analysis completed:** Reviewed `.github/workflows/squad-triage.yml` and related workflows (squad-issue-assign.yml, sync-squad-labels.yml) to identify root causes.

**Root causes identified:**
1. **Unconditional `go:needs-research` verdict** — All triaged issues receive this label, even implementation-ready phases and epic trackers that should be `go:yes`. Lines 202–208 apply verdict without checking issue type or scope clarity.
2. **Type blindness:** Workflow has no epic/tracking issue detection. Can't distinguish parent decompositions from implementation work. Keywords match against roles (frontend, backend) but not against issue structure (EPIC, PHASE, sub-issues). Results in epics receiving domain member labels (squad:regis, squad:minsc) when they should route to Lead only.
3. **Multiple member labels allowed:** Workflow adds one label correctly, but post-triage manual editing permits label stacking (squad:elminster + squad:regis + squad:minsc on same issue). No guard against ambiguous ownership.

**Evidence from zone-designer migration (#266–#273):**
- #266 (EPIC tracker): Received squad:elminster + squad:minsc + squad:regis (ambiguous DRI)
- #267–#272 (Phases 0–5): Marked go:needs-research but have detailed acceptance criteria (should be go:yes)
- #273 (Phase 6 cleanup): Also received multiple labels + wrong verdict

**Fixes recommended (see full decision in `.squad/decisions/inbox/elminster-triage-action-review.md`):**
1. Smart verdict logic: check issue type (epic/phase) and scope clarity → assign go:yes or go:needs-research conditionally
2. Epic detection: route epics to Lead-only (squad:elminster), not to domain members
3. Label enforcement: add guard to prevent multiple squad:{member} labels per issue
4. All fixes are low-risk config/logic changes; no schema or architectural changes needed

**Next steps:** Fixes are outlined with file paths and line numbers in decision document. Implementation ~40 lines of added logic across two workflows.

## Learnings — GDD §6 Combat Audit (2026-07-25)

### Combat System Architecture
- **CombatSystem lives at** `packages/server/src/combat/CombatSystem.ts` — tick-based orchestrator called by ZoneRoom.update()
- **Supporting files:** `CombatState.ts` (types), `actions.ts` (narration events), `damage.ts` (damage model with dodge chance)
- **Creature AI:** `packages/server/src/creatures/behavior.ts` — deterministic state machine (idle/alert/hostile/fleeing). Simple targeting: `playersHere[0]`
- **DowningSystem:** `packages/server/src/systems/DowningSystem.ts` — bleed-out/stabilize. Diverges from GDD §6.7 ("no downed state")
- **CorpseSystem:** `packages/server/src/systems/CorpseSystem.ts` — lootable corpses with TTL decay. Fully implemented.
- **DeathPenalty:** `packages/server/src/systems/DeathPenalty.ts` — exponential decay curve, 30-min duration, persistence layer
- **TraceSystem:** `packages/server/src/systems/TraceSystem.ts` — ephemeral environmental traces, not combat-specific
- **Client combat UI:** `packages/client/src/pages/ZoneExploration.tsx` — HP bar, combat action buttons, enemy status sidebar, tick timer

### Key Gaps Identified (Issues #278-#286)
- **No auto-attack baseline** — defaults to dodge, not strike (#278)
- **No ability/cooldown system** — CombatAction type stubs exist but no resolution (#279)
- **No enemy telegraphs** — no wind-up/intent/reaction windows (#280)
- **No threat tables** — creatures target first player, no damage-based aggro (#281)
- **No room positioning** — no Front/Flank/Rear zones (#282)
- **No signal classification/batching** — partial combatSubtype, no micro-batching (#283)
- **Combat HUD gaps** — no stamina bar, no group frames, partial target panel (#284)
- **Flee always succeeds** — no skill check, no post-combat cooldown (#285)
- **DowningSystem divergence** — exists but GDD says no downed state (#286)

### Patterns Observed
- Combat system is well-structured for extension — `CombatSystem.resolveTick()` has clear phases that map to GDD tick loop
- Simultaneous damage resolution (all damage from start-of-tick HP) is correct and matches GDD determinism requirement
- Shared types (`@ellmud/shared`) have forward-looking stubs (stamina fields, CombatAction variants) that are unused
- Client has anticipatory tests (ux-batch2-combat-sidebar.test.tsx) for UI gaps that aren't yet implemented

### Decisions Made
- **Combat brainstorm exclusions confirmed:** Layers 3 (spatial anchoring), 4 (threaded logs), 8 (cinematic effects), 9 (readability modes), 10 (architecture) correctly excluded from GDD. No gaps from these.
- **DowningSystem recommendation:** Keep it (Option A), update GDD to document it. Good group dynamics.
- **Issue priority order:** #278 (auto-attack) → #279 (abilities) → #281 (threat) → #280 (telegraphs) → #285 (flee) → #283 (narration) → #284 (HUD) → #282 (positioning) → #286 (GDD alignment)


### 2026-04-04: GDD §6 Combat System Audit Complete
- **Decision:** Systematic audit of GDD §6 (all subsections §6.1–§6.11) against the codebase identified 9 implementation gaps and 1 GDD alignment issue. Decision filed to `.squad/decisions/decisions.md`.
- **Outcome:** 9 GitHub issues created (#278-#286) mapping GDD gaps. All issues labeled `squad` with dependency analysis embedded.
- **Key finding:** DowningSystem is positive divergence from GDD §6.7. Recommendation: update GDD, don't remove the system.
- **Architectural strength:** CombatSystem.resolveTick() is well-structured for extension. Simultaneous damage resolution is correct and matches GDD determinism requirement.
- **Critical gap:** Creature AI targeting—creatures targeting `playersHere[0]` makes group combat meaningless. Threat tables (#281) should be high priority.
- **Priority order:** #278 (auto-attack) → #279 (abilities) → #281 (threat) → #280 (telegraphs) → #285 (flee) → #283 (signals) → #284 (HUD) → #282 (positioning) → #286 (GDD update).

### 2026-04-08: PR #291 — Zone Designer Layout Port to elkjs and ReactFlow
- **Author:** dkirby-ms
- **Scope:** Major architectural port from canvas-based rendering to ReactFlow + elkjs layout engine
- **Files:** 29 files changed (+6031/-639), including new test suite (1548 lines)
- **Status:** REVIEWED — comprehensive architectural review posted, ready to merge (author cannot self-approve)

**Architecture Review:**

The PR successfully ports the zone designer to ReactFlow with a hybrid BFS+ELK layout strategy. Key architectural decisions:

1. **Hybrid Layout Pattern:**
   - BFS (computeLayout.ts) seeds compass-correct positions (north=up, east=right)
   - ELK's 'fixed' algorithm preserves BFS positions while handling disconnected components
   - ReactFlow's getBezierPath() handles edge routing (Bézier curves)
   - Clean separation of concerns: BFS (compass semantics) + ELK (validation) + ReactFlow (rendering)

2. **Floor Separation:**
   - Multi-floor zones split by z-level
   - Each floor gets its own ELK layout pass
   - Cardinal exits only (up/down exits filtered out for 2D layout)
   - Floor selector UI for layer switching

3. **Custom ReactFlow Components:**
   - ZoneRoomNode: Type-based shapes (shield, diamond, pentagon, hexagon), badge overlays (portals, NPCs, loot), property icons
   - ZoneExitEdge: Direction-based gradients, hover/selection states, orphan/portal/oneway markers, lock/hidden indicators
   - ZoneDesignerFlow: Controlled selection, SVG markers/gradients, floor indicator overlay

4. **State Management:**
   - Layout computation in useEffect with rooms/exits dependency
   - Async ELK layout with loading state
   - Floor-filtered ReactFlow nodes/edges
   - Selection state owned by parent (ZoneDesigner.tsx)

5. **Test Coverage:**
   - 5 new test files (1548 lines total)
   - elk-layout.test.ts: Floor assignment, multi-floor separation, exit filtering
   - useUndoRedo.test.ts: Operation stack, keyboard shortcuts, API integration
   - zone-designer-flow.test.tsx: Node/edge rendering, selection, hover handlers
   - zone-exit-edge.test.tsx: Edge styling, markers, hover states
   - zone-room-node.test.tsx: Type-based shapes, badges, search/dimmed states
   - All tests pass, no regressions

**Feature Preservation:**
- ✅ Search/Filter (Phase 5.2): searchQuery, directionFilter, Ctrl+F shortcut
- ✅ Undo/Redo (Phase 5.1): useUndoRedo hook, keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
- ✅ Floor navigation: Multi-floor layout, floor selector, floor indicator
- ✅ Context menus: Room/exit right-click menus
- ✅ Connect mode: Source/target selection, direction inference
- ✅ Orphan detection: getOrphanedExits API, red highlighting
- ✅ Portal exits: Inter-zone badges, cyan coloring
- ⚠️ Minimap: Disabled per user request (ReactFlow component available for re-enable)

**Decision Alignment:**
- ✅ Implements "ELK as Sole Layout Engine" decision (2026-04-05)
- ⚠️ **Clarification needed:** elkLayout.ts uses computeLayout.ts for BFS seeding (line 107), not as a fallback. This is a valid use case — BFS provides compass-aware positions that ELK preserves. The decision doc should be updated to note elkLayout.ts also uses it for seeding.

**Code Quality:**
- Clean separation of concerns (layout → conversion → rendering)
- Type-safe interfaces, no `any` types in core logic
- Declarative ReactFlow node/edge construction
- Error handling for layout failures
- Inline comments explaining non-obvious decisions

**Dependency Audit:**
- New: `@xyflow/react` ^12.10.2 (successor to deprecated react-flow-renderer)
- New: `elkjs` ^0.11.1 (Eclipse Layout Kernel JS port)
- Both well-maintained, large user bases, ~150KB gzipped combined
- Acceptable bundle size for admin tool

**Non-Blocking Recommendations:**
1. Update decision record to clarify computeLayout.ts seeding use case
2. Consider layout caching for large zones (100+ rooms)
3. Document minimap disable reason in ZoneDesignerFlow.tsx
4. Split ZoneDesigner.tsx (~1400 lines) into sub-components when it exceeds 2000 lines

**Key Files:**
- packages/client/src/map/elkLayout.ts (new layout engine)
- packages/client/src/components/map/ZoneDesignerFlow.tsx (ReactFlow wrapper)
- packages/client/src/components/map/ZoneRoomNode.tsx (custom node component)
- packages/client/src/components/map/ZoneExitEdge.tsx (custom edge component)
- packages/client/src/pages/admin/ZoneDesigner.tsx (main integration)
- packages/client/src/hooks/useUndoRedo.ts (undo/redo stack)

**Patterns Learned:**
- Hybrid BFS+ELK layout is the right pattern for compass-aware graph layout (BFS seeds, ELK validates)
- ELK's 'fixed' algorithm preserves seed positions while handling disconnected components
- Floor separation via z-level grouping enables 3D dungeon visualization in 2D
- Controlled ReactFlow selection (parent owns state, Flow is pure presentation)
- Custom node/edge types registered once (no runtime type resolution)
- Declarative node/edge conversion from zone data (clean separation from rendering)
- **Orchestration log:** `.squad/orchestration-log/2026-04-04T22-25-elminster-combat-audit.md`

### 2026-04-04: Phase 3 Completion Coordinated
- **Status:** Regis Phase 3 (ReactFlow integration) merged; Minsc Phase 3 (test cases) delivered; orchestration logs written.
- **Regis outcome:** PR #276 merged (+2004/-516). Zone designer refactored to ReactFlow with custom ZoneRoomNode, ZoneExitEdge, ZoneDesignerFlow. All 146 tests passing.
- **Minsc outcome:** 94 test cases across zone designer components. All pending .todo() activation. Ready for component merge validation.
- **Session log:** `.squad/sessions/2026-04-04T22-25-combat-audit-phase3.md`

### 2026-04-04: GDD §6.7 Updated — DowningSystem Documented
- **Task:** Update GDD §6.7 (Meaningful Death) to match the DowningSystem implementation (closes alignment issue from combat audit #286).
- **Changes:** Replaced the 5-line "instant death at 0 HP" section with full documentation of the downing/bleedout/stabilization flow: downed state, 10-tick bleed-out timer, `stabilize` command (2-tick channel, bandage required, interruptible), finishing blow mechanic, stabilized state protection, and attribution tracking.
- **Cross-references updated:** §8.3 (PvP combat flow) and §8.5 (group zone entry death rules) now reference the downing system.
- **Design decision preserved:** Solo players still have no safety net; the rescue window rewards group coordination without reducing risk for lone wolves.

### 2026-04-08: PR #292 Review — NarrationService LLM Wiring (BLOCKED)
- **Author:** dkirby-ms (attributed to Jarlaxle in task)
- **Scope:** Wire NarrationService + Azure AI Foundry LLM client into ZoneRoom runtime
- **Files:** 6 files (+406/-6): config.ts, factory.ts (new), ZoneRoom.ts, narration-wiring.test.ts (new), KNOWN_ISSUES.md, elminster/history.md
- **Status:** BLOCKED — critical async latency issue in onJoin flow, requires fix before merge

**Architecture Review:**

✅ **Strengths:**
1. **Factory Pattern:** `createNarrationService()` is a clean pure function with environment-based instantiation. Conditionally creates LLMClient when `AZURE_AI_ENDPOINT` and `AZURE_AI_KEY` are present, falls back to template-only mode when not configured.
2. **Config Safety:** `azureAI?: { endpoint, apiKey, deploymentName, apiVersion }` typed as optional. No secrets logged. Defaults (`gpt-4o-mini`, `2024-08-01-preview`) align with Bicep infrastructure.
3. **Lifecycle Timing:** `onCreate()` instantiation is correct — after system init, before player connections. One-time setup, shared across room.
4. **Graceful Fallback:** NarrationService handles `llmClient: null` via template-only mode. No additional error handling needed at factory level.
5. **Test Coverage:** 6 integration tests covering factory instantiation, config loading, defaults, mock transport, and fallback. All pass.
6. **KNOWN_ISSUES Update:** Issue #2 accurately reframed from bug to feature gap. Next steps (room descriptions, combat narration) correctly documented.

🚨 **BLOCKING ISSUE — onJoin Async Latency:**

**File:** `ZoneRoom.ts:486`  
**Problem:** `await this.generateNarration('event', playerId, startRoom, ...)` in `onJoin()` blocks player join until narration completes (up to 2000ms on cache miss + LLM timeout).

**Impact:**
- Player connection hangs 0-2000ms before receiving game state
- Colyseus `onJoin` blocks room state updates while awaiting
- Poor UX: "connecting..." spinner for 2 seconds on first zone entry
- **Violates GDD §4.5 core principle: "LLM never blocks critical path"**

**Required Fix:** Fire-and-forget pattern — don't await narration in `onJoin()`. Send player state immediately, narration arrives asynchronously 0-2000ms later. Client protocol already handles async narration delivery.

Alternative: Send fallback text synchronously, fire background enrichment for cache.

**Minor Issue:** Typo at line 1898: `narratonType` → should be `narrativeType`

**Decision Alignment:**  
Reviewed against `.squad/decisions.md` (2026-04-05 NarrationService factory decision):
- ✅ Factory creates NarrationService with Azure LLMClient when env vars present
- ✅ Environment-based configuration (static at startup, not dynamic per-call)
- ✅ Graceful degradation to template-only mode
- ✅ Config reading happens once at factory call
- ✅ ZoneRoom instantiates in `onCreate()`
- ✅ Initial wiring uses entry narration as proof-of-concept

The implementation correctly executes the decision. The async latency issue is an implementation detail not covered by the decision doc (which focused on factory pattern, not call-site integration).

**Verdict:** Architecture is sound. Factory pattern is correct. Fallback logic is correct. Config handling is correct. The only blocking issue is the `onJoin` await behavior. Once fixed, this is ready to merge.

**Review posted:** https://github.com/dkirby-ms/ellmud/pull/292#issuecomment-4188065623

**Key Learning:** When integrating async services into Colyseus lifecycle hooks (`onJoin`, `onLeave`), avoid awaiting non-critical operations. The narration is optional enrichment, not required for player state initialization. Fire-and-forget is the right pattern for async narration in join flow.
### 2026-04-05: PR #294 Review — Auto-Attack Baseline (GDD §6.1–§6.2)
**By:** Elminster (Lead / Architect)  
**PR:** #294 (Drizzt)  
**Issue:** #278  

## Decision
Approved PR #294 implementing auto-attack baseline and target management per GDD §6.1-§6.2. This is the foundational combat system change that flips the default action from dodge to auto-attack when a combatant has a valid, living target.

## Implementation Quality
**✅ GDD Compliance:**
- Default action changed from dodge to auto-attack when target is valid and alive
- Dodge is now an explicit player action, not a passive default
- Target tracking per-combatant (`currentTarget` field in CombatState)
- Auto-targeting on combat initiation (both attacker and defender, including PvP)
- `target <entity>` and `target next` command handlers
- Target death pauses auto-attack (falls back to dodge)
- Attack command integration (sets `currentTarget` when switching targets mid-combat)

**✅ Architecture:**
- Clean separation of concerns: `setTarget()`, `cycleTarget()`, `getHostilesInEncounter()` methods
- Proper validation: target must be in same encounter, alive, and hostile
- Single source of truth: `currentTarget` field drives the auto-attack tick logic in `resolveTick()`

**✅ Tests:**
- 14 new tests in `auto-attack.test.ts` covering all auto-attack and target management behavior
- All existing combat tests updated to reflect auto-attack baseline (46 assertions changed)
- Edge cases covered: dead target, no target, explicit dodge override, target cycling, hostile filtering

## Rationale
This is load-bearing combat system work. The auto-attack baseline is the foundation for abilities, positioning, and group combat (GDD §6.3, §6.11, §6.2). Drizzt executed this correctly — surgical changes, comprehensive tests, no unnecessary complexity.

The implementation follows the existing combat system patterns and maintains server-authoritative state. The `currentTarget` field is the single source of truth for auto-attack behavior, and the tick resolution logic correctly handles all edge cases (dead target, missing target, explicit action override).

## Team Impact
- **Minsc/Regis:** Combat UI will need to display current target and support target cycling (Tab key or `target next` command)
- **Future work:** Ability system (GDD §6.3) can now assume auto-attack baseline — abilities replace auto-attack on the tick, not dodge
- **Position system (GDD §6.11):** Will integrate with `currentTarget` for melee range validation

## Key Files
- `packages/server/src/combat/CombatState.ts` — Added `currentTarget?: string` field to Combatant
- `packages/server/src/combat/CombatSystem.ts` — Auto-attack tick logic, setTarget/cycleTarget methods
- `packages/server/src/commands/handlers/target.ts` — New command handler
- `packages/server/src/__tests__/auto-attack.test.ts` — 14 new tests

---

### 2026-04-05: PR #292 Review — Async Narration in Colyseus Hooks
**Role:** Lead / Architect  
**Task:** Review NarrationService wiring into ZoneRoom lifecycle hooks

## Outcome: BLOCKED — Requested changes

### Key Finding

PR #292 wires NarrationService + LLM client into ZoneRoom lifecycle hooks with proper factory pattern and fallback logic. However, `onJoin()` awaits `generateNarration()` call (line 486), blocking player join flow for 0-2000ms (LLM latency + cache miss).

**Violation:** GDD §4.5 — "LLM never blocks critical path"

### Blocking Issue Details

- **Impact:** Player sees "connecting..." spinner during join phase while LLM completes
- **UX:** First zone entry with cache miss = 0-2s latency spike
- **Scale:** 50 concurrent players/min × 2s = 100s aggregate blocking time/min
- **Solution:** Fire-and-forget pattern

### Approved Elements

- ✅ Factory pattern for NarrationService injection
- ✅ Fallback logic and timeout handling (2000ms)
- ✅ Test structure and coverage approach
- ✅ Type safety in service wiring

### Decision Documented

Created comprehensive decision document (`.squad/decisions/async-narration-pattern.md`) establishing fire-and-forget pattern for non-critical LLM calls:
- Entry narration, combat actions, movement → fire-and-forget
- Room descriptions (`look` command) → await with timeout (user requested)
- Key principle: "Await only when user or game state depends on result"

---

### 2026-04-05: PR #294 Review — Auto-Attack Baseline
**Role:** Lead / Architect  
**Task:** Review auto-attack targeting and target management implementation

## Outcome: APPROVED — Ready to merge

PR #294 implements auto-attack default targeting and target management per GDD §6.1-§6.2. All requirements met. 14 new tests, 46 updated assertions, all passing. No regressions.

---

### 2025-04-05: Decomposing Issue #312 (Exiting the Game Outside of Combat)
- **Task:** Research and decompose #312 — inn rooms, rent command, disconnect limbo visibility
- **Key findings:**
  - Feature rooms use a type-gated command dispatch system (`featureHandlers` map in `commands/index.ts`). Adding `feature_inn` + `rent` follows the exact same pattern as `feature_stash`/`stash` and `feature_expedition_board`/`board`.
  - `RoomType` union in `packages/shared/src/room-graph.ts` is the single source of truth for room types. All `feature_*` types auto-detected by `isFeatureRoomType()`.
  - Zone entry points defined by `entry_room_slugs` TEXT[] in `zones` table. Changing spawn to inn = updating this array in migration.
  - Faction strongholds seeded in migration `013_faction_strongholds.sql`. Each has 8 feature rooms + commons entry. Inn rooms will be migration ~017.
  - Disconnect already uses `playerState.disconnected = true` flag with 30s reconnection grace (`RECONNECTION_TIMEOUT_S` config, default 30). Players auto-dodge in combat while disconnected. Currently included in room occupants but flag not sent to clients.
  - Consented leave = close code 4000. `rent` should trigger this server-side after persisting state.
  - Client uses `navigate('/characters')` pattern for returning to character select (see `ZoneExploration.tsx` logout flow).
  - `RoomOccupantsMessage` currently sends `{ id, name }` per player. Adding `disconnected?: boolean` is non-breaking.
- **Decomposition:** 8 work items across Drizzt (4), Regis (2), Minsc (2). Critical path: WI-1→WI-2→WI-3→WI-5. Parallel track: WI-4→WI-6.
- **Decision file:** `.squad/decisions/inbox/elminster-312-decomposition.md`
- **GitHub comment:** Posted architecture summary on issue #312.

---

### 2026-01-25: Issue #337 — Combat Grid System Unified Proposal
- **Task:** Synthesize three team research documents (Jarlaxle systems, Regis frontend, Laeral visual design) into unified architectural proposal for DCSS-style grid combat
- **Research reviewed:**
  - `docs/design/337-combat-grid-systems.md` (695 lines) — Grid mechanics, tick integration, creature AI, backward compatibility
  - `docs/design/337-combat-grid-frontend.md` (945 lines) — DCSS tilesets, Canvas 2D rendering, WebSocket sync, accessibility
  - `docs/design/337-combat-grid-visual-design.md` (572 lines) — Creature representation, faction theming, fog-of-war, pixel art direction
- **Key finding:** All three analyses converge on technical feasibility BUT identify two critical unknowns:
  1. Can grid state be comprehensible in text-only mode? (MUD accessibility requirement)
  2. Will performance hold at 20 players + 10 creatures per 1s tick? (900 range checks + pathfinding)
- **Architectural synthesis:**
  - Grid dimensions: 8-12 tiles per room, variable by room type
  - Movement: 1 tile = 1 action, integrated into existing tick loop
  - Backward compatibility: Zone derivation from grid coordinates (Front = y≤3, Flank = 4-6, Rear = 7+)
  - Rendering: Canvas 2D + DCSS CC0 tiles (not WebGL, not SVG, not DOM-based ASCII)
  - Server-authoritative state with WebSocket sync (no client-side prediction in Phase 1)
  - Performance optimization: Distance matrix caching (O(n²) → O(1)), path caching (3-5 tick reuse)
- **Conflict resolution:**
  - **Text rendering:** Phase 1 includes BOTH text coordinates AND Canvas prototype (validate both approaches)
  - **LOS/fog-of-war:** Defer to Phase 2 (coupled features, implement together or not at all)
  - **Mobile support:** Desktop-only Phase 1, evaluate mobile demand before investing in touch UI
  - **Animations:** Static grid Phase 1, movement tweens Phase 2, polish Phase 3 (ruthlessly minimal at each phase)
- **Risk assessment:**
  - Risk 1 (HIGH): Text-mode rendering unreadable → Mitigate with SPIKE Phase validation, ASCII grid fallback
  - Risk 2 (HIGH): Performance degradation → Mitigate with distance/path caching, defer LOS to Phase 2
  - Risk 3 (MEDIUM): Content design complexity → Make grid opt-in per room (boss fights only), build editor tooling
  - Risk 4 (MEDIUM): User rejection → Grid is optional/toggleable, text-first preserved, early playtester feedback
  - Risk 5 (MEDIUM): Development time underestimated → Strict phase boundaries, tight go/no-go gates
- **Recommendation:** **SPIKE → GO/NO-GO → PHASE 1 (if approved)**
  - SPIKE Phase (1 week): ASCII grid prototype, Canvas visual prototype, performance benchmark with 30 entities
  - Phase 1 (3-4 weeks, if SPIKE passes): Minimal grid on 1-2 boss rooms, no LOS/cover/animations
  - Phase 2-3 (post-launch): Tactical depth + visual polish
  - **Priority assessment:** Grid is **optional enhancement, not core requirement**. Recommend post-launch Phase 2 unless dkirby-ms views it as flagship feature.
- **Open questions for dkirby-ms:**
  1. Timeline: Pre-launch or post-launch? (8-14 weeks vs defer)
  2. Text tolerance: Acceptable ASCII awkwardness threshold?
  3. Default state: Grid opt-in or opt-out?
  4. Art budget: Free DCSS tiles or custom pixel art (\$500-1500)?
  5. Success criterion: When is this "good enough to ship"?
- **Deliverables:**
  - `docs/design/337-combat-grid-proposal.md` (unified proposal, 400+ lines)
  - GitHub issue comment with summary + link to proposal
- **Key lesson:** When synthesizing multi-perspective research, identify **convergence points** (shared conclusions) vs **divergence points** (conflicts requiring architectural decisions). Resolve conflicts with clear rationale based on project constraints (text-first MUD identity, performance targets, phased delivery model). Front-load risk with SPIKE Phase — validate critical unknowns before heavy investment. Use strict go/no-go gates to enable early exit if any phase fails validation criteria.
- **Architectural patterns:**
  - **Grid as optional overlay:** Text-first combat remains fully functional, grid supplements but doesn't replace
  - **Backward compatibility via zone derivation:** New grid systems coexist with existing zone-based logic (no breaking changes)
  - **Phased risk reduction:** Minimal → Tactical → Polish, with go/no-go gates between each phase
  - **Performance through caching:** Pre-compute expensive operations (distance matrix, pathfinding), reuse across tick
- **Key files:** `docs/design/337-combat-grid-*.md` (3 research docs), `docs/design/337-combat-grid-proposal.md` (unified synthesis), `packages/server/src/combat/CombatSystem.ts` (integration point), `packages/client/src/components/CombatHUD.tsx` (client integration point)

## Help Command Implementation Wave (Issue #340, Commit 795994e)

**Date:** 2026-04-07  
**Role:** Lead Researcher  
**Status:** ✅ Complete

**Research Deliverables:**
- Comprehensive inventory of 37 commands across all handlers
- Issue #340 requirements analysis and validation
- GitHub issue coordination (label progression: go:needs-research → go:yes)
- Unblocked concurrent implementation by Drizzt and Minsc

**Key Research Findings:**
- 7 command categories identified (Navigation, Items, Communication, Combat, Special Actions, Feature Rooms, Dev Tools)
- Context-aware filtering requirements: room type matching + dev mode gating
- Help modes: general listing (no args) + detailed per-command (with args)
- Alias support essential for UX (`?` → `help`)

**Coordination Impact:**
- Early research findings enabled parallel development pipeline
- Spec clarity prevented implementation rework
- GitHub status updates kept stakeholders informed of progress
- Team synchronization maintained across 3 concurrent work streams

**Learned Patterns:**
- Research-first approach unblocks parallel implementation work
- Static metadata registries provide single source of truth for command documentation
- Context-aware filtering improves player UX by showing only relevant commands
- Help is discovery tool → must never be feature-gated

### 2026-04-08: PR #350 Code Review — Repo Hygiene (Issue #343)

**Task:** Architectural review of PR #350 (9 files for open-source readiness: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, .editorconfig, issue templates, PR template, release workflow)

**Review Scope:**
1. Correctness — Does content match the project (Ellmud, Node.js/TypeScript, monorepo)?
2. Completeness — Are there gaps or missing sections?
3. Consistency — Do references match actual repo structure?
4. release.yml — Does the workflow make sense for Docker/Azure deployment?

**Findings — 7/9 Files Approved:**
- **LICENSE (ISC):** Correct. Matches package.json exactly. Attribution year (2026, dkirby-ms) is accurate.
- **CONTRIBUTING.md:** Excellent. Clear workflow (pick issue → branch from dev → test/lint/build → conventional commits → PR). References docs/setup.md (verified exists). Code style honesty (TypeScript, ESLint, patterns, comments for complex logic only). Proper scoping of areas (Game Logic, Client, Backend, Docs). Minor note: Line ~127 references "Discord server" without link. Non-blocking; can add link when Discord is created or change to "GitHub Discussions."
- **CODE_OF_CONDUCT.md:** Correct. Contributor Covenant 2.0 adaptation. Enforcement escalation is sound (private → warning → mute → ban). Covers GitHub + Discord + other channels. Pledge and Standards are inclusive.
- **SECURITY.md:** Appropriate. 48-hour vulnerability acknowledgement SLA is reasonable for v0.1.0. Does NOT encourage public disclosure before fix. Best practices cover actual threat surface: .env secrets, Azure AI keys, PostgreSQL/Redis credentials, Microsoft Entra integration. Version support table (Latest: Supported, Older: Not supported) acceptable for pre-release.
- **.editorconfig:** Well-configured. 2-space indent (matches npm/Node convention, existing codebase), LF with final newlines, UTF-8, markdown whitespace preservation (correct: no trim trailing whitespace), Makefile tabs (correct).
- **Issue Templates (bug_report.md, feature_request.md):** YAML frontmatter correct. Templates guide toward reproducibility. Bug template includes environment (OS, Node version, browser, game version). Feature template emphasizes problem/solution/alternatives/impact.
- **PULL_REQUEST_TEMPLATE.md:** High-quality. Testing checklist (build, lint, test) enforces code quality gate. Type-of-Change covers all relevant categories. Rebase guidance on `dev` aligns with CONTRIBUTING.md workflow.

**Finding — 1/9 File Rejected (release.yml):**

**CRITICAL ISSUE — Line 87 uses deprecated GitHub Action:**
```yaml
- name: Create GitHub Release
  uses: actions/create-release@v1
```
The `actions/create-release@v1` action was deprecated Dec 2022 and archived. GitHub may remove it from the Marketplace at any time. Future release runs will fail to create GitHub Releases, leaving the project with unpublished releases (tags pushed, no Release artifacts).

**Fix:** Replace with `ncipollo/release-action@v1` (well-maintained, 3000+ stars, widely used in industry).

**MINOR ISSUE — Line 53 (non-blocking):**
```yaml
- name: Sync workspace versions
  run: npm run version:sync
  continue-on-error: true
```
The `continue-on-error: true` flag allows the workflow to proceed even if `npm run version:sync` fails. If sync fails, packages/client|server|shared will have stale versions. Recommendation: Remove `continue-on-error: true` so failures are visible.

**POSITIVE FINDINGS — Workflow Logic:**
- Line 27: Correct checkout of `main` branch with `fetch-depth: 0` (needed for tag history)
- Line 37: Uses `.nvmrc` for Node version (verified: set to 20)
- Line 50: Non-interactive `npm version ${{ github.event.inputs.version }}` is correct
- Lines 75-81: Fallback tag lookup handles edge case (first release) with `HEAD` → correct
- Line 17-18: Permissions (`contents: write`, `pull-requests: read`) are correct for release creation

**Permissions Check:** ✅ The `contents: write` permission is declared and sufficient for a replacement release action.

**Verdict:** REQUEST CHANGES. The release workflow is otherwise well-designed for the monorepo (it calls `npm run version:sync` to propagate version bumps to workspace packages/client|server|shared). The deprecated action is the only blocker.

**Next Step:** Danilo/dkirby-ms updates release.yml to use `ncipollo/release-action@v1`, re-pushes, Elminster will approve + merge.

**Architectural Patterns Validated:**
- Manual trigger (`workflow_dispatch`) is appropriate for v0.1.0 (developer-controlled releases, not automatic on tag)
- Monorepo versioning via `npm version` + `npm run version:sync` is the correct approach (tested: sync script exists and works)
- Changelog generation from git log is pragmatic MVP (can be upgraded to standard-changelog in Phase 2)
- GitHub Release as artifact repository (not relying on npm publish for game server) aligns with Docker deployment model

**Decision File:** `.squad/decisions/inbox/elminster-pr-350-review.md` (full detailed review, 8900+ words, ready for team reference)

### 2026-04-08: Room Features Architecture Proposal (Issue #345)
- **Task:** Research and design proposal for room features system — interactive triggers in rooms that players can examine via `look <target>` commands.
- **Analysis scope:** Current room data model (zone_rooms schema, ZoneRoomDefinition types), look command implementation (no arg handling today), feature-room pattern precedent (stash, sandbox, board), contract/quest system status (planned Phase 4, not yet implemented).
- **Data model decision:** Add JSONB column `features` to `zone_rooms` table. Follows established precedent (loot_containers, hazards, npcs all use JSONB). No new table needed — features are tightly coupled to rooms, no cross-room reuse, loaded once per zone.
- **Feature schema:** `{ id, keywords[], shortDescription?, longDescription, questId? }`. Keywords enable multi-word matching (`look wooden sign`). `questId` reserves space for future quest initiation without requiring migration.
- **Command flow decision:** Refactor `handleLook(ctx)` to dispatch on `args.length`. No args → full room (existing behavior). With args → exact keyword match on room features → fallback to "not found" error. Clean separation: `showFullRoom()` + `examineFeature()` helpers.
- **Keyword matching:** Exact match (case-insensitive), `args.join(' ')` for multi-word, first match wins. No fuzzy matching (predictable for authors, testable, no ambiguity). Rejected alternative: substring/partial matching (prone to unintended overlaps, unpredictable).
- **Quest integration:** Phase 2 work, blocked on Issue #44 (quest engine, currently `go:no` Phase 4). Schema reserves `questId` field now. When quest system lands, `examineFeature()` calls `ctx.questService?.tryInitiateQuest(questId)` and appends narration. Clean integration point, no rework needed.
- **Feature description strategy:** Phase 1 uses explicit authoring (add hint to room description: "There is a note on the wall"). Phase 2+ could inject `feature.shortDescription` dynamically. Decision: Start explicit (works today, zero code), add injection later if valuable.
- **Alternative rejected: Separate table:** `zone_room_features` table with FK to zone_rooms would normalize data but require join on zone load, add complexity to adapter, no query benefit (features only accessed via room).
- **Alternative rejected: Wait for quest system:** Ship narration-only features now (2-3 days), add quest hooks later. Rationale: Unblock content authoring, prove pattern, incremental risk, quest system is months away.
- **Risk assessment:** Low. Schema change is additive (DEFAULT '[]'), command flow is simple (no state, no multiplayer concerns), no external dependencies for Phase 1. Medium risk for Phase 2 (quest API undefined), mitigated by interface design now.
- **Implementation plan:** Phase 1 (2-3 days, Drizzt or Jarlaxle): Migration + types + adapter + command refactor + tests + seed examples. Phase 2 (depends on #44): Quest service integration, context injection, narration logic. Phase 3+ (optional): Hidden features, interactive verbs (use/activate), clickable UI, LLM narration.
- **Agent recommendation:** Jarlaxle (owns content pipeline, zone-adapter, JSONB precedent) or Drizzt (owns command system, look.ts, context building). Either qualified, recommend Jarlaxle if content seeding is priority.
- **Content authoring:** SQL updates to add features, coordinate room description changes. Future: Admin UI in Zone Designer (editable feature list, WYSIWYG editor, keyword validation).
- **Testing strategy:** Unit tests (keyword matching, fallback, edge cases), integration tests (load zone, examine feature, verify narration), regression tests (existing look unchanged). Quest tests in Phase 2 with mock service.
- **Key learnings:** Established JSONB pattern works for room extensions. Exact keyword matching is simpler and more predictable than fuzzy. Feature-as-narration (Phase 1) + quest-hooks (Phase 2) is clean separation of concerns. Reserving schema fields for future systems avoids migrations.
- **Deliverable:** Full proposal written to `.squad/decisions/inbox/elminster-room-features-proposal.md` (7800+ words, 24 code examples, migration SQL, TypeScript interfaces, implementation plan, risk analysis, authoring workflow).

---

---

### 2026-04-08T22:59:00Z: Direction Shortcuts Architecture — Complete

**Task:** Research and document direction shortcuts & speedwalk architecture for #357.

**Outcome:** ✅ Complete — Design proposal posted and approved for team review.

**Decision Deliverables:**
- Architecture document (400 lines, 3 phases, code sketches, testing checklist)
- 5 open questions for team: ordinal support, Numpad5 behavior, text input focus, speedwalk feedback, combat interaction
- Estimated effort breakdown: Phase 1 (2–4 hrs), Phase 2 (3–5 hrs)

**Coordination Impact:**
- Unblocked Regis/Minsc for Phase 1 implementation
- All 3 agents (Elminster, Regis, Drizzt) delivered on time
- Team ready for next round of work

---

### 2026-04-09T00:45:00Z: Gameplay Metrics Architecture — Design Proposal Complete

**Task:** Design & proposal for #360 — "otel style metrics of game events like player deaths, creature kills..."

**Outcome:** ✅ Complete — Design proposal posted to GitHub issue & decision document committed.

**Decision Deliverables:**
- Comprehensive architecture doc (15K+ words) covering storage, emission, integration, analytics
- Design proposal comment on #360 with executive summary, team split, risks, 4 open questions
- SQL schema for `gameplay_metrics` table (event_type, player_id, zone_id, metadata JSONB)

**Architecture Rationale:**
- **PostgreSQL events table** (not OpenTelemetry SDK) — Ellmud is a monolithic game server, not distributed microservice. OTEL overhead unnecessary today. If Prometheus dashboards needed later, same EventCollector can feed exporter (no code changes).
- **EventCollector service** with async batching — Queues events in memory, inserts every 50 events or 5 seconds. Non-blocking, prevents gameplay lag. Optional dependency injection (safe for tests).
- **JSONB metadata** — Flexible event shapes (strike has damage/targetId/critical; loot has itemId/rarity; death has killerIds/reason). Follows established pattern in schema (loot_containers, creature_definitions).

**V1 Scope: 12 Core Metrics**
- Combat: player_strike_dealt, player_damage_taken, creature_kill, player_death, combat_encounter_started/ended
- Survival: zone_entry, zone_extraction_success/failure, room_visited
- Loot: item_looted, item_lost_on_death
- Estimated volume: 20–30K events/day (easily within PostgreSQL capacity)

**Integration Points:**
- CombatSystem: Strike resolution, damage application, kill/death attribution
- ZoneRoom: Player entry/exit, item pickup, room visitation tracking
- CreatureManager: Loot drop metadata

**Display (v1):** Admin metrics page (`/admin/metrics`) with:
1. Event feed (last 100, filterable)
2. KPI summary (24h kills, deaths, extractions, avg combat duration)
3. Leaderboards (top 10 by kills, extraction rate, survival streak)

Player-facing scoreboards deferred to Phase 2.

**Team Split: ~5 Days**
- Jarlaxle (Systems): EventCollector, migration, CombatSystem hooks (2–3 days)
- Drizzt (Engine): ZoneRoom integration, perf benchmarking (1–2 days)
- Regis (Frontend): Admin metrics page, leaderboards UI (1–2 days)
- Minsc (Tester): Query validation, gameplay lag verification (0.5–1 day)

**Open Questions Raised:**
1. Player privacy — Leaderboards tied to player_id in queryable table. Acceptable? Anonymize after 7 days?
2. Leaderboard scope — Global only (v1)? Or faction-based + zone-specific? (deferred to Phase 2)
3. Loot tracking detail — All items or only rare? (proposed: all items, helps identify drop bugs)
4. Combat event granularity — Per-strike (~100/encounter) or encounter summaries (1 event)? (proposed: per-strike for full visibility)

**Risk Mitigation:**
- Async batching + rate-limiting prevents gameplay lag
- Optional injection maintains backward compatibility
- 7-day retention + weekly VACUUM/ANALYZE prevents disk bloat
- Unit tests for EventCollector, spot-check queries in admin UI
- Document in SECURITY.md (gameplay-only metrics, no PII)

**Coordination Impact:**
- Unblocked Jarlaxle + Drizzt + Regis for Phase 1 implementation
- Clear effort estimates enable sprint planning
- 4 open questions focused for team alignment (not over-specified)

## Learnings

### Metrics Architecture Insights

1. **PostgreSQL as Observability Backend** — For game servers at MUD scale (~100–1000 players), PostgreSQL is sufficient for event storage, queries, and analytics. OpenTelemetry SDKs are designed for distributed microservices and SaaS backends; they add indirection (exporters, collectors, external backends) that complicates a monolithic architecture. Start simple (DB tables), evolve to specialized tools (Prometheus, Grafana) only if volume/latency demands. This is a key pattern for cost-effective observability in game development.

2. **JSONB Metadata as Escape Hatch** — Event types vary widely in shape (damage has attacker/defender/damage_type, loot has item_id/rarity/source, death has killerIds/location/reason). Rather than create separate tables for each event variant or over-normalize, JSONB allows:
   - Single table for all events (schema simplicity)
   - Flexible fields per event (extensibility without migrations)
   - GIN indexing for ad-hoc queries ("which events involved fire damage?")
   - Follows established precedent in the Ellmud schema (loot_containers, creature_definitions use JSONB)

3. **Async Batching Prevents Gameplay Lag** — Direct database inserts per game event (100s per second during combat) would cause noticeable latency on client-side rendering. Batching + async means:
   - Events queue in memory (fast, non-blocking)
   - Batch inserts every N events or T seconds (amortizes DB overhead)
   - Flush on shutdown (no data loss)
   This pattern is reusable for any event stream (logging, analytics, telemetry).

4. **Optional Dependency Injection for Backward Compatibility** — Passing EventCollector to system constructors as optional (defaulting to null) ensures:
   - Existing tests don't require EventCollector setup
   - New tests can inject a mock for validation
   - Production code gracefully no-ops if EventCollector is null
   - No rework needed when adding metrics to existing systems

5. **v1 Scope Discipline** — Temptation to design "perfect" metrics (all event types, all fields, all query patterns). But a 5-day v1 that delivers 12 focused metrics beats a 3-week v1 trying to capture everything. Once v1 runs in production:
   - You see real usage patterns (which leaderboards matter?)
   - You identify missing events (what else do designers want to tune?)
   - You can iterate faster (add events incrementally, not all-or-nothing)

6. **Privacy by Design** — Metrics tied to player_id enable leaderboards but raise privacy concerns. Document early:
   - What data is collected (gameplay events only, no chat/PII)
   - Who can access it (admin tools only, not exposed in client)
   - Retention policy (archive > 7 days, delete > 90 days)
   This builds trust and satisfies compliance requirements.

7. **Open Questions Drive Alignment** — Rather than prescribe every detail, raise 4 focused questions (privacy, scope, loot detail, event granularity) and ask the team. This:
   - Signals that design isn't final (room for feedback)
   - Ensures stakeholder consensus before implementation
   - Prevents rework due to misaligned expectations
   - Makes handoff to execution team smoother

### Team & Process Insights

8. **Effort Estimation by System** — Breaking down 5-day v1 by system (CombatSystem 1 day, ZoneRoom 1 day, etc.) enables parallel work:
   - Jarlaxle owns core infrastructure (EventCollector, migrations)
   - Drizzt + Regis work in parallel (engine + frontend)
   - Minsc validates in parallel (tests + perf)
   - No blocking, high utilization
   This is better than sequential ("Jarlaxle first, then Drizzt") or vague ("5 days total").

9. **Design Proposal as Issue Comment** — Posting the proposal directly on the GitHub issue ensures:
   - Stakeholder (dkirby-ms) sees it in the right context
   - Team can comment + iterate in the same place
   - Decision is documented as issue history (not separate file only)
   - Easier to reference in PRs ("as proposed in #360")

### Architecture Decisions Catalog

- **Event Storage:** PostgreSQL table (not separate OTEL exporter, not in-memory counters)
- **Metadata Shape:** JSONB (not separate tables, not fixed schema)
- **Emission Pattern:** Async batching via EventCollector (not sync inserts, not global state)
- **Dependency Management:** Optional injection (not global singleton, not required)
- **Initial Display:** Admin dashboard (not player-facing, not external Prometheus)
- **Query Retention:** 7-day active + 90-day archive (not infinite, not real-time only)

### 2026-07-22: Code Review — #390 Player Item Interaction & #389 Admin Spawn Items

**Branch 1: `squad/390-player-item-interaction` (Drizzt) — APPROVED → PR #392**
- Reviewed: equip/unequip command handlers, `get` alias, `equipSlot` on Item, PlayerState equipment tracking, `_roomEvent` broadcast pattern, inventory display updates
- 50 tests, all passing. Full suite (3121 tests) green.
- Minor notes: `_roomEvent` uses inline type widening rather than extending the interface — functional but could be formalized. Equipped items don't count toward carry weight — design choice, consistent within implementation.

**Branch 2: `squad/389-admin-spawn-items` (Regis) — APPROVED → PR #393**
- Reviewed: admin API item spawn endpoint, ZoneRoom.adminSpawnItem(), LiveRoomDetail.tsx spawn modal type toggle
- Full suite (3071 tests) green.
- Minor notes: `itemToSpawn` construction omits `equipSlot` and `roomDescription` — forward-compatibility concern once #390 merges. Follows existing `as any` cast pattern for ZoneRoom access from admin routes.

**Patterns observed:**
- `_roomEvent` is a new convention for 3rd-person broadcasts; should be formalized if adopted by more commands
- Admin route to ZoneRoom method pattern (`adminSpawnCreature` / `adminSpawnItem`) is clean and consistent
- Content store entity to domain object mapping needs a shared helper to avoid field omissions

### 2026-07-23: Research and Triage of Issues 402, 403, 404

Researched 3 open issues. Posted design briefs. Updated labels. Routed to implementers.
402 Illumination: Jarlaxle+Drizzt. 403 Groups: Drizzt+Jarlaxle. 404 Panel: Regis+Drizzt.
3 decision docs written to inbox.

---

## Cross-Team Update: Drizzt Starter Kit to Inventory Migration (2026-04-10)

**From:** Scribe  
**Context:** Drizzt completed PR #410 — starter kit items now granted to inventory instead of stash on first zone join.

**What Drizzt Did:**
- Chose Option B (grant on zone join via flag) respecting transient inventory semantics
- Added `starter_kit_granted` boolean to characters table
- Rewrote starter-kit.ts to use PlayerState.addItem() instead of stash insertion
- Integrated with ZoneRoom.onJoin() — gated by flag, fires once per character lifetime
- Extended CharacterRepository with isStarterKitGranted() / markStarterKitGranted()
- 7 new tests passing; all 2666 project tests pass

**Why This Matters for You:**
- Your inventory persistence architecture (Phase 1) will build on this pattern
- Starter items now behave like all inventory — losable on death, transferable at extraction
- Sets precedent for zone-join item distribution (grants, etc.)

**Integration with Your Work:**
- When you implement Phase 1 (player_inventory table), starter kit will already be in the in-memory inventory
- Death flow (Phase 3) will clear this persistent inventory just like any other items
- Your container type (Phase 2) can eventually wrap corpses; starter items follow same loot rules as other inventory

**PR:** #410 (ready for merge)

---

## Review & Approval: Follow + Consent System (PR #408) (2026-04-11)

**Task:** Review 1050-line PR #408 implementing follow/unfollow + consent/unconsent/revoke commands (Phase 1+2)

**What You Did:**
- ✅ Reviewed architecture, test coverage (37 tests), implementation patterns
- ✅ Identified 3 non-blocking issues for Phase 3 (Group Formation):
  - #411: Extract duplicated follow-display logic (look.ts/go.ts)
  - #412: Skip downed followers in moveFollowers()
  - #413: Clean up follow on player death (handlePlayerDeath)
- ✅ Approved PR for merge with follow-up issues documented
- ✅ Design notes for Phase 3: transitive follow chains, consent gating, griefing prevention

**Verdict:** APPROVED — Merge to dev. All follow-ups non-blocking for Phase 1+2, must fix before Phase 3.

**Decision:** Documented in .squad/decisions/decisions.md (2026-04-11T00:37:00Z entry)

**Next:** Drizzt to merge PR; Phase 3 depends on #411, #412, #413 fixes.

---

## Review & Approval: Group Formation (PR #414) (2026-04-11)

**Task:** Review PR #414 implementing Phase 3 Group Formation (8 commands, GroupManager, 57 tests)

**What You Did:**
- ✅ Reviewed architecture: GroupManager centralized pattern (vs. distributed PlayerState)
- ✅ Verified permissions: group add correctly gates on follower + consent
- ✅ Confirmed all 3 follow-up issues fixed (#411, #412, #413)
- ✅ Test coverage: 57 new tests covering all 8 commands + edge cases
- ✅ Implementation patterns: _groupEvent/_gsay metadata consistent with _followStarted/_postureChange

**Verdict:** APPROVED — Clean architecture, proper permissions, full test surface.

**Follow-up Issues Resolved:**
- #411: Extracted player-display.ts shared helper
- #412: moveFollowers() skips downed/dead followers
- #413: handlePlayerDeath() breaks follow relationships

**Decision Recorded:** Merged drizzt-group-formation-architecture.md → decisions.md (2026-04-11T00:45:00Z)

**Merge Status:** ✅ PR #414 merged to dev

**Team Impact Notes:**
- Regis (Client): gsay messages arrive as 'speech' narrations; group panel needed
- Jarlaxle (Content): Phase 4 combat rewards will read GroupManager
- All: resolvePlayerById now available on CommandContext





## Learnings

### 2025-06-11: PR #415 Group Loot Sharing Review
**Context:** Reviewed Phase 6 of #403 (Player Groups) — group loot sharing feature.

**Key observations:**
1. **Integration pattern:** The loot distribution hooks cleanly into `syncCreaturesAfterCombat()` with a `distributed` flag to prevent fallback when sharing succeeds. This pattern allows opt-in behavior without disrupting the existing floor-drop flow.
2. **Round-robin fairness:** The implementation uses simple round-robin with `memberIndex` increment. This is fair over time and easier to test/verify than need-based or random distribution.
3. **Same-room filtering:** Filtering by `currentRoomId` is critical for preventing remote loot teleportation. The PR correctly applies this filter before distribution.
4. **Edge case handling:** The nested loop (try all members before dropping) handles mixed carry capacities gracefully. If member A is full, B gets the item; if all are full, floor drop occurs.
5. **Test coverage:** 19 tests covering command validation, manager logic, and distribution mechanics. Simulation tests verify round-robin behavior without requiring full ZoneRoom integration.
6. **Leader-only enforcement:** `GroupManager.setLootSharing()` correctly enforces leader-only access. Non-leaders can view but not toggle.

**Verdict:** APPROVED. Clean architecture, comprehensive tests, no regressions. The implementation is production-ready.

**Future considerations:**
- If XP/currency sharing is added in future phases, consider extracting distribution logic into a reusable `GroupRewardDistributor` class.
- Monitor player feedback on round-robin vs. need-based distribution (e.g., "don't give me items I can't carry").
- The `group loot history` command could be a useful future enhancement for transparency.

### 2026-04-11: PR #415 Review — Group Loot Sharing (#403 Phase 6)

**Task:** Code review of group loot sharing system PR.

**Verdict: APPROVE**

**Architecture (Clean):**
- Loot distribution logic cleanly hooks into `syncCreaturesAfterCombat()` with minimal disruption to existing creature death flow.
- GroupManager extends cleanly: `lootSharing: boolean` field, `setLootSharing()` (leader-only), `getLootSharing()` getter.
- Round-robin algorithm is fair and robust, handles all edge cases correctly.

**Design Compliance:**
- ✅ **Items only:** Distributes corpse loot items; no XP or currency sharing
- ✅ **Leader toggle:** `group share on/off` command set enforces leader-only access
- ✅ **Equal split:** Round-robin distribution among group members in same room
- ✅ **Same-room filtering:** Only members at kill location receive items
- ✅ **Weight checks:** Respects player.canCarry() capacity limits

**Edge Cases (All Covered):**
- Single member in room → receives all items ✓
- No one can carry → items drop to floor with narration ✓
- Empty loot array → no duplicate floor narration ✓
- Mixed carry capacities → algorithm tries all members ✓
- Group members in different rooms → same-room filter prevents distribution ✓
- NPC kills → creator check prevents activation ✓
- Sharing OFF or no group → existing floor-drop behavior preserved ✓

**Test Coverage (19 tests):**
- Command tests: 8 (toggle validation, non-leader rejection, status display)
- GroupManager tests: 6 (default state, toggle enforcement, access control)
- Distribution tests: 5 (round-robin fairness, same-room filtering, weight checks)

**Regression Check:** 2792 server tests passing, zero new failures.

**Status:** ✅ APPROVED — Ready to merge to dev
