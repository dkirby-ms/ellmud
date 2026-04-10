# Item Room Appearance Feature

**Date:** 2026-04-10T01:12:00Z  
**Agent:** Drizzt (Engine Dev)  
**Issue:** #386

## Summary
Items in rooms now render as individual descriptive lines instead of a single aggregated "You see: ..." line. Each item gets its own atmospheric line via an optional `roomDescription` field on the Item interface. Fallback: "A <name> lies here." when unset. Mirrors creature room appearance pattern from #383.

## Files Changed
- `packages/server/src/commands/handlers/look.ts` — 3 lines changed
- `packages/server/src/commands/handlers/go.ts` — 6 lines changed
- `packages/server/src/commands/handlers/goto.ts` — 6 lines changed
- `packages/server/src/generator/RoomGraph.ts` — 2 lines added (roomDescription on Item)
- `packages/server/src/__tests__/item-appearance.test.ts` — 201 lines (new test file, 11 tests)

## Outcome
✅ All 2,612 server tests pass.  
**Commit:** 1bbf209 — `feat: per-item room descriptions with ANSI tag support (#386)`

## Decisions
None.

---
*Session: item-room-appearance*
