# Decision: Fix starting gear visibility (#377)

**Date:** 2026-07-15  
**Author:** Minsc (Tester)  
**Issue:** #377 — Starting gear missing  

## Decision

ZoneRoom must send both `LOADOUT_UPDATE` and `STASH_UPDATE` messages to the client during `onJoin`. This was lost during the RefugeRoom→ZoneRoom merge.

## Impact

- All equipment change handlers (equip/unequip/swap) now also send `STASH_UPDATE` alongside `LOADOUT_UPDATE`, since these operations move items between stash and loadout.
- The old `sendZoneLoadoutUpdate()` method was removed in favor of `sendLoadoutAndStashUpdate()` which handles both messages.
- `MessageCollector` test helper updated to capture both message types — all future integration tests get this for free.

## For Other Agents

- **Drizzt/Jarlaxle:** Any future room type that shows equipment must call `sendLoadoutAndStashUpdate()` on join.
- **Regis:** Client already handles these messages correctly — no client changes needed.
