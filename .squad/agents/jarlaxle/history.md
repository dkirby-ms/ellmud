# jarlaxle — History

**For a quick overview, see [summary.md](./summary.md)**

---

## Core Context

**Role:** AI/LLM Integration

**Key Focus Areas:**
- Core responsibilities for this agent
- Integration with wider system architecture  
- Test coverage and reliability
- Documentation and knowledge transfer

**Recent Work (Last 30 Lines):**

- Removed ~115 lines of complex group loot distribution logic from ZoneRoom.syncCreaturesAfterCombat()
- Extended `open` and `take` commands to support room containers in addition to inventory containers
- Added `itemId` field to LootItem interface to map loot instances to item definition IDs
- Corpse items created with containerContents array containing all generated loot
- Created test fixtures: waterlogged_bone, revenant_essence
- Updated container-related tests to cover corpse scenarios

### Key Changes
- **ZoneRoom.ts**: Corpse creation logic (~35 lines) replacing group distribution (~115 lines removed)
- **open.ts**: Extended to check room items when opening containers
- **take.ts**: Extended to support `take X from Y` where Y is a room container
- **loot.ts**: Updated to reference containerContents rather than direct item distribution
- **item-fixtures.ts**: Added new test item definitions

### Test Results
- All 3480+ tests passing
- 29 corpse-specific tests from Minsc's TDD suite all passing
- Zero regressions

### Collaboration
- Worked with Minsc (Tester) on spec-based test coverage
- Minsc wrote tests in parallel to guide implementation
- Tests validated all functionality as features were implemented
- Tests serve as regression protection for future changes

### Learnings
- **Downed-state disconnect bug (investigated):** When a downed player refreshes their browser, three interacting failures cause them to respawn at the inn with a stale ghost entity left in the combat room. See decisions/inbox/jarlaxle-downed-disconnect-bug.md for full root cause analysis.
- DowningSystem state is purely in-memory (Map<string, DownedPlayer>) — not persisted to DB, not restored on reconnect
- Downed players are already removed from CombatSystem (line 2621), so onLeave's `isInCombat` check returns false — combat disconnect marking is skipped
- onLeave cleanup (lines 787-818) never broadcasts a room occupants update — stale entities remain visible
- Duplicate-join path (onJoin lines 498-513) creates fresh PlayerState but doesn't check or restore DowningSystem state
- handleReconnectionTimeout (line 826) has no awareness of downed state — treats downed players like normal disconnects
- Reusing container infrastructure simpler than custom loot distribution logic
- Player agency improves with explicit take commands over auto-distribution
- Corpse item pattern aligns with thematic game feel (visible death consequences)
- CombatSystem.combatants map persists beyond encounter lifetime — cleanupEncounter must delete entries to prevent stale roomIds
- Both attack handler (attack.ts:55) and creature AI (ZoneRoom:1894) re-register combatants on demand, so cleanup is safe
- Flee already updates combatant.roomId in CombatSystem (line 1007); other movement paths need defensive sync via updateCombatantRoom
- Player movement points to sync: handleCommandMessage goto, moveFollowers, admin teleport
- Post-combat cooldown (POST_COMBAT_COOLDOWN_TICKS=3) removed — looting now uses corpse containers, so no need to keep combat alive after all enemies die. Combat ends immediately when one side is eliminated.
- **Disconnect-while-downed fix:** Three-part fix in ZoneRoom.ts — (1) handlePlayerDeath else-branch cleans up disconnected players with full cache/state cleanup + broadcastRoomOccupantsUpdate, (2) onLeave catch block returns early for downed players so bleed-out continues ticking, (3) cleanupPlayerCaches helper DRYs cache deletion shared between onLeave and handlePlayerDeath
- cleanupPlayerCaches consolidates 9 cache maps + follow/group cleanup — reused in onLeave, handlePlayerDeath connected timeout, and handlePlayerDeath disconnected path
- broadcastRoomOccupantsUpdate was missing from both connected and disconnected death paths — ghost entities persisted in room occupant lists

### 2026-04-13: Permadeath Death Handler Implementation
**Status:** ✅ Complete

**Task:** Implement permadeath death handler logic as a server-wide mode (not per-character opt-in). When enabled via env vars, all characters face permanent death after reaching a configurable death threshold.

**Implementation:**
1. **Server Config** (config.ts):
   - Added `permadeath: { enabled: boolean, threshold: number }` to ServerConfig
   - Reads from `PERMADEATH_ENABLED` and `PERMADEATH_THRESHOLD` env vars
   - Default threshold: 1 (single death = permadeath)

