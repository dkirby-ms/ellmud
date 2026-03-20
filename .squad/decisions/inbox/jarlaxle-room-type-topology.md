### Room Type Topology Enforcement
**By:** Jarlaxle (Systems Dev)
**Date:** 2025-07-25
**Issue:** #5 (reopened)
**PR:** #81

**What**
Room types now enforce their topological semantics:
- `dead_end` rooms always have exactly 1 exit (branch off backbone)
- `junction` rooms always have ≥ 3 exits (true branching points)
- At least 1 dead_end guaranteed per graph

**Why**
Previously, types were assigned randomly but connectivity didn't match. Dead_ends could have 4 exits; junctions could have 1. This made room types purely cosmetic labels with no gameplay meaning. Now movement commands, creature AI patrol logic, and future minimap rendering can rely on type semantics.

**Impact**
- `room.type === 'dead_end'` → guaranteed exactly 1 exit. Safe to use for "cornered" detection in creature AI.
- `room.type === 'junction'` → guaranteed ≥ 3 exits. Can be used for "crossroads" gameplay events.
- Graph is deterministic from seed — same topology guarantees apply across replays.
- Drizzt: movement handlers can trust exit counts match room types.
- Minsc: client minimap can use type for rendering hints (dead_end = alcove icon, junction = intersection).
