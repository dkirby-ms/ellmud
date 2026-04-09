# Decision: Speedwalk gate requires 2+ moves

**Author:** Drizzt
**Date:** 2025-07-22
**Issue:** #380

## Context
The `isSpeedwalk()` regex intentionally matches single direction letters (n/s/e/w/u/d) because they ARE valid speedwalk syntax. However, the UI was using this as the sole gate for entering speedwalk mode, which caused single-move commands to show "Speedwalk: 1 moves (n)".

## Decision
Added `shouldTreatAsSpeedwalk()` that requires the parsed result to contain 2+ moves. Single direction letters now go through the normal `sendCommand()` path. The `isSpeedwalk()` function remains unchanged (it's still correct as a syntax check).

## Impact
- **Regis (Frontend):** The `shouldTreatAsSpeedwalk()` export from `speedwalk.ts` is now the correct gate for speedwalk mode. Use it instead of `isSpeedwalk()` when deciding UI behavior.
- **Server:** No changes needed. Direction aliases already handle single letters.
