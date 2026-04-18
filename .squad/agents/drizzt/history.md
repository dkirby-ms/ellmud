# drizzt — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** Engine Developer — Core systems, server architecture, database persistence, game mechanics

**Key Learnings:**
- **Database-driven content:** All game assets (items, creatures, biomes, modifiers, skills, loot-tables, factions, rooms, narrative) live in PostgreSQL. Static registries are fallbacks only. User directive: no DB-less deployments.
- **Zone architecture:** Unified ShardRoom (2700+ lines) serves both procedural shards and persistent zones. Zones gate features by room type (feature_stash, feature_shardboard, feature_training, etc.). Categories: hub/dungeon/dev/social with varying reconnect grace (10/30/10/10s).
- **Player identity:** Multi-character system. Database uses playerId (auth UUID), GameState uses characterId. Migration 017-019 added character table. Always resolve playerId first via playerIds.get(sessionId), then use for state lookups.
- **Combat tick system:** 1-second loop in ZoneRoom.update(). All combat server-side. Auto-attack defaults when no action submitted. Threat tables (per-creature damage tracking). Threat formula: base 10 + 1:1 damage ratio.
- **Death flow:** Player defeat → corpse creation → run-history record → optional death penalty (shard-sickness) → ROOM_SWITCH to faction stronghold. Corpse TTL, item looting, and persistence all implemented. Equipped items vanish bug (pre-existing, scoped for Phase 3 containers).
- **Exploration map:** Records visited rooms per character + zone/shard. EXPLORATION_DATA sent on join (bulk rooms), EXPLORATION_UPDATE on movement. Client visualization via computeLayout.ts (10-phase pipeline, 2600 lines).
- **Message-only protocol:** No Schema state sync. All game state via typed messages: PLAYER_STATE, LOADOUT_UPDATE, INVENTORY_UPDATE, EXPLORATION_DATA, EXPLORATION_UPDATE, etc. (38 message types total).
- **Async command pattern:** Most handlers are sync (CommandContext → CommandResult). Commands needing DB (who, toggle) intercepted in ZoneRoom.handleCommandMessage, dispatched to async methods. CommandHandler type is sync; don't change it (breaks 100+ test call sites).
- **E2E testing:** Playwright + PlayerFixture pattern. Auth via API (register, login), token injected to localStorage, character creation via /api/characters, zone entry via Colyseus joinOrCreate.

**Critical Files:**
- packages/server/src/rooms/ZoneRoom.ts (2700+ lines) — central room logic
- packages/server/src/combat/CombatSystem.ts — tick resolution, threat, auto-attack
- packages/server/src/commands/handlers/ — 40+ handlers (go, take, drop, equip, follow, group, attack, dodge, flee, help, goto, teleport, sandbox, toggle, etc.)
- packages/server/src/db/migrations/ — 38+ SQL migrations
- packages/client/src/map/computeLayout.ts — 10-phase graph layout, crossing detection
- packages/shared/src/index.ts — 38 MessageTypes, 50+ interfaces

**Recent Work (Last 50 Lines):**

   - Inbox files deleted (drizzt-codeql-fixes.md, minsc-codeql-tests.md)

**Key Reference:** All 15 CodeQL alerts addressed in PR #433. 3471 tests passing.

### Toggle Command Async Pattern (#432, PR #436)

- **Pattern:** Commands requiring async DB access follow the `who` command pattern — verb is intercepted in `ZoneRoom.handleCommandMessage` before the sync `handleCommand` dispatch, delegated to an async method that calls `deliverResult` directly.
- **Key files:** `packages/server/src/commands/handlers/toggle.ts`, `packages/server/src/rooms/ZoneRoom.ts` (handleToggleCommand method near handleWhoCommand)
- **CommandHandler type is sync** (`(ctx) => CommandResult`). Async commands must be special-cased in ZoneRoom rather than changing the type (too many test call sites depend on sync return).
- **TOGGLE_MAP** in toggle.ts has `enabledMsg`/`disabledMsg` fields — always use them for response text.


---

### Issue #438: Starting Items Rename + Collapse Lifecycle Removal (2026-04-12)
**Status:** Complete -- committed on branch squad/438-starting-items-no-collapse

**What was done:**
- Renamed loot_containers to starting_items across DB schema (migration 016), shared types, server code, admin code, and all tests
- LootContainer to StartingItem with backward-compat alias kept
- Removed entire collapse lifecycle: seedZone(), handleCollapse(), collapse timer countdown, destabilising transitions
- ZoneState simplified to just open -- zones are persistent MUD-style
- repopZone() now only respawns creatures; items persist permanently
- Deleted resolveZoneRoomItems() and broadcastRepopNarration()
- Rewrote all repop tests to verify items do NOT respawn
- 33 files changed, 165 insertions, 519 deletions

