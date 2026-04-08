# Edge-Crossing Test Analysis — Quick Reference

**Date:** 2026-01-08  
**Analyst:** Minsc  
**Status:** ✓ Analysis complete, test plan documented, awaiting Regis implementation

## Current Baseline

**Test Suite:** 28/28 passing  
**Runtime:** ~1.3s total, Siltgate 247ms

### Critical Tests

| # | Test Name | Rooms | Key Metric | Status |
|---|-----------|-------|------------|--------|
| 21 | Siltgate city zone | 138 | **0 diagonals** (MUST preserve) | ✓ PASS |
| 26 | Midgaard E-W alignment | 52 | 9-room main-street aligned | ✓ PASS |
| 28 | Crossing elimination | 7 | 0 crossings | ✓ PASS |

## Problem Identified

**Current approach (Phase 5d):** Move rooms to nearby free cells  
**Issue:** Dense zones have no free cells → crossings persist  
**Regis implementing:** Selective row/column insertion (surgical fix)

## Test Plan Ready

**6 new test cases designed:**
1. ✓ Minimal 2x2 crossing reproduction
2. ✓ T-intersection pattern
3. ✓ L-shaped zone (negative test)
4. ✓ Dense 4x4 grid (multiple crossings)
5. ✓ Cascading fix scenario
6. ✓ Row vs column insertion choice

**Full spec:** `.squad/decisions/inbox/minsc-crossing-test-plan.md`

## Next Actions

1. **Wait:** Regis finishes implementation
2. **Verify:** Re-run 28 baseline tests → all must pass
3. **Guard:** Siltgate diagonal count must remain 0
4. **Implement:** Add 6 new test cases from plan
5. **Profile:** Performance check on large zones

## Key Files

- Test suite: `packages/client/src/map/__tests__/computeLayout.test.ts`
- Implementation: `packages/client/src/map/computeLayout.ts` (Phase 5d, line 2489)
- Test plan: `.squad/decisions/inbox/minsc-crossing-test-plan.md`
