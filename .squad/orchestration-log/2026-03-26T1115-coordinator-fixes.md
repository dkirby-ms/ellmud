# 2026-03-26T11:15Z: Coordinator Fixes Summary

**Scribe:** Documenting coordinator-direct fixes from earlier in session

---

## Fixes Applied

### 1. RefugeRoom.ts — STASH_UPDATE on join
**When:** Earlier in session  
**What:** RefugeRoom didn't send loadout/stash state when player joined  
**Fix:** Added sendLoadoutAndStashUpdate() call to join handler  
**File:** packages/server/src/rooms/RefugeRoom.ts  
**Impact:** Players now see correct inventory state immediately on enter

### 2. stash-provider.ts — Add loadItemDefsFromDb()
**When:** Earlier in session  
**What:** In-memory itemDefs cache wasn't hydrated from DB at server boot  
**Fix:** Created loadItemDefsFromDb() function to fetch item definitions from database and populate cache  
**File:** packages/server/src/stash/stash-provider.ts  
**Impact:** Item definitions persist across restarts; no manual cache update needed

### 3. index.ts — Export and call loadItemDefsFromDb
**When:** Earlier in session  
**What:** Cache hydration function not called at startup  
**Fix:** Exported loadItemDefsFromDb and added call in server initialization  
**File:** packages/server/src/index.ts  
**Impact:** Automatic cache population on server boot

### 4. Migration 012 — run_history.run_id column type
**When:** Earlier in session  
**What:** run_history.run_id was uuid but Colyseus room IDs are text  
**Fix:** Migration 012 changed column from uuid to text  
**File:** packages/server/src/migrations/012_fix_run_history_id_type.ts  
**Impact:** run_history queries match room IDs correctly

---

## Pattern Established

**Principle:** Database is source of truth. In-memory caches hydrate automatically from DB.

This pattern eliminates manual wiring for each feature. New items/definitions added to DB are automatically available in caches at boot.

Jarlaxle now applying this pattern to loadout persistence on player death.