## Post-Implementation Documentation — Issue #438 (2026-04-12T17:30Z)

**Scribe:** Documented orchestration for squad. Merged inbox decisions into `.squad/decisions/decisions.md`:
- Starting Items Rename & Collapse Lifecycle Removal (comprehensive spec + implementation notes)
- Remove room_definitions Table and PgRoomDefinitionsStore
- Zone Lifecycle Context (user directive for team memory)

Inbox files deleted post-merge. Agent history and decisions updated.

Key learnings documented:
- Starting items rename mechanics across 33 files
- Zone state simplification pattern (removing legacy lifecycle states)
- Test restructuring when behavior changes (items no longer respawn)


---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.

---

## Permadeath Foundations — Migration 017, Config, and Hall of Fame API (2026-04-13)

**Implemented:**
- Created migration 017_permadeath_hall_of_fame.sql — hall_of_fame table with character stats, survival time, cause/zone of death, indexed for leaderboard queries
- Added permadeath config to ServerConfig interface — PERMADEATH_ENABLED (boolean) and PERMADEATH_THRESHOLD (integer) env vars with nested config object
- Created /api/hall-of-fame REST API — paginated leaderboard (sorted by survival time DESC) and /api/hall-of-fame/stats aggregate endpoint (total deaths, avg survival, deadliest zone/creature)
- Registered hall of fame router in index.ts between character and spawn zone APIs
- Fixed test config in wave3-redis-contracts.test.ts to include permadeath defaults
- Verified TypeScript compilation after rebuilding shared package (OverlayMessage.permadeathStats already existed)

**Key learnings:**
- Migration numbering: Check existing migrations to get next sequential number (016 to 017)
- PostgreSQL sequences: Use GENERATED ALWAYS AS IDENTITY for auto-increment (modern pattern vs SERIAL)
- API patterns: createXRouter() returns Router, register with app.use() in index.ts
- Config patterns: Nested config objects (permadeath.enabled/threshold) group related settings, loaded via envBool()/envInt()

**Files changed:**
- packages/server/src/db/migrations/017_permadeath_hall_of_fame.sql (new)
- packages/server/src/config.ts (permadeath config already present)
- packages/server/src/api/hall-of-fame.ts (new)
- packages/server/src/index.ts (import + register hall of fame router)
- packages/server/src/__tests__/wave3-redis-contracts.test.ts (add permadeath to test config)

**Note:** The executePermadeath() method in ZoneRoom.ts already exists — handles soft-delete, hall of fame recording, and client overlay. This task focused on DB schema, config infrastructure, and leaderboard API.

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

---
---

### 2026-04-13T23:36–2026-04-14T00:02: Combat Stat Migrations Phase 1 (DELIVERED)

**Task:** Implement DB migrations 018+019 for combat stats, update CharacterRepository with getBaseStats/saveBaseStats, integrate ContentRegistry creature stat loading.

**Outcome:** ✅ DELIVERED — 2 migrations created, CharacterRow updated, 74 server tests pass, 0 TS errors.

**Deliverables:**
- **Migration 018:** Added 8 combat stat columns to `characters` table (maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour) with sensible defaults
- **Migration 019:** Added 8 combat stat columns to `creature_definitions` with varied seeding per creature archetype (melee, ranged, boss, etc.)
- **CharacterRepository:** Implemented getBaseStats(characterId) and saveBaseStats(characterId, stats) in both Pg and InMemory implementations
- **ContentRegistry:** loadCreatures() now reads new columns and maps into CombatStats shape

