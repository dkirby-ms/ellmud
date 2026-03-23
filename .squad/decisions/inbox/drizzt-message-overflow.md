# Decision: Clear accumulated state on room transitions

**By:** Drizzt (Engine Dev)
**Date:** 2026-03-20
**PR:** #113

## What

Added `CLEAR_MESSAGES` action to the client store. Messages are now cleared on every `ROOM_SWITCH` transition — both shard→refuge and refuge→shard. This ensures each room context starts with a clean message slate.

## Why

The `messages` array in AppState is global and accumulates across the entire session. When a player died in a shard and returned to refuge, hundreds of combat/room messages rendered in the refuge chat panel, breaking layout. Only `LOGOUT` cleared messages before this fix.

## Impact

- **Jarlaxle:** If adding new accumulated UI state (notifications, event logs), it must be cleared on room transitions. Follow the `CLEAR_MESSAGES` pattern.
- **Minsc:** Integration tests that verify message state across room switches should expect messages to reset after transition.
- **All:** Sound cues (`soundCues` array) may need similar treatment — they also accumulate globally. Not fixed here because it wasn't reported as a bug, but worth watching.
