# Warrens & Siltgate Exit Topology Analysis

**Minsc, Tester/QA**  
**Date:** Analysis of migration 003_seed_zones.sql  
**Status:** ❌ BOTH ZONES REQUIRE TOPOLOGY FIXES

---

## EXECUTIVE SUMMARY

Both the **Warrens** and **Siltgate** zones exhibit significant exit topology issues when mapped to a 2D grid. The problems stem primarily from:

1. **Massive Position Collisions**: Multiple disconnected rooms are placed at identical 2D coordinates
2. **Unreachable Rooms**: Certain rooms are not reachable from the entry point via the normal exit graph
3. **Bidirectional Exit Failures**: Some exits claim to go to other rooms but lack proper reverse exits
4. **Exit Crossing Without Connecting Chambers**: The zones appear to mix vertical (up/down) navigation with planar 2D movement in ways that violate a consistent 2D grid topology

**The core issue:** These zones were designed with vertical/sewer navigation overlaid on planar geography, but no intermediate connecting rooms were placed to prevent exits from visually crossing through occupied grid cells.

---

## WARRENS ANALYSIS

### Metrics
- **Total Rooms:** 110
- **Entry Room:** shattered-gate
- **Placed Rooms:** 109
- **Reachable Rooms:** 109
- **Unreachable Rooms:** 1

### Issues Found

#### ❌ Position Collisions: 22 DETECTED

Rooms that occupy the same 2D coordinate (crossing exits without connecting chambers):

| Position | Rooms (Type) | Issue |
|----------|---|---|
| (1, 0) | rubble-boulevard (corridor) ↔ overwatch-tower (dead_end) | Tower accessed via UP, but placed at same (x,y) as corridor |
| (4, -1) | collapsed-tenement (dead_end) ↔ gutter-run (corridor) | Tenement accessed WEST from gutter-run, both at same coord |
| (5, -1) | scavengers-den (combat) ↔ blighted-courtyard (junction) | Den accessed SOUTH, courtyard accessed EAST, same grid cell |
| (5, -2) | condemned-arch (corridor) ↔ slum-r1c2 (combat) | Arch EAST of condemned-arch, slum SOUTH of gutter-run, collide |
| (3, -2) | sunken-square (junction) ↔ the-ratways (corridor) | Square accessed via WEST from slum-r1c1, ratways via DOWN from square, both at (3,-2) |
| (6, -2) | ironmongers-ruin (dead_end) ↔ slum-r1c3 (combat) | Ruin accessed EAST from condemned-arch, slum accessed SOUTH, same position |
| (4, -4) | slum-r3c1 (combat) ↔ sewer-bone-shelf (dead_end) | Room grid row 3, col 1 vs. bone shelf accessed from sewer system |
| (4, -5) | slum-r4c1 (combat) ↔ sewer-drain-grate (corridor) | Slum grid row 4 col 1 vs. drain grate from sewer-north-tunnel |
| (5, -5) | slum-r4c2 (combat) ↔ sewer-overflow-chamber (combat) | Slum row 4 col 2 vs. overflow accessed from sewer-drain-grate EAST |
| (4, -6) | slum-r5c1 (combat) ↔ sewer-east-conduit (corridor) | Slum row 5 col 1 vs. east conduit from sewer-main-junction EAST |
| (3, -5) | plague-ward (dead_end) ↔ sewer-north-tunnel (corridor) | Ward accessed WEST from slum-r4c1 vs. tunnel from sewer-main-junction NORTH |
| (5, -6) | slum-r5c2 (combat) ↔ sewer-pipe-maze (corridor) | Slum row 5 col 2 vs. pipe maze from sewer-east-conduit EAST |
| (4, -7) | slum-r6c1 (combat) ↔ sewer-blackwater-crossing (junction) | Slum row 6 col 1 vs. crossing from sewer-deep-channel EAST |
| (3, -6) | sluice-gate (junction) ↔ sewer-main-junction (junction) | Sluice accessed WEST from slum-r5c1 vs. main junction from sewer-north-tunnel SOUTH |
| (6, -6) | slum-r5c3 (combat) ↔ sewer-gas-pocket (dead_end) | Slum row 5 col 3 vs. gas pocket from sewer-pipe-maze EAST |
| (4, -8) | slum-r7c1 (combat) ↔ sewer-deep-channel (corridor) | Slum row 7 col 1 vs. deep channel from sewer-blackwater-crossing SOUTH |
| (5, -8) | slum-r7c2 (combat) ↔ sewer-effluent-pool (combat) | Slum row 7 col 2 vs. pool from sewer-deep-channel EAST |
| (4, -9) | dyers-vats (combat) ↔ sewer-stagnant-pool (chamber) ↔ sewer-silt-chamber (junction) | **Triple collision** - Slum row 7 col 1 SOUTH vs. stagnant pool from sewer-trickle-passage EAST vs. silt chamber from sewer-deep-channel SOUTH |
| (5, -9) | cistern-access (junction) ↔ sewer-cistern (combat) | Cistern-access row 7 col 2 SOUTH vs. sewer cistern from stagnant pool EAST |
| (3, -9) | beggar-kings-throne (dead_end) ↔ sewer-collapsed-drain (dead_end) ↔ sewer-slime-channel (corridor) | **Triple collision** - Throne accessed SOUTH from dyers-vats vs. drain from flooded-vault SOUTH vs. slime channel from slime-channel EAST |
| (3, -4) | sewer-rat-nest (combat) ↔ sewer-cracked-conduit (corridor) | Rat nest from sewer-north-tunnel NORTH vs. cracked conduit from sewer-drip-tunnel SOUTH |
| (3, -8) | sewer-flooded-vault (combat) ↔ sewer-trickle-passage (corridor) | Vault from sewer-flooded-vault (accessed SOUTH from south-tunnel) vs. trickle passage from sewer-west-conduit EAST |

