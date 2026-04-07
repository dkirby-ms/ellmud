# 2026-03-26T11:15Z: Jarlaxle Spawn

**Agent:** Jarlaxle (Systems Dev)

**Task:** Fix handlePlayerDeath to clear loadout on death + identify DB persistence gap

**Reason:** User reported equipped gear survives death, only disappears on server restart. Critical inventory system bug.

**Files:** ShardRoom.ts, LoadoutRepository.ts, LoadoutService.ts

**Spawn mode:** background

**Status:** spawned

---

## Context Log

Earlier coordinator fixes this session:
- RefugeRoom.ts: Added sendLoadoutAndStashUpdate call on join
- stash-provider.ts: Added loadItemDefsFromDb() to hydrate in-memory itemDefs at server boot
- index.ts: Exported and called loadItemDefsFromDb at startup
- Migration 012: Changed run_history.run_id from uuid to text (matches Colyseus room IDs)
- User directive: DB is source of truth; caches hydrate automatically

This fix extends the persistence consistency pattern.
