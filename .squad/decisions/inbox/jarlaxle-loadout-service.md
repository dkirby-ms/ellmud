# LoadoutService Architecture Decision

**By:** Jarlaxle (Systems Dev)
**Date:** 2025-07-25
**Context:** Server-authoritative equipment system for loadout management

## What

LoadoutService uses a **per-player mutex lock** to prevent race conditions during equip/unequip/swap operations. All item moves are atomic: remove-from-source + add-to-destination in a single locked operation.

## Key Decisions

1. **Two-form constructor**: `LoadoutService(stashRepo, itemDefs)` for tests (internal in-memory loadout), `LoadoutService(loadoutRepo, stashRepo, itemDefs)` for rooms with explicit repos.

2. **Slot restrictions use shared `SLOT_ACCEPTS`**: No item sub-type enforcement (e.g., helmet vs chestpiece — both are "armour" and fit any armour slot). Sub-type enforcement deferred to Phase 2 if needed.

3. **Shard equipping via separate methods**: `equipFromInventory()` and `unequipToInventory()` for in-shard operations. Displaced items are NOT added to stash — they go back to shard inventory (caller responsibility).

4. **Shard entry validation**: Requires at least one "key" type item in stash. Weapons are optional. No durability checks (Phase 3).

5. **Empty slot unequip is a no-op success** (`ok: true`), not an error.

## Impact

- Rooms must register EQUIP_ITEM, UNEQUIP_ITEM, SWAP_ITEM message handlers
- Client receives LOADOUT_UPDATE after every server-confirmed operation — no optimistic client state
- ShardRoom blocks equipment changes during extraction
