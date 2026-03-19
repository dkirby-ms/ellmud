# Decision: Stash uses weight-based capacity, not slot-based

**By:** Drizzt (Issue #11)
**Date:** 2026-03-19
**Status:** Implemented

## What
The player stash enforces a weight-based capacity (default 200 weight units), not a fixed number of item slots. This means lighter items stack more efficiently, and heavy items consume proportionally more space.

## Why
- GDD §7.3 specifies weight-limited stash with expandable capacity via upgrades
- Weight-based is more interesting gameplay-wise: players must choose between many light materials vs fewer heavy weapons
- Capacity upgrades (`setCapacity()`) are already implemented and ready for faction/progression unlocks
- The alternative (fixed slots) would require arbitrary slot limits per item type

## Impact
- StashService.storeItem() checks `currentWeight + addedWeight > capacity`
- Default capacity is 200 weight units (generous for Phase 1, tunable later)
- When Jarlaxle's item system merges (#16), item weights must be reasonable (0.1–10.0 range typical)
