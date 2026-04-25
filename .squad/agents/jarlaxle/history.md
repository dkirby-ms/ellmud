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