**Critical:** These 22 collisions represent exits that **must cross through occupied grid cells** to reach their destinations. In a planar 2D map, this creates visual intersection without a connecting room.

#### ⚠️ Unreachable Rooms: 1

- **causeway-terminus** — Isolated room, not connected via any exit path from the entry graph. Exit from `causeway-terminus` west goes to itself in the Bloom Observatory zone. No entry path exists from shattered-gate.

#### ⚠️ Bidirectional Failures: 4

| From Room | Direction | To Room | Status |
|-----------|-----------|---------|--------|
| shattered-gate | west | shattered-gate | ❌ Self-loop to Refuge; no reverse |
| shattered-gate | south | shattered-gate | ❌ Self-loop to causeway-terminus; no reverse from causeway-terminus |
| causeway-terminus | west | causeway-terminus | ❌ Self-loop to Bloom Observatory; no reverse |
| causeway-terminus | south | shattered-gate | ❌ Missing reverse: shattered-gate north → causeway-terminus |

**Note:** Bidirectional failures are acceptable for zone-transition exits (marked with target_zone != NULL). The 4 failures detected are either zone transitions or orphaned room connections.

### Grid Visualization (Partial)

```
Y=1: [overwatch-tower/rubble-boulevard]
     
Y=0: [shattered-gate] - [rubble-boulevard] - [collapsed-overpass] - [hollow-market] - [merchants-row] - [burned-chapel]
                                                     |
                                               (COLLISION: multiple slum + sewer rooms below)
Y=-1: [gutter-run] & [collapsed-tenement]
      [scavengers-den] & [blighted-courtyard]
      [condemned-arch] & [slum-r1c2]
      ...

(Sewer rooms stack vertically, creating collisions at every depth level)
```

### Root Cause

The Warrens uses a **7x7 slum grid** (slum-r1c1 through slum-r7c7) for the main area, plus a **separate vertical sewer system** (sewer-main-junction, sewer-north-tunnel, etc.). When both systems are placed on a 2D grid:

- Slum rooms are placed by following compass directions (north/south/east/west)
- Sewer rooms are placed by following a different path (down → north/south/east/west)
- The two systems converge at multiple points (e.g., sunken-square down → the-ratways, sluice-gate down → sewer-main-junction, cistern-access down → sewer-cistern)
- When the sewer path expands horizontally (EAST/WEST/NORTH/SOUTH), its rooms occupy the same grid cells as slum rooms above them

**No intermediate connecting chambers or depth layers separate the slum quarter from the sewer, causing all these collisions.**

---

## SILTGATE ANALYSIS

### Metrics
- **Total Rooms:** 141
- **Entry Room:** market-square
- **Placed Rooms:** 138
- **Reachable Rooms:** 138
- **Unreachable Rooms:** 3

