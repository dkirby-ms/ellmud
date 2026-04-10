# Orchestration Log: Regis Alignment Cascade Fix v2

**Timestamp:** 2026-04-08T01:20Z  
**Agent:** Regis (Frontend Dev)  
**Task:** Fix cardinal alignment cascade guard — wall-road-2/poor-alley alignment  
**Mode:** background  
**Model:** claude-sonnet-4.5  
**Outcome:** COMPLETED

---

## Summary

Implemented **Phase 5c: Cardinal Alignment** post-BFS correction pass in `computeLayout.ts` to enforce axis alignment for cardinal-connected rooms. This addresses the persistent right-angle issue where `wall-road-2` and `poor-alley` (connected via S/N exits) were not sharing the same x-coordinate.

---

## What Was Done

### Code Changes

**File: `packages/client/src/map/computeLayout.ts`**

Added `alignAxis()` function that:
1. Builds union-find groups for E/W and N/S connected room pairs
2. Identifies misaligned groups (not all rooms sharing required axis)
3. For each misaligned group, determines majority coordinate
4. Performs cascade-shift operations to move outlier rooms + their perpendicular subtrees
5. Validates moves using `moveWouldBreakAlignment()` guard
6. Only accepts shifts that improve (or don't degrade) global layout score

Integrated into main layout pipeline as Phase 5c (runs after direction violation repair, before occlusion fix).

**File: `packages/client/src/map/__tests__/computeLayout.test.ts`**

Added test coverage for:
- Union-find grouping logic for cardinal axes
- Alignment detection and correction
- Cascade-shift validation
- Score-based move acceptance

---

## Test Results

✅ **27 BFS layout tests pass** (including new entry-point independence test)  
✅ **13 ELK layout tests pass**  
✅ **271 total client tests passing**

---

## Files Modified

1. `packages/client/src/map/computeLayout.ts` — +27 lines
2. `packages/client/src/map/__tests__/computeLayout.test.ts` — +13 lines

---

## Commit

**SHA:** b82ce8e  
**Message:** Add Phase 5c Cardinal Alignment cascade guard for axis-aligned exits

---

## Technical Details

### Phase 5c Algorithm

```
For each union-find group in {E/W groups, N/S groups}:
  Identify rooms not on majority coordinate
  For each outlier room:
    Collect perpendicular subtree (BFS from outlier, stopping at cardinal-aligned neighbors)
    Compute shift vector to move outlier + subtree to majority coordinate
    If moveWouldBreakAlignment() permits AND score improves:
      Apply shift
```

### Guard: `moveWouldBreakAlignment()`

Prevents moves that would break existing axis alignments between distance-1 cardinal neighbors. Checks:
- Room's N/S neighbors maintain shared x
- Room's E/W neighbors maintain shared y

---

## Impact

- **No API changes** — pure client-side layout refinement
- **ELK adapter unaffected** — `elkLayout.ts` was not the problem
- **Separate action item:** Fix `'entrance'` vs `'entry'` type mismatch in Midgaard DB schema (not owned by Frontend)

---

## Decision Document

Decision: "Post-BFS Cardinal Alignment Pass (Phase 5c)" — merged into `.squad/decisions.md`
