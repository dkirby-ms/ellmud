# Orchestration Log — Coordinator

**Timestamp:** 2026-03-30T00:30:00Z  
**Agent:** Coordinator  
**Task:** Fix peaceful mode persistence across zone transitions  
**Mode:** Inline  
**Status:** ✅ SUCCESS

## Summary

Resolved peaceful mode flag not persisting when players transitioned between zones. Added static `peacefulRegistry` to PlayerState to maintain player peaceful state across room switches.

## Problem Analysis

Peaceful mode is toggled via `/peaceful` chat command, but when players transitioned from shard → zone or zone → shard, the flag was reset. Needed a cross-room state container.

## Implementation Details

### Static Registry Pattern
- Added `private static peacefulRegistry: Map<string, boolean>` to PlayerState
- PlayerState populates `peaceful` from registry on construction: `this.peaceful = PlayerState.peacefulRegistry.get(sessionId) ?? false`
- `peaceful.ts` handler calls `PlayerState.setPeaceful(sessionId, true/false)` which updates both the registry and the current room's PlayerState instance

### Benefits
- PlayerState instances are scoped to rooms (created fresh on join)
- Registry persists the flag across room switches without hitting the database
- No serialization changes — peaceful is runtime-only
- Works correctly for both stateful (shard) and zone rooms

## Files Changed
- `packages/server/src/state/PlayerState.ts` — added static registry and accessor methods

## Test Results
- **12 peaceful mode tests pass** ✅
- Flag persists correctly on zone transitions
- No database schema changes

## Handoff Notes
- **Drizzt:** Peaceful mode is now three-layer: AI exclusion + combat removal + registry persistence.
- **Elminster:** No configuration changes; `DEV_MODE_ENABLED` env var already wired.
- **All:** Dev team can now use `/peaceful` across all zone and shard transitions without mode being reset.

## Decision Document
Filed to: `.squad/decisions/inbox/jarlaxle-peaceful-dev-mode.md` (updated with coordinator notes)