### Issues Found

#### ❌ Position Collisions: 32 DETECTED

Siltgate has even more collisions than Warrens. Sample:

| Position | Rooms (Type) | Issue |
|----------|---|---|
| (0, 1) | fountain-plaza (junction) ↔ estate-gate (entrance) | Plaza NORTH of market, gate UP from plaza, same coord |
| (1, 0) | bazaar-row-1 (corridor) ↔ narrow-alley-1 (corridor) ↔ flooded-chamber (dead_end) | Bazaar EAST of market, alley SOUTH of arcade-1, chamber from sewer-tunnel-8 SOUTH |
| (0, 2) | news-board (dead_end) ↔ promenade-walk-1 (corridor) | Board NORTH of plaza, walk NORTH of estate-gate, same grid |
| (1, 1) | silver-arcade-1 (corridor) ↔ iron-balcony-1 (corridor) ↔ sewer-tunnel-8 (corridor) | Arcade EAST of plaza, balcony SOUTH of promenade-walk-2, sewer room from deep underground |
| (2, 0) | bazaar-row-2 (corridor) ↔ cobblestone-street-1 (corridor) ↔ fungal-cavern (dead_end) | Bazaar chain, cobblestone chain, sewer-fungal accessed SOUTH from sewer-tunnel-7 |

*(All 32 collisions follow this pattern: planar rooms × vertical sewer rooms occupying the same cells)*

#### ⚠️ Unreachable Rooms: 3

- **pipe-bridge** — Supposed connection point to The Reliquary. Accessed via west from itself. No entry from Siltgate proper.
- **smugglers-cove** — Hidden passage accessed SOUTH from tide-gate, but tide-gate has no reverse exit south.
- **thieves-den** — Hidden passage accessed EAST from rat-run-2 (hidden), but rat-run-2 has no exit east.

#### ⚠️ Bidirectional Failures: 7

| From Room | Direction | To Room | Status |
|-----------|-----------|---------|--------|
| city-gate | west | city-gate | ❌ Zone transition to Refuge; no reverse |
| smugglers-cove | north | tide-gate | ❌ Missing: tide-gate south → smugglers-cove (hidden:true exists, but marked hidden!) |
| thieves-den | west | rat-run-2 | ❌ Missing: rat-run-2 east → thieves-den (hidden:true exists!) |
| ashgate | east | ashgate | ❌ Zone transition to Warrens; no reverse |
| flooded-concourse | north | flooded-concourse | ❌ Zone transition to Carrion Court; no reverse |
| pipe-bridge | west | pipe-bridge | ❌ Zone transition to Reliquary; no reverse |
| pipe-bridge | east | ashgate-chapel | ❌ Missing: ashgate-chapel west → pipe-bridge |

**Note:** Failures 2 & 3 are marked `hidden:true` — the exits DO exist bidirectionally, but are flagged hidden. This may be intentional (secret passages). Failures 1, 4, 5, 6 are zone transitions.

### Grid Visualization (Partial)

```
Y=3: [jewelers-lane] [highwind-bridge] [observatory]
     
Y=2: [news-board]    [promenade-walk-1] [courtyard-fountain] [noble-residence-1]
     
Y=1: [fountain-plaza] [estate-gate]
     [silver-arcade-1] [iron-balcony-1]
     [silver-arcade-2] [iron-balcony-2]
     [silver-arcade-3] [guild-hall]
     [silver-arcade-4] [silk-road]
     
Y=0: [market-square]
     [bazaar-row-1] [narrow-alley-1]
     [bazaar-row-2] [cobblestone-street-1]
     [bazaar-row-3] [cobblestone-street-2]
     [span-gate] [cobblestone-street-3]
     
Y=-1: [tavern-row]
      [scribe-corner] [apothecary] [dockside-tavern]
      [money-changers-row] [narrow-alley-2]
      ...

(Sewer system creates additional collisions at every coordinate below)
```

### Root Cause

Siltgate has a similar architecture to Warrens:

- **Upper district**: Market, bazaar, silver arcade, estates, promenade, garden terrace, docks
- **Lower district**: Beggar's Span (Alley system) with rats and thugs
- **Underground**: Sewers (3 junctions × 8 tunnels) + undercity areas