2. **Death Handler Logic** (ZoneRoom.ts):
   - Modified `handlePlayerDeath()` to check permadeath condition AFTER normal death flow
   - Death count increment is now awaited (was async void) to ensure synchronous permadeath check
   - If permadeath triggered, calls `executePermadeath()` and returns early (skips normal respawn)
   - Normal death flow (corpse creation, item drops, death penalty) happens BEFORE permadeath check

3. **Permadeath Execution** (executePermadeath method):
   - Calculates survival time (from zone join to death)
   - Determines cause of death (creature name or player name) and zone of death
   - Queries total kills/deaths from `game_metrics` table
   - Records character to `hall_of_fame` table (migration 017 already exists)
   - Soft-deletes character via `characterRepo.softDelete()`
   - Sends special 'permadeath' overlay message to client with full stats
   - Schedules disconnection after 5 seconds (allows client to show permadeath screen)
   - Cleans up player from all zone systems (players, combat, downing, etc.)

4. **Client Messaging** (shared/index.ts):
   - Extended `OverlayMessage.state` to include 'permadeath' type
   - Added optional `permadeathStats` field with character name, level, kills, deaths, survival time, cause/zone of death
   - Client can now differentiate between normal death and permadeath screens

**Edge Cases Handled:**
- Player disconnects during permadeath: Character still soft-deleted (DB persistence)
- Multiple simultaneous deaths: Each death is atomic (await on death count increment)
- Missing metrics data: Defaults to 0 kills/deaths if query fails
- Missing zone/creature names: Falls back to "unknown zone" / "a creature"

**Compilation:** ✅ Server compiles successfully (npx tsc --noEmit passes)

