# Skill: Zone Topology for 2D Grid Layout

> If a player walks east-east-north-west-west, they'd better end up one room north of where they started — or the map is lying.

## The Core Constraint

The client layout engine places rooms on a **strict 2D grid** where each cardinal exit moves exactly one cell:

| Direction | Grid offset |
|-----------|------------|
| north     | (0, −1)    |
| south     | (0, +1)    |
| east      | (+1, 0)    |
| west      | (−1, 0)    |
| up/down   | (0, 0) — vertical badge only, no spatial displacement |

The engine uses **BFS from the entry room** to assign grid positions. The first path to reach a room determines its position. Any subsequent path that implies a different position creates a **topological conflict** — the map cannot display this room correctly.

**This means:** If two different paths through the zone graph reach the same room but imply different (x, y) coordinates, the zone has a bug that no algorithm can fix. The zone data itself must be corrected.

---

## What Causes Topological Conflicts

### 1. Cross-Neighborhood Shortcuts

**The pattern:** Room A in Neighborhood X connects directly to Room B in Neighborhood Y, skipping all the rooms between them.

**Example:** `dock-street-5` (Dockward, 6 south of market) connects east to `narrow-alley-3` (Beggar's Span, 5 east and 1 south of market). The east exit implies they're adjacent, but their grid positions are 9 cells apart.

**The rule:** Never connect two rooms directly if the shortest alternative path between them is more than 3–4 rooms. If the shortcut saves more than 3 steps, add **intermediate rooms** to bridge the gap. Each intermediate room absorbs one grid cell of the distance.

### 2. Ring Topologies (Cycles with Mismatched Path Lengths)

**The pattern:** Room A and Room B are connected by two paths of different lengths through the zone graph. If `path_via_north` takes 5 east steps and `path_via_south` takes 3 east + 2 south steps, the grid positions implied by each path are different.

**Example:** The Drowned Veins sewer system forms a ring with two surface access points (undercity-gate and tide-gate). The western and eastern halves of the ring are reached via completely different surface routes, creating a 17-cell grid delta.

**The rule:** For any cycle in the zone graph, the **sum of direction offsets around the cycle must be zero**. That is:
- Count the east exits minus west exits around the cycle → must equal 0
- Count the south exits minus north exits around the cycle → must equal 0

If the sum is nonzero, the cycle is topologically impossible on a grid.

### 3. L-Shaped Loops (Non-Rectangular Small Cycles)

**The pattern:** A small loop of 4–6 rooms where the directions don't form a rectangle. For example, going E-N-W from room A reaches room B, but going S-E from room A also reaches room B. E+N+W = net north, but S+E = net south+east. These are different.

**The rule:** Every small loop must be **rectangular** — if you trace the directions around the loop, the net X displacement and net Y displacement must both be zero.

### 4. Vertical Shortcuts via Up/Down

**The pattern:** A room connects `down` to an underground network, which connects back `up` to a different surface room. Since up/down have zero grid displacement, the underground route "teleports" between surface positions.

**Example:** The gutter-drain connects the Beggar's Span alleys (surface) to the sewer network (underground), which connects to Guild Hall (Silver Arcade). These surface locations are far apart on the grid, but the vertical route implies they're at the same position.

**The rule:** Each up/down pair should connect to the **same vertical column** on the grid. If surface room A connects down to underground room U, and underground room U connects up to surface room B, then A and B should be at the same (x, y) grid position. If they're not, add intermediate underground rooms so the underground path's horizontal movement matches the surface distance.

---

## Design Guidelines

### Neighborhood Connections

1. **Adjacent neighborhoods** may connect directly if their border rooms are grid-adjacent (1 cell apart in the correct direction).
2. **Distant neighborhoods** must connect through **bridge rooms** — intermediate corridor rooms that absorb the grid distance. Budget 1 bridge room per 1–2 grid cells of distance.
3. **Maximum shortcut savings:** A shortcut should save at most 3 steps compared to the main route. Greater savings = more bridge rooms needed.

### Junction Density

- **Maximum 4 cardinal exits** per room (N/S/E/W). The grid only has 4 cardinal neighbors per cell.
- **4-way junctions** should be **rare** — at most 1 per 10–12 rooms. They create grid rectangles that constrain all surrounding rooms.
- **Prefer T-junctions** (3 exits) and corridors (2 exits) as the primary connective tissue.
- The Siltgate has 11 four-way junctions in 136 rooms (~1:12 ratio). This is at the upper edge of acceptable density.

### Vertical Design (Up/Down)

- Up/down exits have **zero grid displacement**. Use them freely for vertical movement.
- But ensure that any horizontal movement in the underground matches the surface topology. If a sewer runs east for 5 rooms and surfaces at the other end, the surface entry and exit points must be 5 cells apart in the east direction.
- **Sewer rings are inherently dangerous.** If an underground ring connects two surface points, the ring's horizontal path length must match the surface distance between those points. Otherwise, break the ring.

### Room Count Budgeting

- Bridge rooms add to the room count. Budget 5–10% of a zone's rooms as topological connective tissue.
- For a 136-room zone: ~7–14 rooms reserved for bridges and intermediate passages.
- These rooms don't need to be empty — they can have descriptions, creatures, and loot. They serve narrative *and* topological purposes.

---

## Cycle Validation Formula

For every cycle in the zone graph, verify:

```
Σ(east exits) − Σ(west exits) = 0
Σ(south exits) − Σ(north exits) = 0
```

Where the sum is taken around the full cycle following exit directions.

**Quick check:** For any two rooms A and B connected by an exit, find the shortest alternative path from A to B (not using the direct exit). Sum the direction offsets of the alternative path. The result should be the **inverse** of the direct exit's offset (e.g., if the direct exit is east, the alternative path's net offset should be (−1, 0), meaning one net step west).