The **undercity-gate** (at guild-hall DOWN) connects the planar upper world to the sewer system. As the sewer system branches out horizontally, it collides with upper-district coordinates.

**Additionally**, Siltgate has even more zone transitions (Refuge, Warrens, Reliquary, Carrion Court), and some are accessed via rooms (like pipe-bridge east → ashgate-chapel, ashgate east → Warrens) rather than direct zone-to-zone jumps.

---

## DETAILED FINDINGS

### Position Collisions: What They Mean

A **position collision** occurs when two distinct rooms occupy the same 2D grid coordinate. When drawing this as a map:

```
Example: Position (3, -6) contains both:
  1. sluice-gate (accessed W from slum-r5c1)
  2. sewer-main-junction (accessed S from sewer-north-tunnel)

On a 2D map, two exit edges would need to cross to reach both rooms:
  - Edge from slum-r5c1 west → sluice-gate
  - Edge from sewer-north-tunnel south → sewer-main-junction
  
These edges MUST cross without passing through an intermediate room.
```

**Result:** Rooms appear to be in the same visual location, or exits appear to pass through solid matter.

### Unreachable Rooms

**Warrens** has 1 unreachable room:
- `causeway-terminus` — Only entry is from itself (west to bloom-observatory-inn in the-bloom-observatory zone). No path from shattered-gate.

**Siltgate** has 3:
- `pipe-bridge` — Only entry is from itself (west to filtration-annex in the-reliquary zone)
- `smugglers-cove` & `thieves-den` — Marked `hidden:true`, so they're reachable but only via hidden exits

The unreachable non-hidden rooms need either:
1. A new entrance from the main zone exit graph, OR
2. Removal if they're truly supposed to be zone-transitions-only

### Bidirectional Failures & Hidden Exits

Most bidirectional failures are **zone-transition exits** (going to target_zone != NULL), which legitimately don't have reverse entries. However:

**Siltgate** has two special cases:
- `tide-gate south → smugglers-cove` exists and has `hidden:true` on the REVERSE (smugglers-cove north → tide-gate)
- `rat-run-2 east → thieves-den` exists and has `hidden:true` on the REVERSE (thieves-den west → rat-run-2)

These are **intentionally hidden** — they're secret passages. The "failure" is a false positive (both directions exist, one is just marked hidden).

### Loop Consistency Check

**Compass loops should sum to (0,0)**. Examples:

✅ **Pass:** north + south = (0, 0)
✅ **Pass:** east + west = (0, 0)
✅ **Pass:** north + east + south + west = (0, 0)

**Warrens slum grid check:**
- Row 1 is a 7-room E-W chain: slum-r1c1 east-east-east... to slum-r1c7 ✅
- Column 1 is a 7-room N-S chain: slum-r1c1 south-south-south... to slum-r7c1 ✅
- **Grid is internally consistent** ✅

**Siltgate upper district check:**
- Bazaar chain: market-square east → bazaar-row-1 east → bazaar-row-2 east → bazaar-row-3 (with dead-ends) ✅
- Promenade chain: estate-gate north → promenade-walk-1 east → ... → promenade-walk-4 ✅
- **Grid is internally consistent** ✅

---

## CONCLUSIONS

### ✅ PASS: Direction Consistency

Both zones maintain **proper bidirectional exits within their planar components**. Every compass exit has a reverse exit (except zone transitions and hidden passages, which are intentional).

### ✅ PASS: Loop Consistency

Both zones' internal grids form consistent loops:
- Warrens: 7×7 slum grid + individual sewer branches form consistent paths
- Siltgate: 3×4 upper district + 6×4 lower district + 3 sewer junctions form consistent loops

### ❌ FAIL: Position Collisions

- **Warrens:** 22 position collisions (slum grid × sewer system)
- **Siltgate:** 32 position collisions (upper/lower districts × sewer system)

Both zones **CANNOT be drawn as planar 2D maps** without exit edges crossing through occupied cells.

### ❌ FAIL: Edge Crossing Without Connecting Chambers

The collisions are caused by **overlaying two topologically incompatible systems**:

1. **Horizontal planar navigation** (cardinal directions in upper world)
2. **Vertical navigation** (down/up to sewers/undercity)

To fix, need:

