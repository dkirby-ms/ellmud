# Decision: Item Equipment System (#390)

**Author:** Drizzt  
**Date:** 2026-04-10  
**Status:** Implemented  

## Summary

Implemented `get`/`equip`/`unequip` commands for player item interaction. The `get` verb is an alias for the existing `take` command. Equipment uses a simple two-slot model (weapon/armour) with an optional `equipSlot` field on the `Item` interface.

## Key Decisions

1. **`equipSlot` on Item interface:** Items declare equippability via `equipSlot?: 'weapon' | 'armour'`. This is separate from the stash/loadout system (which uses `DisplayItem` and `EquipmentSlotType`). The in-game equip operates on room-pickup items, not stash items.

2. **Auto-swap on equip:** Equipping an item to an occupied slot automatically swaps the old item back to inventory. No confirmation prompt needed.

3. **`_roomEvent` broadcast pattern:** Item interactions (take/drop/equip/unequip) broadcast to other players in the room using a `_roomEvent` string on CommandResult. This follows the same pattern as `_postureChange` from #371.

4. **Equipment backing store:** `PlayerState.equippedItems` (private Map) stores actual `Item` objects behind the `VisibleEquipment` display strings. This enables proper swap-back during equip/unequip.

## Who This Affects

- **Jarlaxle:** Room generation may want to set `equipSlot` on generated items (weapons/armour).
- **Minsc:** Anticipatory tests in `item-interaction.test.ts` have been replaced with real assertions.
- **Regis:** Inventory display now shows an "Equipped" section if items are equipped.
