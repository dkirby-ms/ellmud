# Session: Refuge Spawn Routing Fix

**Agent:** Drizzt  
**Date:** 2026-03-27  
**Status:** ✅ Complete

## Summary

Fixed two critical bugs preventing players from spawning in the refuge zone.

**Bug 1:** `zoneSlug` never passed to `ShardRoom.onCreate()` — client joins `zone:the-refuge` without explicit `zoneSlug` in options.  
**Fix:** Parse `zoneSlug` from `roomName` when it starts with `zone:`.

**Bug 2:** ROOM_SWITCH targets used `'refuge'` instead of `'zone:the-refuge'` — client couldn't match room definition.  
**Fix:** Updated targets to match exact Colyseus room name.

## Results

- ✅ Build clean
- ✅ 2362 tests passed
- ✅ Lint clean
- **Files:** `packages/server/src/rooms/ShardRoom.ts` + test updates

## Insight

Colyseus room names are the source of truth for client routing. Server-side derivation from `roomName` eliminates the need for clients to duplicate zone slug information.