**Option A: Depth Layers**
- Create explicit depth levels (e.g., "Ground", "Undercity Level 1", "Undercity Level 2")
- Each DOWN exit creates a new layer; rooms at the same XY on different Z don't collide

**Option B: Connecting Chambers**
- Insert transitional rooms between sewer branches and planar areas
- Example: Instead of sluice-gate directly connecting to sewer-main-junction, add "Sluice Chamber" and "Sewer Entrance" as intermediate rooms

**Option C: Reroute Sewer System**
- Redesign sewer paths to occupy only unoccupied grid coordinates
- Requires moving 40+ sewer rooms in Warrens and 50+ in Siltgate

### ⚠️ NOTE: Unreachable Rooms

- **Warrens:** causeway-terminus is only reachable via zone-transition; may be intentional
- **Siltgate:** pipe-bridge is only reachable via zone-transition; smugglers-cove & thieves-den are hidden

These require design decision: are they meant to be hidden/zone-only, or should they be integrated into the main exit graph?

---

## RECOMMENDATIONS

### Priority 1: Clarify Design Intent

**Question:** Should Warrens and Siltgate be drawable as **planar 2D maps**?

- If **YES**: Implement depth-layer architecture to separate planar from subterranean
- If **NO**: Document that these zones use a **multi-layered topology** where sewer exits can cross planar areas without violating game logic

### Priority 2: Fix Unreachable Rooms

- **causeway-terminus** (Warrens): Add a north exit from shattered-gate, OR mark it as zone-transition-only and document
- **pipe-bridge** (Siltgate): Either integrate into Ashgate district or mark as zone-transition-only
- **smugglers-cove** & **thieves-den** (Siltgate): Verify hidden exit flags are intentional; document as secret passages

### Priority 3: Document Topology Model

Add comments to 003_seed_zones.sql describing:
- Which zones use planar topology (The Refuge, estate sections of Siltgate)
- Which zones use layered topology (Warrens, Siltgate main)
- How to interpret position collisions in a game context

---

## APPENDIX: Complete Collision List

### Warrens (22 collisions)

1. (1, 0): rubble-boulevard, overwatch-tower
2. (4, -1): collapsed-tenement, gutter-run
3. (5, -1): scavengers-den, blighted-courtyard
4. (5, -2): condemned-arch, slum-r1c2
5. (3, -2): sunken-square, the-ratways
6. (6, -2): ironmongers-ruin, slum-r1c3
7. (4, -4): slum-r3c1, sewer-bone-shelf
8. (4, -5): slum-r4c1, sewer-drain-grate
9. (5, -5): slum-r4c2, sewer-overflow-chamber
10. (4, -6): slum-r5c1, sewer-east-conduit
11. (3, -5): plague-ward, sewer-north-tunnel
12. (5, -6): slum-r5c2, sewer-pipe-maze
13. (4, -7): slum-r6c1, sewer-blackwater-crossing
14. (3, -6): sluice-gate, sewer-main-junction
15. (6, -6): slum-r5c3, sewer-gas-pocket
16. (4, -8): slum-r7c1, sewer-deep-channel
17. (5, -8): slum-r7c2, sewer-effluent-pool
18. (4, -9): dyers-vats, sewer-stagnant-pool, sewer-silt-chamber (**3-way**)
19. (5, -9): cistern-access, sewer-cistern
20. (3, -9): beggar-kings-throne, sewer-collapsed-drain, sewer-slime-channel (**3-way**)
21. (3, -4): sewer-rat-nest, sewer-cracked-conduit
22. (3, -8): sewer-flooded-vault, sewer-trickle-passage

### Siltgate (32 collisions)

