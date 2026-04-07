# Session Log: 2026-03-25T12:16Z — ShardRoom sessionId → playerId Fix

**Team:** Jarlaxle (Systems Dev), Minsc (Tester)  
**Issue:** #197  
**PR:** #200  
**Status:** Complete — 1566 tests pass, PR staged

## Summary

Fixed critical player identity keying bug in ShardRoom. All player-facing state (players map, combat, stash, extraction, traces, awareness) now keys by persistent `playerId` from auth context instead of ephemeral `client.sessionId`. Followed established RefugeRoom pattern — both rooms now use identical identity resolution and lookup strategy.

## Scope

- **ShardRoom.onJoin():** Added `playerIds` map (`sessionId → playerId`), migrated all player state keys
- **Subsystems:** Combat registration, extraction keying, downing system, trace actor IDs, awareness checks, sound propagation, message delivery
- **Reverse lookup:** `findClient(playerId)` resolves via `playerIds` map
- **Tests:** 11 new test cases validating identity keying, reconnection, stash, combat, multi-player, auth

## Notes

- `options['playerId']` is client-supplied (not yet validated against auth context; Phase 2 hardening post-OAuth)
- Forward lookup: `playerIds.get(sessionId) → playerId`
- Reverse lookup: `findClient(playerId)` finds sessionId, then Client
