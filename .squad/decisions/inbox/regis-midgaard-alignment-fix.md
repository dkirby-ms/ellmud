# Decision: Fix room displacement in Midgaard zone layout

**Author:** Regis (Frontend Developer)
**Date:** 2025-01
**Status:** Proposed

## Context

In the Midgaard zone, `inside-the-west-gate-of-midgaard` and `main-street` are connected by an east/west exit but were rendered at different y-coordinates (dy=4). BFS placed them correctly, but force-directed relaxation and subsequent refinement phases broke the alignment.

## Decision

Introduced two complementary mechanisms:

1. **`relaxationScore()`** — a proportional diagonal penalty used only during relaxation (Phase 4 + post-cascade cleanup). Scales diagonal penalty by perpendicular displacement (`DIAGONAL_PENALTY * max(offAxis, 1)`) to prevent the optimizer from accepting large off-axis displacements.

2. **`moveWouldBreakAlignment()`** — a guard function that rejects moves breaking axis alignment between adjacent cardinal neighbours. Applied to relaxation, diagonal cascade, and direction-violation repair phases.

## Alternatives Considered

- **Global proportional penalty:** Fixed Midgaard but introduced 2 diagonals in Siltgate. The scoring change disrupted later phases that need the flat penalty.
- **Inverse-distance weighting in idealPosition():** Changed the search center but didn't prevent relaxation from finding globally-better moves nearby. Also regressed Siltgate.
- **Stronger alignment guard (all distances):** Too restrictive — blocked beneficial moves in other phases.

## Consequences

- All 26 tests pass (25 original + 1 new Midgaard regression test)
- Midgaard main-street corridor renders correctly aligned
- Minimal impact on other zones — the guard only fires for distance-1 axis-aligned pairs