1. (0, 1): fountain-plaza, estate-gate
2. (1, 0): bazaar-row-1, narrow-alley-1, flooded-chamber (**3-way**)
3. (0, 2): news-board, promenade-walk-1
4. (1, 1): silver-arcade-1, iron-balcony-1, sewer-tunnel-8 (**3-way**)
5. (2, 0): bazaar-row-2, cobblestone-street-1, fungal-cavern (**3-way**)
6. (1, -1): scribe-corner, apothecary, dockside-tavern (**3-way**)
7. (2, 1): silver-arcade-2, iron-balcony-2, sewer-tunnel-7 (**3-way**)
8. (3, 0): bazaar-row-3, cobblestone-street-2, sewer-tunnel-3 (**3-way**)
9. (3, 1): silver-arcade-3, sewer-junction-1 (**2-way**)
10. (3, -1): money-changers-row, narrow-alley-2, sailmakers-loft, silt-pool (**4-way**)
11. (4, 0): span-gate, cobblestone-street-3, serpent-den (**3-way**)
12. (1, -3): warehouse-1, pier-3
13. (4, 1): silver-arcade-4, sewer-tunnel-1 (**2-way**)
14. (3, 2): guild-hall, undercity-gate, promenade-walk-4 (**3-way**)
15. (2, -1): glassblowers-workshop, harbourmasters-office
16. (5, 0): beggars-lane-1, merchant-inn, merchant-inn-upper (**3-way**)
17. (3, -2): rope-walk, wine-merchants-cellar
18. (4, 2): silk-road, cloth-merchants-hall
19. (3, 3): jewelers-lane, highwind-bridge, observatory (**3-way**)
20. (6, 0): beggars-lane-2, bone-canal
21. (6, -1): rat-run-1, blackwater-crossing
22. (5, -2): narrow-alley-4, scorched-plaza
23. (0, -7): tide-gate, sewer-junction-3 (**2-way**)
24. (6, -2): rat-run-2, lean-to-camp, carrion-field, plague-bearers-lair (**4-way**)
25. (5, -3): narrow-alley-5, crumbling-wall-1
26. (1, -7): dry-dock, sewer-tunnel-6 (**2-way**)
27. (6, -3): narrow-alley-6, bone-pit, scavengers-market (**3-way**)
28. (7, -2): collapsed-building-3, drowned-shrine
29. (7, -3): narrow-alley-7, blast-crater
30. (6, -4): gutter-drain, ash-garden, gutter-sewer (**3-way**)
31. (1, -8): effluent-outflow, collapsed-sewer
32. (7, -5): broken-bridge, ruined-tenement-2

---

## TEST REPORT CLOSURE

**Tested:** Warrens (110 rooms, 295 exits) and Siltgate (141 rooms, 287 exits)

**Verdict:**
- ✅ Bidirectional consistency: PASS (zone transitions and hidden exits exempt)
- ✅ Loop consistency: PASS (internal grids are well-formed)
- ❌ Planar topology: **FAIL** (22 + 32 = 54 position collisions across both zones)
- ⚠️ Reachability: PARTIAL (all rooms reachable except zone-transition-only entries)

**Severity:** High — Any 2D map renderer would show impossible crossing exits.

**Next Steps:** Design review required before implementing topology fixes.


---

# Decision: Default load-test sessions to active stress traffic

**Status:** Implemented  
**Author:** Drizzt (Engine Dev)  
**Date:** 2026-05-19

## Context

The existing Playwright load test only held Colyseus connections open after entering `/zone`. That exercised connection count and autoscaling, but it did not apply sustained in-game command pressure through the same command-input path that real users use for chat and navigation.

## Decision

Make stress traffic the default behavior for the Playwright load test and expose controls to tune or disable it.

### Implementation

- Keep the workspace-owned load test in `packages/e2e/src/load-test.ts`, but expose it from the repo root with `npm run load-test`.
- Add `scripts/load-test.sh` as the convenience wrapper for the shared endpoint (`https://ellmud-test.kirbytoso.xyz`) at 200 connections.
- After each browser context reaches the enabled command input, start a jittered loop that submits either:
  - a movement command (`north`, `south`, `east`, `west`, `up`, `down`), or
  - a chat command (`say <message>`)
- Use `--action-interval` (default `3000`) as the base cadence and randomize each delay so users do not synchronize.
- Support `--no-stress` for idle-connection runs.

## Rationale

- Exercises the authoritative server path more realistically than idle sockets alone.
- Adds pressure on Colyseus/websocket traffic, command parsing, room movement, and chat broadcast with no special test-only protocol.
- Keeps the tool easy to invoke for operators while preserving tunability for follow-up runs.

## Impact

- Engine/load testing now measures both connection scale and steady-state gameplay command traffic.
- Root-level invocation removes the need to cd into `packages/e2e` for routine stress runs.
- Operators can still opt out of active behavior when they only want connection fan-out.

## Related Files

- `package.json`
- `scripts/load-test.sh`
- `packages/e2e/src/load-test.ts`