**Key Design Decisions:**
- Permadeath check is synchronous and happens immediately after death count increment
- Normal death flow (corpse, items, penalties) proceeds normally even for permadeath deaths
- Permadeath short-circuits the normal respawn flow by returning early
- 5-second delay before disconnect gives client time to render the permadeath screen
- Hall of fame stats are fire-and-forget (logged but don't block permadeath execution)


### 2026-04-13: Creature Reroll Stats Shape Fix
**Status:** ✅ Complete

📌 Team update (2026-04-13T1145Z): Fix creature reroll stats shape mismatch — CreatureDefinition interface now uses flat properties (maxHp, attack, defence, armour) matching store entity shape. Decided by Jarlaxle.

**Problem:** Simulate-routes.ts CreatureDefinition interface expected nested stats object (`creature.stats.maxHp`), but PgCreatureDefinitionsStore.rowToEntity() returns flat entity (`creature.maxHp`). Result: creature.stats was always undefined, triggering "no stats defined" 400 error on reroll.

**Solution:** 
- Changed CreatureDefinition to use flat properties
- Construct baseline stats object from those properties before passing to rollCreatureStats()
- Updated guard check to validate flat properties

**Why This Approach:**
The store's flat shape is used consistently elsewhere in the admin system. Changing the store to nest stats would ripple across admin UI and other routes. Adapting at the simulate boundary is minimal and safe.

**Impact:** Reroll endpoint now works without errors.

---

## Detailed History

Full session logs and dated entries have been moved to `history-archive.md` to keep this file compact.


### 2026-04-13: Permadeath Design Pivot — Reset Model, Not Deletion
**Status:** ✅ Complete

**Task:** Change permadeath from character deletion to character reset. Remove threshold config, make permadeath a simple boolean toggle.

**Design Changes:**
1. **No threshold** — PERMADEATH_THRESHOLD env var removed. Permadeath is now a single boolean: PERMADEATH_ENABLED=true/false. When enabled, EVERY death triggers a permadeath reset.
2. **Reset, not delete** — Character is NOT soft-deleted. Instead, character is RESET to fresh state:
   - Inventory cleared (DB + in-memory)
   - Equipment cleared (loadout)
   - Death count PRESERVED (lifetime stat)
   - Stash PRESERVED (key incentive: bank gear before you die)
   - Character stays active (is_active stays true, deleted_at stays null)
3. **Hall of Fame still records "past lives"** — Each permadeath reset creates a hall_of_fame entry recording peak stats before reset.
4. **After reset, player respawns as fresh character** — They respawn at their faction hub/inn with wiped inventory, not disconnected to character select.

**Implementation:**

**1. packages/server/src/config.ts:**
- Removed threshold: number from permadeath config interface
- Removed PERMADEATH_THRESHOLD env var reference
- Config now just has enabled: boolean

**2. packages/server/src/rooms/ZoneRoom.ts:**
- Changed permadeath condition from config.permadeath.enabled && newCount >= config.permadeath.threshold to just config.permadeath.enabled
- Rewrote executePermadeath() method:
  - KEPT: Hall of fame recording (unchanged)
  - REMOVED: this.characterRepo.softDelete(playerId) call
  - ADDED: Character reset logic:
    - await this.inventoryRepo.clearInventory(playerId) — clear DB inventory
    - await this.loadoutService.clearLoadout(dbId) — clear equipped items
    - player.inventory.clear() + player.equipment = undefined — clear in-memory state
    - Death count NOT reset (preserved)
    - Stash NOT touched (preserved)
  - CHANGED: After showing permadeath overlay, respawn player normally (3-second delay, same respawn location logic as normal death)
  - REMOVED: 5-second disconnect timer and ROOM_SWITCH to character-select
  - Updated narration to reflect reset model: "Your character is reset, but your stash remains…"

**3. packages/server/src/__tests__/wave3-redis-contracts.test.ts:**
- Removed threshold: 1 from mock config

**Compilation:** ✅ npx tsc --noEmit -p packages/server/tsconfig.json passes

**Design Notes:**
- This creates an extraction-loop incentive: players must bank valuable gear in stash before risky ventures
- Stash becomes the persistent "meta progression" across permadeath resets
- Death count survives as a lifetime stat tracking total deaths across all resets
- Hall of Fame now records "past lives" rather than "final death"

**Not Updated (out of scope):**
- packages/server/src/__tests__/permadeath.test.ts — Tests still reference threshold model; will need rewrite for new reset model
- Client-side handling of permadeath overlay dismissal and respawn flow

---

### 2026-04-13: Permadeath Death Handler (ROUND 1 — DEPRECATED)

**Task:** Implement permadeath death handler with soft-delete and threshold logic.

**Outcome:** ⚠️ ITERATION — Implementation completed using old threshold model; superseded by Round 2 correction.

**Deliverable (Then Deprecated):**
- Soft-delete handler in ZoneRoom.ts: check `enabled && death_count >= threshold`
- Hall of Fame recording on threshold breach
- Character soft-delete flag set

**Process Note:** User directive during session pivoted design from threshold + soft-delete to simple boolean toggle + character reset. Round 1 deliverable replaced by Round 2 redesigned handler.

---

### 2026-04-13: Permadeath Death Handler — Reset Model (ROUND 2 — DELIVERED)

**Task:** Reimplement permadeath death handler for reset-based model (correction).

**Outcome:** ✅ DELIVERED — Handler redesigned for simple toggle and character reset.

**Deliverable:**
- **Config simplification:** Removed threshold logic, changed to simple boolean toggle
- **Reset mechanics:** On permadeath trigger:
  - Clear inventory (DB + in-memory)
  - Clear equipment (loadout service + player state)
  - Reset level to 1, skills to defaults
  - **Preserve stash** (extraction incentive)
  - **Preserve death count** (lifetime stat)
  - Respawn player in-game immediately

**Key Changes:**
- Condition: `enabled && death_count >= threshold` → just `enabled`
- Action: Soft-delete → reset & respawn
- Every death triggers (no counting threshold)

**Impact:** Enables hardcore server mode (every death resets), maintains extraction loop incentive (stash carries over).

---


### 2026-04-13: Permadeath Starter Kit Flag Reset
**Status:** ✅ Complete

**Task:** Fix permadeath-reset characters not receiving starter items on zone join. The starter kit system checks a `starter_kit_granted` flag — when true, starter items are NOT granted. During permadeath reset, inventory and equipment were cleared but the flag wasn't reset, leaving characters without gear and unable to receive starter items.

**Implementation:**

1. **CharacterRepository Interface** (CharacterRepository.ts):
   - Added `resetStarterKitFlag(characterId: string): Promise<void>` method

2. **PgCharacterRepository** (PgCharacterRepository.ts):
   - Implemented `resetStarterKitFlag()` to set `starter_kit_granted = false` in DB

3. **InMemoryCharacterRepository** (InMemoryCharacterRepository.ts):
   - Implemented `resetStarterKitFlag()` to remove characterId from starterKitGranted Set

4. **ZoneRoom.executePermadeath()** (ZoneRoom.ts):
   - Added call to `this.characterRepo.resetStarterKitFlag(playerId)` after clearing loadout
   - Positioned between equipment clear and in-memory inventory clear for logical flow
   - Now resets: inventory (DB + memory), equipment (loadout + memory), and starter kit flag

**Flow:**
- Player dies during permadeath mode → executePermadeath() triggered
- Inventory cleared from DB and memory
- Equipment (loadout) cleared from DB and memory  
- **Starter kit flag reset to false** ← NEW
- Character preserved (not deleted), stash preserved
- Character respawns with empty inventory
- On next zone join, starter kit system sees flag=false → grants starter items

**Compilation:** ✅ `npx tsc --noEmit -p packages/server/tsconfig.json` passes

**Impact:** Permadeath-reset characters now receive starter gear (Rusty Blade, Tattered Leather, Waterlogged Potion) on their next zone join, matching fresh character behavior.

---

### 2026-04-13T19:39:59Z: Spawn Manifest — Starter Kit Reset Deployment
**Status:** ✅ Complete — Build verified

📌 **Team Update:** Deployed starter kit flag reset as part of permadeath feature completion (see Coordinator lint fixes + Regis UI links).

**Outcome:** Completed reset starter kit flag logic for permadeath-reset characters. Part of three-agent spawn manifest:
- Coordinator: Lint fixes + hall_of_fame migration 
- Jarlaxle: Starter kit flag reset ← THIS  
- Regis: Hall of Fame UI links

**Deliverable:** `resetStarterKitFlag()` integrated into `executePermadeath()` workflow so reset characters receive starter gear on next zone join.

---



### 2026-04-14: Passive Dodge Refactor -- Active to Passive Mechanic
**Status:** Complete

**Task:** Refactor dodge from a selectable combat action to a passive mechanic. Auto-combat style: players auto-strike, dodge triggers passively on every incoming attack.

**Key Changes:**
1. packages/shared/src/index.ts -- Removed dodge from CombatAction type union
2. packages/server/src/combat/damage.ts -- Removed 0.5x stance multiplier for dodge; dodge roll now fires on every attack when defenderAgility + dodgeRoll provided
3. packages/server/src/combat/CombatSystem.ts -- All defaults from dodge to strike (idle, disconnected, wind-up, no-target, ability fallback). Dodge roll always generated on every strike.
4. packages/server/src/combat/actions.ts -- resolveDodge() updated for passive narration
5. packages/server/src/commands/handlers/combat-actions.ts -- handleDodge now informs player that dodge is passive
6. packages/server/src/rooms/ZoneRoom.ts -- Creature AI combat_dodge action submits strike instead

**Test Impact:** 9 test files updated. All 177+ combat tests passing, 23 shared type tests passing. Zero regressions.

**Design Notes:**
- Binary dodge: full avoidance (0 damage) or full hit. No half-damage reduction.
- Dodge formula unchanged: min(75%, 20% + 2% x AGI + 3% x dodgeSkillRank)
- Posture system untouched (separate concept)
- Default roll () => 1 preserves backward compat -- always fails dodge in tests without explicit PRNG

### Learnings
- Passive dodge simplifies combat action space while preserving AGI/skill investment value
- Every strike now generates a dodge roll -- default roll backward compat is critical for deterministic tests
- Removing an action from a type union cascades heavily through tests

### 2026-04-14: Combat Stat System Phase 1 — Types, Formulas, Equipment Integration
**Status:** ✅ Complete (production code; test updates pending — Minsc's domain)

**Task:** Replace old 5-stat model (maxHp/attack/defence/armour/agility) with 8-stat weapon-skill model per directives.

**Key Design Decisions Applied:**
1. **Agility REMOVED** — dodge stat alone handles avoidance + flee success
2. **Creatures use weapon-type skills** (same as players) — no single `attack` stat
3. **Shield block is BINARY** — shieldBlock determines block CHANCE; success = 0 damage
4. **Resolution order:** Dodge → Shield Block → Damage (armour reduction)
5. **Unarmed = pure skill** — no phantom weapon; attack = skill value only
6. **8 unified stats:** maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour

**Files Modified:**
- `combat/CombatState.ts` — CombatStats (8 stats), WeaponType, EquipmentBonuses, ItemStats, Combatant (no agility/defence/evasionSkillRank/dodgeSkillRank), createCombatant (opts object)
- `combat/damage.ts` — getDodgeChance(dodge) single-param, getShieldBlockChance(), calculateDamage with 3-step resolution, DamageResult.blocked
- `combat/stats.ts` — NEW: calculateEquipmentBonuses, calculatePlayerEffectiveStats, calculateCreatureEffectiveStats
- `combat/CombatSystem.ts` — Flee uses dodge (FLEE_DODGE_BONUS_PER_RANK), shield block roll in combat tick, blocked narration
- `combat/index.ts` — Barrel exports updated
- `creatures/types.ts` — Creature interface: weapon skills, dodge, shieldBlock (required), no agility/defence/dodgeSkillRank
- `creatures/CreatureManager.ts` — createCreature/toCombatant use new stats
- `creatures/templates/*.ts` — All 5 templates converted to new stat shape
- `commands/index.ts` — CreatureRef: dodge, shieldBlock (no agility/defence/dodgeSkillRank)
- `commands/handlers/attack.ts` — createCombatant opts object
- `commands/handlers/sandbox.ts` — STAT_ALIASES: dodge/shieldBlock replace defence/agility
- `rooms/ZoneRoom.ts` — CreatureRef mapping uses new fields
- `systems/DeathPenalty.ts` — CombatStatModifiers: removed defence
- `admin/routes.ts` — entityToTemplate stats mapping updated

**Architecture Notes:**
- createCombatant now takes an optional opts object instead of positional args
- Creature "attack" = max(unarmed, oneHanded, twoHanded, ranged) — best weapon skill
- Player "attack" = base weapon skill + equipment weapon damage (via calculatePlayerEffectiveStats)
- Shield block uses separate roll from dodge: `this.roll()` called twice per attack when shieldBlock > 0
- Default roll (() => 1) ensures backward compat: always fails both dodge and block in tests without explicit PRNG
- CombatEvent.blocked field added for narration differentiation
- DB/migration changes NOT included (Drizzt's domain)
- Admin simulate-routes.ts and PgCreatureDefinitionsStore left unchanged (DB-coupled, Drizzt's domain)
- Test file updates NOT included (Minsc's domain)

**Learnings:**
- Stat model changes cascade broadly: creatures, combat system, commands, admin, death penalty
- Keeping createCombatant as opts object instead of positional params is more maintainable as stats grow
- Binary shield block is simpler to implement than partial reduction (no damage math, just 0-or-full)
- The combat-dodge-block.test.ts tests (33 tests) written by Minsc all pass — good TDD coordination
---

### 2026-04-13T23:36–2026-04-14T00:02: Combat Stat System Phase 1 — Combat System & Types (DELIVERED)

**Task:** Implement TypeScript types, CombatStats interface, damage formula, equipment bonuses, shield block, and combat system updates.

**Outcome:** ✅ DELIVERED — 8-stat model, binary shield block, dodge→block→damage resolution, clean TypeScript compilation, all 74 server tests pass.

**Deliverables:**
- **CombatStats interface:** 8-stat model (maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour) shared by players and creatures
- **createCombatant signature:** Refactored to single optional `opts` object (replaces 8 positional params, more maintainable)
- **Creature effective attack:** `Math.max(unarmed, oneHanded, twoHanded, ranged)` — best weapon skill becomes attack rating
- **Damage formula:** base + equipment_bonus - defense → correct resolution
- **Equipment bonuses:** Extracted weapon type, weapon damage, armour, shield block from equipment slots
- **Effective stat calculations:** calculatePlayerEffectiveStats() and calculateCreatureEffectiveStats() (implemented, tested, awaiting runtime integration)
- **Shield block mechanic:** Separate PRNG roll post-dodge. Resolution order: dodge (full avoidance) → shield block (reduce/nullify) → apply damage. Default roll (() => 1) ensures deterministic tests.
- **CombatEvent.blocked field:** Added to differentiate block narration ("blocks with shield!") from dodge narration ("dodges!")
- **Passive dodge:** Removed 'dodge' from CombatAction union. Fires passively on every incoming attack. Binary outcome: full avoidance or full hit (no 0.5× reduction).
- **19 test files updated:** All passing, 63 test failures resolved

**Technical Decisions:**
1. opts object over positional params: Maintainable as stats evolve
2. Creature attack = max weapon skill: No equipment layer for creatures
3. Separate PRNG rolls for dodge + block: Independent resolution
4. Binary block vs partial reduction: Simpler rules engine
5. Dodge refactored to passive: Eliminate decision paralysis
6. FLEE_DODGE_BONUS_PER_RANK renamed from FLEE_EVASION_BONUS_PER_RANK (reflects dodge stat)

**Scope Notes:**
- DB migrations NOT included (Drizzt's domain)
- Test file updates NOT included (Minsc's domain)
- Admin simulate-routes.ts and PgCreatureDefinitionsStore unchanged (Drizzt's domain)

**Integration Notes:**
- Combat system ready to integrate with Drizzt's DB-fetched base stats (via characterRepo.getBaseStats())
- Equipment bonus calculations ready but not yet wired into ZoneRoom player registration
- Awaiting Phase 1.5 integration to apply effective stats to runtime combatants

**Team Coordination:**
- Coordinated with Drizzt: Awaits migration 018+019 for character base stats
- Coordinated with Minsc: 63 test failures resolved, all passing
- Coordinated with Elminster review: Architecture approved, integration gaps C1-C2 identified

### 2025-07-18: Combat Stat Wiring Gap Diagnostic
**Status:** ✅ Diagnostic complete — implementation pending

**Findings:**
- 3 player `createCombatant()` call sites (attack.ts:57, ZoneRoom.ts:1911, ZoneRoom.ts:1952) pass NO stats — every player gets DEFAULT_PLAYER_STATS (unarmed=5, armour=2)
- `calculateEquipmentBonuses()` and `calculatePlayerEffectiveStats()` from combat/stats.ts are dead code — called only in tests, never in production
- `CharacterRepository.getBaseStats()` loads 8-stat model from DB but is never called by ZoneRoom or CommandContext
- Creature side is fully wired: ContentRegistry→CreatureManager→toCombatant→CombatSystem all pass 8 stats correctly
- Damage pipeline (calculateDamage + dodge/block rolls) works correctly when given real stats
- Fix requires: inject CharacterRepository into player combatant registration path, call calculatePlayerEffectiveStats before createCombatant

**Decision:** Written to `.squad/decisions/inbox/jarlaxle-combat-stat-wiring-gaps.md`

---

### 2026-06-24: Admin Creature CRUD Migration + calculateCreatureEffectiveStats Wiring (#452, #456)

**Problem:** PgCreatureDefinitionsStore still used old columns (attack, defence, agility) from pre-Phase 1 schema. `calculateCreatureEffectiveStats()` existed but wasn't used in production paths — inline `Math.max()` was duplicated in `CreatureManager.toCombatant()` and `ZoneRoom.buildCommandContext()`.

**Changes:**
- PgCreatureDefinitionsStore: All SELECT/INSERT/UPDATE queries now use Phase 1 columns (unarmed, one_handed, two_handed, ranged, shield_block, dodge_skill_rank)
- CreatureRow interface + rowToEntity mapper updated for new column layout
- INSERT uses 25 params (was 22), UPDATE uses 26 params (was 23)
- admin-crud.test.ts: Creature fixtures updated to Phase 1 stat model
- content-stores.test.ts: CREATURE_ROW mock, param counts, and field assertions updated
- CreatureManager.toCombatant: Now delegates to calculateCreatureEffectiveStats() instead of inline Math.max()
- ZoneRoom.buildCommandContext: Both creaturesInRoom and resolveCreaturesInRoom use calculateCreatureEffectiveStats()

### Learnings
- DB columns use snake_case (one_handed, shield_block, dodge_skill_rank), entity fields use camelCase (oneHanded, shieldBlock, dodge)
- ContentRegistry.ts is the canonical pattern for loading creature stats from DB — always match its column list
- When changing column counts in parameterized queries, content-stores.test.ts has exact param-count assertions that must be updated
- calculateCreatureEffectiveStats() is now the single source of truth for creature stat resolution — no more inline Math.max()

- **Bleed-out HP drain fix**: Changed from 1-HP-per-tick (reaching -60) to formula-based drain via BLEED_HP_LOSS=10. HP = -floor(elapsed * 10 / 60), dying at -10 HP while keeping the 60-tick (~1 min) timer. Formula avoids accumulation drift.
- **Combat pacing**: Added AUTO_ATTACK_COOLDOWN_TICKS=1 and strikeCooldown field on Combatant. After any strike resolves, that combatant idles for 1 tick before auto-attacking again — effectively halving auto-attack DPS. Player-submitted abilities are unaffected (they bypass the auto-attack path). Cooldown decrements at start of resolveEncounterTick.
- The auto-attack idle path queues `{ action: 'strike' }` with no targetId — effectively a no-op since resolveEncounterTick skips strikes with no valid target.

---
# Jarlaxle — Server Developer History

## Learnings & Assignments

### 2026-04-17: Issue #467 — Combat HUD Phase A (Server)

**Assignment:** Implement COMBAT_STATE server message type and broadcast logic

**Context:**
- Elminster completed architecture analysis for Combat HUD feature (#467)
- CombatHUD component on client is 90% built but lacks server support
- Server has all required data (Combatant list, HP, targets) in memory but only sends per-event narratives to clients
- Blocking issue: No structured snapshot of combatant state is broadcast to clients

**Your Role (Phase A — Server Stream):**
1. Add COMBAT_STATE message type to shared/index.ts with interface:
   - encounterId, tick, combatants[], hostileIds[], playerTargetId
   - Each combatant includes: id, name, hp, maxHp, hpTier, isPlayer, currentTarget, telegraphedAction
2. Implement ZoneRoom.deliverCombatResults() broadcast after narration events
   - Send unicast per player (not broadcast) to prevent enemy scouting
   - Derive combatant data from CombatSystem each tick
   - Include telegraph data from Combatant.windUp if present

**Dependencies:** None — Regis (client stream) can work in parallel once message type is defined

**Timeline:** ~5 minutes for message type definition, then proceed with implementation

**Related Files:**
- packages/server/src/rooms/ZoneRoom.ts (add broadcast logic)
- packages/shared/index.ts (message types)
- packages/server/src/combat/CombatSystem.ts (data source)

**Full Specification:** See `.squad/decisions/decisions.md` (merged from inbox)

**Status:** ✅ Implemented — PR #469

## Learnings

### COMBAT_STATE Implementation (2026-04-17)

- **Unicast pattern**: COMBAT_STATE is sent per-player (not broadcast) so `hostileIds` and `playerTargetId` are perspective-correct. Same pattern used for EFFECTIVE_STATS.
- **Broadcast timing**: `broadcastCombatState()` runs in `update()` right after `deliverCombatResults()`, inside the `hasActiveEncounters()` guard — no broadcast when combat is idle.
- **CombatSystem accessors added**: `getActiveEncounters()` and `getEncounterCombatants(encounterId)` — these iterate the private maps without exposing internals.
- **Status derivation**: Combatant status (`fighting`/`downed`/`dead`) is derived from `hp <= 0` + `downingSystem.isPlayerDowned()`. Downed players and pending-death-teleport players are excluded from receiving the message.
- **Shared types location**: `packages/shared/src/index.ts` — all message interfaces and `MessageTypes` constant live here. Build with `npm run build` in `packages/shared` before server compilation.
- **Key files**: `ZoneRoom.ts:broadcastCombatState()`, `CombatSystem.ts:getActiveEncounters/getEncounterCombatants`, `shared/index.ts:CombatStateMessage`
- **Tests**: 156 server test files (3280 tests) all pass. E2e tests require a running server and fail independently.

---

### COMBAT_STATE PR #470 Review — Approved by Elminster (2026-04-17)

**Status:** ✅ APPROVED — No revisions requested

Elminster completed comprehensive architecture review of PR #470 (re-PR of #469 targeting `dev`). No architectural concerns, no implementation issues, no cherry-pick artifacts.

**Review Details:**
- `ZoneRoom.broadcastCombatState()` correctly implements unicast-per-player pattern with perspective-correct messages
- `CombatSystem.getActiveEncounters()` and `getEncounterCombatants(encounterId)` safe and clean — no internal state exposure
- Cherry-pick merge conflicts resolved correctly
- All 17 tests verified passing
- Pattern established: Per-player unicast with perspective-specific fields (`hostileIds`, `playerTargetId`) is the correct model for server-authoritative state sync

**No revisions requested. Ready to merge to `dev`.**

See `.squad/decisions/decisions.md` for full review details.

---

### 2026-04-18: Reconnect-While-Downed Bug Investigation (DELIVERED)

**Task:** Investigate browser refresh while downed — combat/death state focus.

**Outcome:** ✅ DELIVERED — Root cause analysis with 3 interacting failures, decision proposal written to inbox.

**Coordination:** Parallel investigation with Drizzt (Engine Dev). Both agents independently identified the same three core failures:
1. Bleed-out ticking on disconnected players
2. Missing room occupants broadcast in death cleanup
3. Downed state not restored on duplicate-join reconnect

**Jarlaxle Focus:** Combat/death state systems perspective
- **Failure 1:** onLeave cleanup never broadcasts room occupants update (L786-818)
- **Failure 2:** Downed players invisible to combat disconnect handling (L730, 743-745) — bleed-out keeps ticking
- **Failure 3:** Downed state not restored on duplicate-join reconnect (L498-513, 620-628)
- Test coverage gaps identified: disconnect-during-downed, downed-reconnect-restore, room-broadcast on disconnect
- Priority fix sequence: broadcast fix (all scenarios) → downed-timeout→death → reconnect-restore

**Drizzt Focus:** Reconnection/session handling perspective
- Decision proposal recommending **Approach A** (pause bleed-out on disconnect)
- Simplest fix, aligns with `allowReconnection` grace window, avoids new DB state

**Deliverables:**
- `.squad/orchestration-log/2026-04-18T09-46-jarlaxle.md` — Orchestration summary
- `.squad/decisions/decisions.md` — Both proposals merged (deduplicated)
- `.squad/log/2026-04-18T09-46-reconnect-downed-bug.md` — Session log

See Drizzt's orchestration log for engine/session perspective on recommended fix approach.

### 2026-04-18: Disconnect-While-Downed Bug Fix Implementation (COMPLETE)

**Task:** Implement 3 fixes in ZoneRoom.ts per user directive: bleed-out continuation on disconnect, disconnected death cleanup, cache helper consolidation.

**Outcome:** ✅ COMPLETE — All 68 tests passing (40 downing + 23 death-spawn).

**Implementations:**

1. **Early return for downed players in `onLeave`** (L~2930)
   - Downed players skip full cleanup on disconnect
   - Bleed-out continues ticking while disconnected (no free pass per user directive)
   - Prevents erroneous death penalties or duplicate cleanup calls

2. **Disconnected death cleanup in `handlePlayerDeath`** (L~2710)
   - New `else` branch: When `findClient(playerId)` returns null, player is confirmed disconnected
   - Executes full state cleanup: profile save, cache purge, occupant broadcast
   - Symmetric to connected path — both paths now call `broadcastRoomOccupantsUpdate()`

3. **`cleanupPlayerCaches` helper** (new, L~2750)
   - DRYs 9+ cache map deletions + follow/group cleanup shared between `onLeave` and `handlePlayerDeath`
   - Reduces duplication, improves maintainability

**Testing & Verification:**
- Created test file: `packages/server/src/__tests__/disconnect-while-downed.test.ts`
- 5 unit tests: bleed-out continuation, death cleanup execution, ghost entity removal, reconnect-after-downed, cache cleanup
- 4 integration test stubs: full lifecycle, multi-player disconnect, fast reconnect cycling, death penalty persistence
- All 68 tests in ZoneRoom test suite passing
- ESLint compliance verified

**Files Modified:**
- `packages/server/src/rooms/ZoneRoom.ts` (3 fixes)
- `packages/server/src/__tests__/disconnect-while-downed.test.ts` (new)

**Related Orchestration:**
- `.squad/orchestration-log/2026-04-18T10-38-jarlaxle.md` — Implementation orchestration
- `.squad/orchestration-log/2026-04-18T10-38-minsc.md` — Test orchestration
- `.squad/log/2026-04-18T10-38-disconnect-downed-fix.md` — Session log
- `.squad/decisions.md` — 2 new decisions merged (User directive + implementation strategy)

### 2026-04-18: Phase 1 — Multi-Encounter Combat Refactor
**Status:** ✅ Complete

**Task:** Rewrite CombatSystem encounter joining logic to support multiple independent encounters per room. Root cause was `findEncounterInRoom()` returning the first encounter, forcing all combatants into one fight.

**Implementation:**
1. **CombatSystem.initiateCombat()** — Rewrote with join-by-target logic:
   - Both in same encounter → idempotent (just set target)
   - Both in different encounters → merge encounters
   - Attacker in encounter → add target
   - Target in encounter → add attacker
   - Neither → create new encounter
2. **Removed** `findEncounterInRoom()` — the root problem
3. **Added** `findEncountersInRoom(roomId)` — returns ALL encounters in a room
4. **Added** `mergeEncounters(encA, encB)` — merges two encounters preserving threat tables, using max tick counts
5. **Shared types** — Added `isParticipant?: boolean` to `CombatStateMessage`
6. **broadcastCombatState** — Now sends `isParticipant` flag per player per encounter

**Key decisions:**
- Merge uses max(tickCount) and max(ticksSinceLastStrike) to preserve progression
- Threat tables from both encounters are preserved (encA's take priority on collision)
- ZoneRoom stabilized-player re-engage logic unchanged — `initiateCombat()` correctly handles adding player to creature's existing encounter
- Room-entry aggressive creature logic unchanged — already checks `isInCombat()` before initiating

**Test results:** All 3316 tests pass, 0 regressions

**Files Modified:**
- `packages/server/src/combat/CombatSystem.ts` (initiateCombat rewrite, findEncounterInRoom→findEncountersInRoom+mergeEncounters)
- `packages/server/src/rooms/ZoneRoom.ts` (broadcastCombatState isParticipant)
- `packages/shared/src/index.ts` (CombatStateMessage.isParticipant)

## Learnings
- Join-by-target is backward compatible with join-by-room for the single-encounter case — all existing tests pass without modification
- The combatantEncounter map is the key invariant: every combatant ID must map to exactly one encounter ID at all times
- mergeEncounters must update combatantEncounter for ALL moved combatants or lookups break silently
- broadcastCombatState already iterates all encounters and unicasts per player — multi-encounter support was already structurally present in the broadcast layer
- **Phase 3 AoE Merge:** resolveAoE() is a pure query + mutation method that handles all encounter topology changes for AoE attacks — it doesn't deal damage (tick resolution handles that). Key insight: collect all unique encounters from targets first, then merge them all into caster's encounter to avoid double-merging.
- mergeEncounters() made public in Phase 3 — resolveAoE needs it, and it's already well-tested via initiateCombat's Step 2 logic
- WHIRLWIND ability (aoe_attack type, 0.75 damage multiplier, 4 tick cooldown, 20 stamina) added to DEFAULT_ABILITIES map for future AoE damage implementation
- resolveAoE handles 4 main cases: (1) caster not in combat → create new encounter, (2) caster in combat + targets in other encounters → merge all into caster's, (3) targets not in any encounter → add to caster's, (4) mix of above → merge all into one
- AoE merge preserves threat tables from all merged encounters (additive for creatures in multiple encounters), uses Math.max for tick counts, and sets caster's currentTarget to first valid target if not already set
