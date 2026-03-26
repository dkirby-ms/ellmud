# Decision Needed: Loadout Needs DB Persistence

**Filed by:** Jarlaxle (Systems Dev)
**Date:** 2025-07-26
**Priority:** High — data-loss risk on server restart

## Problem

`InMemoryLoadoutRepository` stores equipped gear in RAM only. When a player equips an item:

1. Item is **removed from stash** (PostgreSQL — `PgStashRepository.removeItem`)
2. Item is **placed in loadout** (RAM — `InMemoryLoadoutRepository.setSlot`)

If the server restarts between these states, the item is gone from the DB stash but also gone from memory. **The item vanishes permanently.**

## Impact

- Any equipped item is at risk of silent loss on every deploy, crash, or restart
- Players lose gear with no explanation and no recovery path
- The more valuable the loadout, the worse the impact

## Proposed Fix

1. Create `PgLoadoutRepository` implementing the existing `LoadoutRepository` interface
2. Add a DB migration: `player_loadouts` table (player_id, slot, item_instance JSONB)
3. Wire it into `initLoadout()` in ShardRoom + RefugeRoom via `getLoadoutRepository()`
4. The interface (`load`, `save`, `setSlot`, `getSlot`, `clear`, `listPlayerIds`) is already clean — just needs a Pg backing

## Related Context

- `LoadoutRepository` interface: `packages/server/src/loadout/LoadoutRepository.ts`
- `LoadoutService` constructor already accepts an explicit `LoadoutRepository` (3-arg form)
- Stash already has `PgStashRepository` as a pattern to follow
- Death handler now correctly calls `clearLoadout()` (fixed alongside this filing)