**Integration Notes:**
- Used CHARACTER_COLUMNS constant to keep all SELECT queries DRY
- Null coalescing in mapRow provides fallback defaults for rolling deploys
- Creature dodge_skill_rank DB column maps to stats.dodge on CreatureTemplate (naming intentional for clarity)
- Repository ready for Jarlaxle's combat system integration
- No admin store updates (Drizzt's charter; not in scope)

**Team Coordination:**
- Coordinated with Jarlaxle: CombatSystem can now fetch player stats via characterRepo.getBaseStats()
- Coordinated with Minsc: 74/74 character repository tests pass
- Coordinated with Elminster review: Integration gap C1 depends on this getBaseStats() method

---

### 2026-07-22: Three Combat Bug Fixes — TDD (#460, #461, #462)

**Task:** Fix dodge never firing, death respawn hardcoded to Refuge, and post-death combat continuing.

**Outcome:** All 3 bugs fixed with TDD approach, 14 new tests, 3667+ existing tests pass.

**Bug #460 (Dodge never fires):**
- Root cause: CombatSystem constructor defaults roll to () => 1, ZoneRoom never passed a real RNG
- Fix: Pass () => Math.random() in ZoneRoom.ts production construction
- Default () => 1 preserved for all existing deterministic tests

**Bug #461 (Death respawn hardcoded to Refuge):**
- Created zones/respawn.ts with resolveRespawnTarget() — chain: lastInn, faction hub, startingZoneSlug, The Refuge
- Applied to both normal death AND permadeath paths in ZoneRoom.ts
- Added playerStartingZones cache map, populated on join from CharacterRow.startingZoneSlug

**Bug #462 (Post-death combat continues):**
- After removing dead combatants, added hostile-pair detection for encounter end check
- If all survivors are on the same side (all creatures or all players without active targets), end combat
- PvP preserved via currentTarget cross-reference check

**Key Files:**
- packages/server/src/zones/respawn.ts (new)
- packages/server/src/combat/CombatSystem.ts (encounter end logic)
- packages/server/src/rooms/ZoneRoom.ts (RNG wiring, respawn integration)

## Learnings

- CombatSystem.resolveTick() is the public API; resolveEncounterTick() is private per-encounter
- TickResult.endedEncounterIds (not .ended) indicates which encounters finished
- Dodge events are emitted as type strike with dodged true and damage 0, not type dodge
- Encounters are created via initiateCombat(attackerId, targetId), not startEncounter
- death-spawn-routing.test.ts is flaky under parallel execution (Colyseus timing)
- DowningSystem grace period: GRACE_TICKS=3 blocks killingBlow() for first 3 ticks after downing. HP drains 0→-10 over BLEED_OUT_TICKS. Stabilize = revive at 1 HP + remove from downed + re-engage combat.
- handlePlayerStabilized() in ZoneRoom now fully revives: removePlayer() from downing, re-registers combatant at 1 HP, auto-engages hostile creatures via initiateCombat().
- CombatSystem has no getAllCombatants(); use getActiveEncounterRoomIds() + creatureManager.getLivingCreatures() to find hostiles in a room.

---

### 2026-07-22: Six Combat Bug Fixes from Live Playtesting

**Task:** Fix all combat bugs identified from live playtesting session.

**Outcome:** All 6 bugs fixed, 16 new tests, 3695+ existing tests pass.

**Bug 1 (Post-death combat bleed):** Room-scoped event delivery in deliverCombatResults — events only go to players in the combat room, downed players skipped, removeCombatant ends encounters when no hostile pairs remain.

**Bug 2 (HP display stacking):** Running HP tally within a tick instead of post-tick snapshot.

**Bug 3 (Post-defeat actions):** Strike events from combatants who die in the same tick filtered out after damage application.

**Bug 4 (Shield block without shield):** calculatePlayerEffectiveStats returns shieldBlock=0 when equipment.shieldBlock is 0.

**Bug 5 (Flee narration):** resolveFlee now accepts failReason: no_exits vs failed_roll.

**Bug 6 (Combat_end timing):** All CombatEvents carry roomId for room-scoped delivery.

## Learnings

- deliverCombatResults was using this.broadcast() (zone-wide). Changed to per-room delivery using this.sendNarrate() to individual clients filtered by room.
- removeCombatant now uses shouldEndEncounter() checking hostile pairs, not just size <= 1.
- ShieldBlock formula: equipment.shieldBlock > 0 ? base + equipment : 0. Skill activates only with a shield.
- Running HP tally: Start from target.hp + totalDamage (pre-damage), subtract each hit sequentially.
- sendPlayerState() requires an active combatant — downed players are removed from CombatSystem on defeat, so downing HP updates must be sent directly in tickDowningSystem() using DowningSystem's currentHp.
- playerStatsCache persists after combatant removal — use it to get maxHp for downed players.
- MudPrompt (client) re-renders reactively on PLAYER_STATE, but the scroll log needs explicit narrate messages for status echoes.
- handlePlayerDeath() is async but called fire-and-forget from tick handlers. Any synchronous state mutations (like deathPenalty) must happen BEFORE the first await to be visible to same-tick observers.
- death-spawn-routing.test.ts needs polling patterns (not single checks) for async state because Colyseus integration tests share resources under parallel vitest execution.

### 2026-07-23: Reconnection Bug Investigation — Downed Player Browser Refresh

**Bug:** Player refreshes browser while downed → respawns at inn instead of restoring combat state; stale copy left in combat room.

**Root Cause — Two interacting race conditions in ZoneRoom.ts:**

1. **Death-during-disconnect race (primary cause of inn respawn):**
   - Downed player refreshes → WS disconnects → `onLeave` starts `allowReconnection(client, 30s)`
   - Game ticks continue: `tickDowningSystem()` keeps draining bleed-out HP for disconnected player
   - Bleed-out completes → `handlePlayerDeath()` fires → schedules 3s ROOM_SWITCH (to disconnected client — goes nowhere)
   - 3s timeout: `this.players.delete(playerId)` — player fully removed from server state
   - New browser connection arrives → `onJoin` → `this.players.has(playerId)` is **FALSE**
   - Falls through to zone start room logic → loads `lastInn` → player spawns at inn with HP 100
   - Death state (downed, penalty) effectively lost

2. **Duplicate-join state overwrite (cause of stale copy):**
   - If new connection arrives BEFORE bleed-out death: `onJoin` detects duplicate, preserves `preservedRoomId`
   - Creates fresh `PlayerState` with HP 100 at combat room — `this.players.set(playerId, newState)`
   - Old `onLeave`'s `allowReconnection` throws → catch cleanup runs: `this.downingSystem.removePlayer()`, `this.players.delete()`, decrements `playerCount`
   - Result: playerCount off by 1, downed state silently cleared, player appears alive in combat room

3. **Missing room occupants broadcast in death handler:**
   - `handlePlayerDeath`'s 3s delayed cleanup (L2967-2972) deletes player from `this.players` but NEVER calls `broadcastRoomOccupantsUpdate(roomId)`
   - Other players in room are not notified the dead player left
   - Stale occupant entry persists in other clients' UI until next room event triggers a refresh

**Key Files Needing Changes:**
- `packages/server/src/rooms/ZoneRoom.ts`:
  - `onJoin` (L484-724): Duplicate join path must check/restore downed state from DowningSystem
  - `onLeave` (L726-820): Cleanup must guard against concurrent `handlePlayerDeath` having already removed the player
  - `handlePlayerDeath` (L2748-2979): Delayed cleanup must broadcast room occupants update; must handle disconnected player (no client to send ROOM_SWITCH to)
  - `tickDowningSystem` (L2629): Should pause bleed-out for disconnected players OR handle death-while-disconnected gracefully
- `packages/server/src/systems/DowningSystem.ts`: May need a `pauseBleedOut()` or `isDisconnected` flag

**Recommended Fix Strategy:**
- Option A: Pause bleed-out timer while player is disconnected (preserves downed state for reconnection)
- Option B: On duplicate join, detect if player was downed and restore downed state instead of creating fresh state
- Both options need: `handlePlayerDeath` must broadcast `broadcastRoomOccupantsUpdate(roomId)` in delayed cleanup, and guard against `this.players` already being deleted by concurrent `onLeave` cleanup

---

### 2026-04-18: Reconnect-While-Downed Bug Investigation (DELIVERED)

**Task:** Investigate browser refresh while downed — reconnection/session management focus.

**Outcome:** ✅ DELIVERED — Root cause identified, decision proposal written to inbox.

**Coordination:** Parallel investigation with Jarlaxle (Systems Dev). Both agents independently identified the same three core failures:
1. Bleed-out ticking on disconnected players
2. Missing room occupants broadcast in death cleanup
3. Downed state not restored on duplicate-join reconnect

**Drizzt Focus:** Reconnection/session handling perspective
- Decision proposal recommending **Approach A** (pause bleed-out on disconnect)
- Simplest fix, aligns with `allowReconnection` grace window, avoids new DB state
- 30s reconnection timeout already limits freeze window

**Jarlaxle Focus:** Combat/death state systems perspective
- Detailed root cause analysis with 3 interacting failures
- Test coverage gaps identified
- Priority fix sequence: broadcast fix → downed-timeout→death → reconnect-restore

**Deliverables:**
- `.squad/orchestration-log/2026-04-18T09-46-drizzt.md` — Orchestration summary
- `.squad/decisions/decisions.md` — Both proposals merged (deduplicated)
- `.squad/log/2026-04-18T09-46-reconnect-downed-bug.md` — Session log

See Jarlaxle's analysis for deeper systems-level breakdown and test strategy.
