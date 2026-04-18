# Decision: Phase 1 Multi-Encounter Test Architecture

**Author:** Minsc (Tester)
**Date:** 2026-07-09
**Status:** Implemented

## Context

The multi-encounter combat refactor needs TDD tests written ahead of (or alongside) the CombatSystem changes. Sections A, B, and I of the test skeleton cover core behavior, joining/merging logic, and backward compatibility.

## Key Decisions

### 1. Tests target the NEW API surface
- `findEncountersInRoom(roomId)` — plural, public (currently only `findEncounterInRoom` exists, singular, private)
- `initiateCombat()` now handles 5 cases: new encounter, join attacker's, join target's, idempotent, merge
- `mergeEncounters()` is exercised implicitly through `initiateCombat()` when both combatants are in different encounters

### 2. Expected failure pattern
- 12/20 tests pass on the pre-refactor CombatSystem (backward compat + simple join scenarios)
- 8 tests fail because they require multi-encounter support (separate encounters in same room, merge behavior)
- This is correct TDD — tests define the contract, implementation makes them pass

### 3. Threat table merge verification strategy
- Build threat over 2 ticks in separate encounters, record values, merge, verify preservation
- Uses `ThreatTable.getThreat(playerId)` for precise value checks

### 4. Tick count merge strategy
- Stagger encounter creation (encounter A runs 3 ticks before B starts)
- After merge, verify `tickCount === max(A, B)`

## For Jarlaxle
The tests expect:
1. `findEncountersInRoom(roomId): CombatEncounter[]` — public method returning all encounters in a room
2. `initiateCombat` to NOT use `findEncounterInRoom` (singular) — instead check attacker/target encounter membership individually
3. Merge logic when both are in different encounters: union combatantIds, union threatTables, max tickCount
4. Idempotent when both already in same encounter (return existing encounter ID, no side effects)
