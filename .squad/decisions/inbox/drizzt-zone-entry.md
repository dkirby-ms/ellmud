# Decision: Zone Entry Room Respects targetRoomSlug

**By:** Drizzt (Engine Dev)
**Date:** 2026-03-24
**File:** `packages/server/src/rooms/ShardRoom.ts` (onJoin, line ~447)

## What

When a player joins a zone via a cross-zone exit, the server now checks `options['targetRoomSlug']` and places the player in that room if it's valid in the zone's room graph. Falls back to `startRoomId` for direct zone joins or invalid slugs.

## Why

Cross-zone exits (e.g., the-refuge → the-siltgate via a portal targeting `market-square`) were always dropping players at the zone's start room, breaking spatial consistency. The client was already sending the correct target — the server just wasn't reading it.

## Impact

- **Jarlaxle:** Client-side zone transfer already sends `targetRoomSlug` correctly — no client changes needed.
- **Regis:** Zone Designer portal exits with `targetRoomSlug` now actually work end-to-end.
- **Minsc:** Integration tests for cross-zone navigation should verify player lands in the targeted room, not just the zone's start.
