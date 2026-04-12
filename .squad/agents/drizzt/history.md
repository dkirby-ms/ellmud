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
