# Orchestration Log — Drizzt (Engine Dev)

**Timestamp:** 2026-03-30T00:30:00Z  
**Agent:** Drizzt  
**Task:** Fix combat names showing UUIDs instead of character names + peaceful mode combat disengage  
**Mode:** Background  
**Status:** ✅ SUCCESS

## Summary

Resolved two combat-related bugs:
1. Combat narration messages displayed raw session IDs (e.g., `player-abc123`) instead of character names
2. Toggling `/peaceful` mode ON while in active combat did not remove the player from the encounter

## Implementation Details

### Character Name Plumbing via CommandContext
- Added `characterName?: string` field to `CommandContext` interface
- Modified `ShardRoom.buildCommandContext()` to populate `characterName` from the existing `characterNames` map during command building
- Updated `attack.ts` createCombatant call to use the character name from context instead of session ID
- Pattern: ShardRoom → buildCommandContext → CommandHandler (attack.ts)

### Peaceful Mode Removes from Combat
- Updated `peaceful.ts` handler: when peaceful mode is toggled ON, immediately calls `combatSystem.removeCombatant(player.sessionId)`
- Existing `removeCombatant` method handles cleanup (removes from encounter, cleans up if ≤1 combatant remains)
- Ensures peaceful flag's three-layer defense is complete

### Creature Combatant Registration
- In `ShardRoom.processCreatureAction()`, creature → player combat registration now uses `this.characterNames.get(sessionId)` for display name
- Prevents creature attacks from also showing raw session IDs

## Files Changed
- `packages/server/src/commands/index.ts` — CommandContext interface
- `packages/server/src/rooms/ShardRoom.ts` — buildCommandContext, processCreatureAction
- `packages/server/src/commands/handlers/attack.ts` — createCombatant usage
- `packages/server/src/commands/handlers/peaceful.ts` — removeCombatant call
- `packages/server/src/state/PlayerState.ts` — peaceful flag persistence

## Test Results
- **All 91 combat-related tests pass** ✅
- No interface breaking changes to CombatSystem
- PlayerState peaceful flag does not affect serialization (runtime-only)

## Handoff Notes
- **Regis (UI team):** No client changes required. Narration text is now correct server-side.
- **Jarlaxle (Systems):** Peaceful flag defense is now three-layer: AI exclusion + initiation guard + active combat removal.
- **Coordinator:** Peaceful state persists across zone transitions via PlayerState static registry.

## Decision Document
Filed to: `.squad/decisions/inbox/drizzt-combat-bugs.md`
