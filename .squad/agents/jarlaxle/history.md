# Jarlaxle — History

## Project Context

- **Project:** Ellmud — PvPvE Extraction RPG / Real-Time MUD
- **Stack:** Node.js, WebSocket/SSH, LLM integration for narrative
- **What:** Procedurally generated shard instances, tick-based combat, server-authoritative game state, LLM narration layer
- **User:** dkirby-ms
- **GDD:** GDD.md (comprehensive design document covering all game systems)

## Learnings

### 2026-03-19: PostgreSQL schema (Issue #3)
- Created 5 migration files under `packages/server/src/db/migrations/` (001–005).
- Player identity is normalized separately from player profile — `player_identities` table has provider/provider_id for OAuth bolt-on in Phase 4.
- Used GDD as source of truth for faction names (Ironwright Compact, Veil Cartographers, Scarlet Ledger) and skill categories (6 categories: combat, defence, survival, subterfuge, awareness, social) — the issue text had slightly different names.
- Item stats stored as JSONB for flexibility across item types.
- Faction membership enforces one-faction-at-a-time via UNIQUE constraint on player_id.
- TypeScript types in `db/types.ts` import GearTier, BiomeType, ShardTier from @ellmud/shared to stay in sync.
- DB connection module uses `pg.Pool` with `DATABASE_URL` env var. Migration runner uses a `_migrations` meta-table for idempotency.
- Pre-existing build errors exist in `state.ts` (@colyseus/schema missing) and client `vite.config.ts` — not related to this work.

### 2025-07-25: Room Graph Generation (Issue #5)
- Created 6 files: shared types (`room-graph.ts`), PRNG (`prng.ts`), Flooded Crypt biome (`flooded-crypt.ts`), graph generator (`generator.ts`), and 15 unit tests (`shard-gen.test.ts`).
- **Graph algorithm:** Backbone chain through fill rooms, entries attached at start, extractions at end, boss in middle. Cycles added with proximity constraint to avoid shortcutting the backbone.
- **Distance enforcement is iterative:** Cut edges on shortest entry→extraction paths, then repair connectivity with distance-aware reconnection. This was tricky — naive repair re-introduces shortcuts. The fix: after each repair link, BFS-check the distance constraint and undo if violated.
- **PRNG:** mulberry32 algorithm, fully deterministic. `createPRNG(seed)` returns `next()`, `nextInt()`, `pick()`, `shuffle()`.
- Shared types re-exported from `@ellmud/shared` barrel — cannot use subpath imports (`@ellmud/shared/room-graph.js`) without package.json `exports` field.
- Biome templates are separate from the generator — adding a new biome only requires a new template file, no generator changes.
- Serialization uses `Map → Object.fromEntries` for JSON compat, `deserialize` reconstructs Maps.
- All 8 server test files pass (101 tests, 24 skipped). Shared tests also pass (38 tests).

### 2025-07-25: Basic Combat System (Issue #6)
- Created 6 files in `packages/server/src/combat/`: CombatState, CombatSystem, damage, actions, index barrel.
- **Damage formula:** `max(1, floor(raw_dmg × stance_multiplier - armour))`. Stance multipliers: Strike vs Strike=1.0, Strike vs Dodge=0.5, Strike vs Flee=1.0. Non-strike actions deal 0 damage.
- **Simultaneous resolution:** All damage calculated from start-of-tick HP, then applied at once. Two combatants can kill each other in the same tick.
- **No-input defaults to dodge** — if a combatant doesn't submit an action before tick resolution, they automatically dodge.
- **Combat timeout:** 10 consecutive ticks with no strike actions ends the encounter. Immediate end if ≤1 combatant remains.
- **CombatSystem is pure game logic** — no Colyseus dependency. Takes an `ExitResolver` callback for flee mechanics. ShardRoom calls `resolveTick()` in its existing `update()` method.
- **Encounter model:** Per-room, multiple combatants can join. `initiateCombat()` creates or joins existing encounter. Each combatant maps to one encounter via `combatantEncounter` index.
- **Flee:** Combatant moves to first available exit (or specified direction). Takes full damage from strikers that tick (flee provides no defense). Removed from encounter after resolution.
- Added 4 command handlers: `attack`, `strike`, `dodge`, `flee`. Extended `CommandContext` with optional `combatSystem` field (type-only import, no runtime coupling).
- Added `strike`, `dodge`, `flee` to parser's KNOWN_VERBS. `attack` was already there with `k` alias.
- Appended `CombatResultMessage` and `COMBAT_RESULT` message type to shared (append-only as required).
- 32 unit tests covering all stance combos, simultaneous resolution, default dodge, timeout, flee success/failure, HP tracking, multi-combatant, and resolution order.
- Pre-existing test failures: shard-lifecycle (hook timeout), narrative (timing). Not related to combat changes.