If the alternative path's net offset is not the inverse, you have a topological conflict and the cycle cannot be rendered on a grid.

---

## Pre-Handoff Checklist

Before handing a zone design to Bruenor for implementation, verify:

- [ ] **Cycle audit:** For every cycle in the zone, confirm that direction offsets sum to zero around the loop. Pay special attention to cycles that cross neighborhood boundaries.
- [ ] **Cross-neighborhood connections:** Any exit between rooms in different neighborhoods has intermediate bridge rooms if the grid distance exceeds 1.
- [ ] **Up/down consistency:** Every underground path's horizontal displacement matches the corresponding surface distance.
- [ ] **No self-referencing exits:** No room has an exit pointing to itself.
- [ ] **Junction density:** No more than 1 four-way junction per 10–12 rooms. Prefer T-junctions.
- [ ] **Maximum room exits:** No room has more than 4 cardinal exits (plus optional up/down).
- [ ] **Shortcut savings:** No shortcut saves more than 3 steps vs. the main route without intermediate rooms.
- [ ] **Grid position simulation:** Run a BFS from the entry room, assign (x, y) positions using direction offsets, and verify no room has conflicting positions from different paths. (Use the `computeLayout` engine or a simple script.)

---

## Tools

### Quick BFS Grid Check (Python)

```python
from collections import defaultdict, deque

offsets = {
    'north': (0, -1), 'south': (0, 1),
    'east': (1, 0), 'west': (-1, 0),
}

def check_topology(rooms, entry):
    """Returns list of conflicting exits."""
    positions = {entry: (0, 0)}
    queue = deque([entry])
    while queue:
        current = queue.popleft()
        cx, cy = positions[current]
        for direction, target in rooms[current]:
            if direction in offsets:
                dx, dy = offsets[direction]
                expected = (cx + dx, cy + dy)
                if target in positions and positions[target] != expected:
                    yield (current, direction, target, expected, positions[target])
                elif target not in positions:
                    positions[target] = expected
                    queue.append(target)
```

### Layout Engine

The client's `computeLayout.ts` (at `packages/client/src/map/computeLayout.ts`) implements the full BFS layout with grid-aware cluster detection, collision resolution, and spiral placement. Run the zone data through the test suite at `packages/client/src/map/__tests__/computeLayout.test.ts` to validate.

---

## References

- Siltgate topology analysis: `.squad/decisions/inbox/laeral-siltgate-topology-fixes.md`
- Layout engine: `packages/client/src/map/computeLayout.ts`
- Layout tests: `packages/client/src/map/__tests__/computeLayout.test.ts`
- Siltgate zone data: `packages/server/src/db/migrations/004_seed_siltgate.sql`
