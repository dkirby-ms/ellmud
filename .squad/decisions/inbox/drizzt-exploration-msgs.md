# Decision: Exploration Messages Are Fire-and-Forget

**Date:** 2025-07-17  
**Author:** Drizzt (Engine Dev)  
**Status:** Implemented

## Context

ShardRoom sends exploration data to clients for the in-game map. Three paths trigger exploration messages:
1. `onJoin` → `EXPLORATION_DATA` (bulk payload with starting room)
2. Movement command → `EXPLORATION_UPDATE` (incremental room)
3. Flee (combat tick) → `EXPLORATION_UPDATE` (incremental room)

## Decision

Exploration persistence (`recordVisit`) is fire-and-forget — errors are logged but never block gameplay. The client map renders from messages alone; the repository is for cross-session persistence only.

Exits are serialized as `Record<string, string>` (direction → targetRoomId) in the `ExploredRoomData` payload, converted from the `Map<Direction, string>` used in the room graph.

## Impact

- **Client team:** The `ExploredRoomData` shape matches what `useExplorationMap.ts` expects. No client changes needed.
- **Persistence team:** If `recordVisit` throws, the player's map still works for the current session. Only cross-session recall is affected.
