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

## Learnings

- When using sed to remove options from JS object literals, watch for trailing commas after deletion -- they cause syntax errors. Use perl multiline regex for safer cleanup.
- Shared package must be rebuilt before server type-checking picks up type changes. The server resolves types through build output, not source.
- The Colyseus ZoneState schema in state.ts tracks server-internal state. Removing fields from it affects serialization -- kept stability (always 1.0) for admin dashboard compat.
- Test helper functions like seedZone() in test files are DB seeders, not the removed lifecycle method.
- **Combat stat model (Phase 1):** 8 stats shared between players and creatures: maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour. No agility (removed by user directive 2026-04-13). ShieldBlock is binary (block chance, not flat reduction).
- **PlayerCombatStats type** lives in `CharacterRepository.ts`, separate from `CombatStats` in `CombatState.ts`. Jarlaxle owns CombatState.ts; Drizzt owns the DB persistence layer.
- **Creature definitions** keep legacy columns (attack, defence, agility) for backward compat but new weapon skills (unarmed, one_handed, two_handed, ranged, shield_block, dodge_skill_rank) are the Phase 1 future.
- **CharacterRow.combatStats** is populated in every SELECT via shared `CHARACTER_COLUMNS` constant — keeps queries DRY.
- **Migration 018** = character combat stats, **Migration 019** = creature combat stats with varied weapon/dodge values per creature archetype.
- **ItemStats dual format (#453):** DB `base_stats` JSONB has legacy format (`{damage, speed}` for weapons, `{armour, weight}` for armour) and canonical combat format (`{weaponType, weaponDamage, armour, shieldBlock}`). `extractCombatItemStats()` in `stats.ts` bridges both. Always use it when converting DB item data to combat stats.
- **Item.stats field (#453):** The `Item` interface (RoomGraph.ts) now carries optional `stats?: ItemStats` (combat ItemStats). Equipment items should populate this when created from DB definitions.
- **Stats cache rebuild pattern (#453):** `rebuildPlayerStatsCache()` in ZoneRoom.ts must be called after any loadout mutation (equip/unequip/swap) and after join-time loadout restoration. It reads loadout → ContentRegistry → extractCombatItemStats → calculateEquipmentBonuses → effective stats.

---

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
