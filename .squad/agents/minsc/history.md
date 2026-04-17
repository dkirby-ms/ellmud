# Minsc — Test Architect History

## Learnings

### 2025-07-25 — COMBAT_STATE message tests (Issue #467 Phase A)

- CombatSystem **removes defeated combatants** from `encounter.combatantIds` during `resolveTick()`. The COMBAT_STATE builder must merge defeated info from `TickResult.events` to show dead combatants in the client HUD.
- `CombatSystem.getEncounterForCombatant()` + iterating `encounter.combatantIds` is the correct way to build a per-player snapshot. Each player's snapshot is scoped to their encounter (unicast, not broadcast).
- `submitAction` takes `(combatantId, action: CombatAction, targetId?, fleeRoomId?, abilityId?)` — not an object.
- Default roll `() => 1` always fails dodge/block. Use `() => 0` for flee to succeed.
- Vitest workspace uses `packages/*` glob — `--project server` filter doesn't work. Run tests by file path instead.