### 2026-03-19: Command System (Drizzt Issue #8) — Cross-Team Context
- Drizzt completed Issue #8: command parser, movement/inventory handlers, ShardRoom integration (44 new tests, 100 total passing).
- **Key for you:** Movement handlers consume `RoomGraph` from your generator. Each handler validates exits against `room.exits` map (Direction → string room ID).
- **API contract:** `Room` interface in `room-graph.ts` is stable. Drizzt's movement handler expects `room.exits: Map<Direction, string>`. If you change this, let Drizzt know.
- **Combat integration (your Issue #6):** Strike/dodge/flee handlers will follow identical pattern — handler file + registry line. No parser or delivery changes. Reuse the same `CommandContext` and `CommandResult` types.
- **Narration structure:** All handlers return narration entries with `{type: string, text: string}`. Volo (Issue #9) will enrich these with LLM. Handlers never change.
- **Wave 4 context:** You're starting Issue #6 (combat) now. Drizzt #8 is stable foundation. Volo #9 (LLM narration) will land in parallel. Drizzt #12 (auth) won't block your work.

### 2025-07-25: Drowned Revenant Creature + AI Behavior Tree (Issue #7)
- Created 7 files: types, behavior tree, CreatureManager, loot system, Drowned Revenant template, barrel export, and 41 unit tests.
- **Behavior tree is pure state machine:** idle→alert→hostile→fleeing. All transitions deterministic — no Math.random anywhere. Uses `simpleHash(creature.id + idleTicks)` for patrol room selection.
- **Fleeing is terminal in Phase 1:** Once a creature enters fleeing state, it never recovers. Simplifies reasoning. If cornered (no exits), falls back to dodge.
- **Berserker archetype:** Drowned Revenant always strikes in hostile state, targets first player in room (deterministic ordering).
- **Combat integration is clean:** `toCombatant()` converts Creature→Combatant, `syncFromCombat()` syncs HP/room back. No modifications to CombatSystem needed — the Combatant interface already had `isPlayer: boolean`.
- **Spawn placement uses PRNG shuffle:** Eligible rooms filtered by template rules (forbid entry/extraction, prefer corridors/dead-ends), then shuffled with seeded PRNG. First N rooms from shuffle get creatures.
- **Loot is fully deterministic Phase 1:** Every loot table entry drops on death. Item IDs namespaced by creature ID for uniqueness.
- **CreatureWorldState is a minimal view interface:** `playersInRoom`, `roomExits`, `noisyRooms`. ShardRoom constructs this each tick from its own state. Keeps creature AI decoupled from Colyseus.
- Pre-existing test failure in `commands.test.ts` (expects 5 rooms but test graph now has 6) — not related to creature changes.
- All 41 creature tests pass. All 208 pre-existing tests unaffected.

---

## Wave 4 Cross-Team Context (2026-03-19T16:32:56Z)

**Completed parallel:**
- ✅ **Drizzt Issue #12:** Username/password auth with bcrypt, JWT tokens, optional auth by default
- ✅ **Volo Issue #9:** LLM narration pipeline, in-memory cache, Azure AI + fallbacks
- ✅ **Your Issue #6:** Combat system complete (strike, dodge, flee, 1s tick). 32 tests. Pure logic design proven.

**Your Issue #7 — Drowned Revenant + AI Behavior Tree — can now proceed:**
- Combat system (#6) provides tick loop and pure game logic → creature actions hook into same tick
- Narration (#9) provides enrichment pipeline → creature narration (attack descriptions, death scenes) ready
- Auth (#12) provides `playerId` tracking → creature state persists across sessions

**Design notes for creature AI:**
- Creature actions (swing, cast, flee) are implemented as handlers that call `combatSystem.strike()` etc. (no new combat paths)
- Behavior tree evaluates each tick and queues actions into the combat system
- `CombatSystem.resolveTick()` processes both player and creature actions simultaneously
- Narration enrichment receives `{type: 'creature-strike', ...}` and fills in flavor text

**Upcoming Wave 5:**
- Drizzt #10: Extraction mechanic (safe zones, loot, death penalty)
- Minsc #13: Web Terminal Client (displays creature actions, extraction UI)
- Coordinate with both on message types for creature narration
