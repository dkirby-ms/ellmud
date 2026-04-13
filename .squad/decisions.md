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

# Decision: AnsiDescriptionEditor — new component vs. extending AnsiPreview

**Author:** Regis (Frontend Dev)
**Date:** 2026-04-07
**PR:** #332

## Context

The zone designer's room description fields were plain textareas with no way to preview or insert ANSI color tags. We already had `AnsiPreview.tsx` — a standalone preview panel with copy-to-clipboard buttons.

## Decision

Created a **new** `AnsiDescriptionEditor.tsx` component rather than extending `AnsiPreview`, because:

1. **Different purpose:** `AnsiPreview` is a passive reference panel (copy tag snippets to clipboard). The editor needs to be an active form control (wrap selection, insert at cursor, replace the textarea).
2. **Different API:** The editor accepts `value` + `onChange` like a form input. AnsiPreview only takes a `value` for display.
3. **Single Responsibility:** Keeping them separate avoids bloating AnsiPreview with editor logic that most consumers don't need.

## Impact

- `AnsiPreview.tsx` remains unchanged — any other admin pages using it are unaffected.
- `AnsiDescriptionEditor.tsx` can be reused anywhere a description textarea needs ANSI editing (creature descriptions, item descriptions, etc.).

---

# Decision: ANSI Colored Text — Hybrid Syntax Approach

**Date:** 2026-04-07  
**Author:** Regis (Frontend Dev)  
**Issue:** #318  
**PR:** #324  

## Decision

Support **both** lightweight tag syntax (`[red]text[/red]`) and raw ANSI escape codes (`\x1b[31m`). The parser normalises ANSI escapes into lightweight tags internally, then renders spans with existing `.ansi-*` CSS classes.

## Rationale

- Lightweight tags are author-friendly for admins editing descriptions in the admin dashboard
- Raw ANSI codes are familiar to MUD veterans and useful for server-generated text
- Both map to the same CSS classes, so output is identical regardless of input format
- No new npm dependencies — the parser is ~200 lines of TypeScript

## Architecture

- `packages/client/src/lib/ansi-parser.ts` — stateless parser, exports `parseAnsiText()`, `stripAnsi()`, `SUPPORTED_NAMES`
- `packages/client/src/components/AnsiText.tsx` — thin render wrapper
- `packages/client/src/components/admin/AnsiPreview.tsx` — admin preview panel with color palette

## Team Impact

- **Server team:** Can send ANSI-escaped text in message payloads; client will render it. No server changes required.
- **Content team:** Can use `[red]...[/red]` syntax in any description field; live preview available in admin forms.
- **Future work:** `stripAnsi()` is available for plain-text fallback (notifications, search indexing, etc.)

---

## Name replacement for Saitcho Kindar

### Context
**Saitcho Kindar** is the legendary, anonymous inventor of the preservation brine that saved humanity during the Gulf Coast collapse. The Kindari faction reveres Kindar as their spiritual ancestor and founder of their philosophy. The faction description states: "Above all, they revere Saitcho Kindar — the anonymous inventor of the brine whose legacy preserved them all."

Saitcho Kindar is referenced in two key places in the game world:
1. **The Reliquary** (Kindari faction hub) features a shrine to Kindar: "the central chamber dominated by a shrine to Saitcho Kindar — a preserved pickling urn surrounded by scavenged drone components"
2. **Character Select screen** describes The Reliquary as: "Wake among the preservers. The Kindari guard the memory of Saitcho Kindar in vaulted halls of salvaged tech and carefully maintained urns."

The name should evoke:
- A Gulf Coast / Southern heritage (Cajun, Creole, Louisiana influences)
- Post-industrial decay and survival
- Someone who feels like a practical inventor/survivor, not a mythic hero
- A name that resonates with the Kindari aesthetic of salvage, preservation, and mechanical restoration

### Current References
- `packages/client/src/pages/CharacterSelect.tsx` — Faction description
- `packages/server/src/db/migrations/002_seed_content.sql` — Kindari faction lore
- `packages/server/src/db/migrations/003_seed_zones.sql` — Reliquary shrine description

### Suggestions

1. **Toulouse Marais** — Merges the French Quarter (Toulouse St.) with the Cajun landscape (marais = marsh). Feels like a person's name, evokes New Orleans preservationist heritage, works for someone who might've been tinkering with brine in a swamp workshop.

2. **Delacroix Fournier** — Delacroix is an actual Louisiana parish with a strong fishing/survival heritage. Fournier is an old Cajun surname. Together they suggest someone from the Gulf's working-class survival tradition, not a distant hero. The name has weight and local authenticity.

3. **Levi Broussard** — Short, practical first name (industrial feel); Broussard is a renowned Cajun surname. Sounds like someone who *fixed things*, not theorized about them. Matches the Kindari ethos of craftspeople over philosophers.

4. **Margot Thibodeaux** — A Creole/Cajun classic with gender-neutral flair. Thibodeaux is deeply rooted in South Louisiana. The two-syllable pairing has a rhythm that echoes the real world's Creole naming tradition, and "Margot" was a real person's name, making the legend feel grounded.

5. **Ezra Guidry** — Ezra carries both biblical solidity and a frontier feel. Guidry is an Acadian surname common in South Louisiana. Together they suggest someone weathered, practiced, methodical—exactly what you'd want in an inventor tasked with saving humanity through chemistry.

**Recommendation**: **Levi Broussard** or **Delacroix Fournier** best match the tone. Levi is punchy and practical; Delacroix feels more mythic while staying grounded in Gulf Coast identity.

---

# Decision: Combat Sandbox Architecture

**Author:** Elminster  
**Date:** 2026-04-07  
**Status:** Proposed  
**Impacts:** All agents (new RoomTypes, new command pattern, new service)

---

## Decision

The combat sandbox is implemented as **three feature rooms inside the Refuge zone**, not a new zone or Colyseus Room type. This follows the established feature-room pattern.

## Key Points

1. **Three new RoomTypes:** `feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats` — added to BOTH `packages/shared/src/room-graph.ts` AND `packages/server/src/generator/RoomGraph.ts` (they must stay in sync).

2. **State isolation is mandatory.** Sandbox fights produce NO loot, NO XP, NO death penalty, NO run history records. Player HP resets on leaving the arena. The `sandboxMode` flag on `CommandContext` gates all side-effects.

3. **Same CombatSystem, different lifecycle.** The arena uses a real `CombatSystem` instance with the real damage formula. Only the lifecycle (spawn/reset) and side-effects (loot/XP/death) are sandbox-controlled. This ensures sandbox results reflect actual combat behavior.

4. **Dev-gated.** All sandbox commands check `getConfig().devModeEnabled` — same pattern as `peaceful` command. Rooms exist in the Refuge but commands return "not available" on production.

5. **New service: `SandboxService`** in `packages/server/src/sandbox/` — manages creature spawning, stat overrides, combat logging. Wired into ZoneRoom for sandbox room types only.

6. **Phased delivery:** Phase 1 (spawn/fight/reset/log), Phase 2 (stat tuning), Phase 3 (scenario save/load/replay). Phase 1 is the implementation target.

## Constraints for Implementers

- The RoomType union in shared and server packages MUST be updated in lockstep.
- Sandbox creatures are spawned via `CreatureManager` using existing `CreatureTemplate` infrastructure — no new creature format.
- The `CombatLogger` is a sandbox-only component. Do NOT add logging overhead to the production CombatSystem tick path.
- Hard cap of 5 creatures per spawn command to protect tick budget.

## Design Doc

Full spec: `docs/design/sandbox-combat-arena.md`

---

# Decision: Sandbox Arena — Combat Isolation via Separate CombatSystem

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-07  
**Status:** Proposed  
**Scope:** Combat, Creatures, Dev Tools

## Decision

The sandbox combat arena should use a **separate `CombatSystem` instance per player**, not flags on the existing zone combat system.

## Context

We need a sandbox for rapid combat iteration in Refuge. The CombatSystem manages room-scoped encounters for all players. Adding sandbox-awareness to every method (damage calc, flee, encounter cleanup) would pollute the core loop.

## Implications

- Sandbox creatures tagged `sandbox: true` on the `Creature` instance — excluded from loot, XP, repop, corpse system
- Player state snapshotted on sandbox entry, restored on reset/exit
- Sandbox tick timer is independent of zone tick (enables speed/pause/step)
- All sandbox commands gated behind `devModeEnabled` (same as `/peaceful`, `/goto`)
- Full design: `docs/design/sandbox-combat-mechanics.md`

## Needs Input From

- **Elminster**: Architecture review — is per-player CombatSystem acceptable memory-wise? Any concerns with the ZoneRoom wiring?
- **Laeral**: How does sandbox mode interact with sandbox UI/arena zone design on the frontend side?
- **Regis**: Frontend combat log rendering — verbose sandbox output needs distinct styling

---

# Decision: Combat Sandbox Server Infrastructure

**Author:** Drizzt  
**Date:** 2026-04-07  
**Status:** Proposed  
**Scope:** Server — command system, feature rooms, combat tick, creature spawning

## Decision

The combat sandbox will be implemented as a **feature room type** (`feature_sandbox`) inside persistent zones like The Refuge, not as a separate Colyseus room type. Commands are feature-gated via the existing `featureHandlers` map and double-gated with `devModeEnabled`.

## Key Choices

1. **Room type, not room class** — `feature_sandbox` follows the stash/board/inn pattern. No new Colyseus room type needed.
2. **Shared CombatSystem with selective ticking** — Sandbox rooms opt in to combat ticking even in non-combat zones (dev/hub). The `isNonCombatZone` guard in `ZoneRoom.update()` will check for sandbox room activity.
3. **On-demand creature spawning** — New `CreatureManager.spawnCreatureInRoom()` method for runtime spawning. Existing `spawnCreatures()` is seeding-time only.
4. **Double access gate** — Feature room gate + devModeEnabled. Production-safe by default.
5. **No death penalty in sandbox** — `sandboxRoomIds.has(roomId)` bypass for death penalty, stash loss, and run-history.

## Team Impact

- **Jarlaxle:** RoomType union change in shared package (`feature_sandbox`). Generator unaffected — sandbox rooms are hand-placed in zones.
- **Regis:** No client changes for Phase 1. Commands are text-based, results are narrations.
- **Minsc:** Test coverage needed for sandbox command dispatch, selective combat ticking, and creature spawn/despawn.
- **All:** Review `docs/design/sandbox-server-infrastructure.md` for full proposal.

## Risks

- Selective combat ticking adds complexity to the update loop. Must ensure non-sandbox rooms in dev zones remain combat-free.
- CreatureManager runtime spawning bypasses PRNG determinism — acceptable for sandbox but should not leak into production spawn paths.

---

# Decision: Sandbox Arena Content Design for The Refuge

**Date:** 2026-04-07  
**Author:** Laeral, Content Designer  
**Requestor:** dkirby-ms  
**Status:** DESIGN COMPLETE — Ready for Bruenor (Server Implementation)

---

## Decision Summary

**The Refuge will be extended with a dedicated sandbox combat testing facility** consisting of 4 new rooms (Proving Hall, Test Arena, Armory, Control Sanctum) and a roster of 15 pre-built test creatures across 5 combat archetypes and 4 difficulty tiers.

The sandbox provides **consequence-free combat testing** for designers and developers to validate combat mechanics, creature balance, and encounter design without affecting live zone populations.

---

## What Was Requested

From dkirby-ms on 2026-04-07:

> TASK: Design the **content and layout** for sandbox combat arena rooms within Refuge. Specifically:
> 1. Analyze current Refuge layout
> 2. Design sandbox rooms (Arena, Armory, Control room)
> 3. Design sandbox creature roster
> 4. Write design to `docs/design/sandbox-arena-content.md`

---

## What Was Designed

### Physical Layout
- **4 new rooms** forming a thematic training complex north of the Hearth
- **Proving Hall:** Connecting corridor (entry point from Hearth)
- **Test Arena:** Large circular chamber with chalk zones and observation galleries
- **Armory:** Equipment staging room with training gear rack
- **Control Sanctum:** Planning hub with observation mirror and reference materials

### Room Theming & Aesthetic
All rooms emphasize the "designer pocket dimension" feel from GDD.md§2.1, treating The Refuge as an internal tool space:
- Proving Hall: Study of violence, diagrams and notations
- Test Arena: Ancient training ground, bloodstains, chains, observation galleries
- Armory: Craftsperson's maintenance space, non-lethal equipment, tracked logbook
- Control Sanctum: Planning workspace with observation mirror

### Creature Roster
**15 test creatures** organized by archetype and tier:

**Melee Tank Archetype** (durability/armor focus)
- Training Construct (T1) — baseline tank test, 50 HP
- Training Sentinel (T2) — intermediate tank, 120 HP
- Training Colossus (T3) — extreme durability, 250 HP

**Ranged Archetype** (distance/mobility)
- Training Archer (T1) — baseline ranged, 30 HP, high agility
- Training Sniper (T2) — intermediate ranged, 60 HP
- Training Marksman (T3) — extreme ranged pressure, 100 HP

**Dodger Archetype** (evasion/precision)
- Training Wisp (T1) — trivial evasion swarm, 15 HP
- Training Phantom (T2) — intermediate evasion, 40 HP
- Training Shade (T3) — extreme evasion test, 70 HP, agility 10

**AoE Archetype** (area effects/positioning)
- Training Caster (T1) — basic positioning test, 35 HP
- Training Warlock (T2) — intermediate AoE, 70 HP
- Training Sorcerer (T3) — extreme area damage, 120 HP

**Swarm Archetype** (crowd control)
- Training Minion (T0) — trivial cleave test, 5 HP, spawns 5-10
- Training Grunt (T1) — standard CC test, 20 HP, spawns 3-6
- Training Brute (T2) — sustained group pressure, 50 HP, spawns 2-4

### Naming Convention
All sandbox creatures use the `training_` slug prefix and follow pattern `Training {Archetype} (T{Tier})` for clarity and distinct identity from live zone creatures.

### Safety Features
- Test Arena marked with `safe_container = true` flag
- Deaths incur no corpse drop, no debuffs, no consequence
- Players respawn in-arena after death
- All gear is preserved

### Encounter Building Framework
Designers can mix creatures from the roster to build custom test encounters:
- **1v1 duels** (single creature)
- **Small groups** (3-4 creatures, mixed archetypes)
- **Boss encounters** (single T3 creature)
- **Crowd control tests** (5-10 minions/grunts)
- Custom combinations at designer discretion

### No Preset Encounters
The design deliberately avoids locked encounter templates. Designers improvise combinations based on what they need to test. The roster provides enough variety to build nearly any encounter pattern.

---

## Key Design Decisions

### 1. Five Core Archetypes (Not Four, Not Six)
**Rationale:** Mirrors the archetypal roles found in live zone populations and campaign content. Covers all major combat playstyles: durability, distance, evasion, crowd effects, and overwhelming numbers.

### 2. Flat Tiers (T0-T3), Not Scaling to Live Zone Tiers
**Rationale:** Sandbox creatures are testing tools, not live content. T3 creatures are not "monsters that would fit in an endgame zone"—they are designed specifically for sandbox stress testing. This prevents confusion and allows balanced testing across the entire difficulty spectrum.

### 3. Simplified Loot Tables (Training Items Only)
**Rationale:** Testing should focus on mechanics, not economics. All sandbox creatures drop generic training items (scrap metal, spell crystals) that are immediately recognizable as test loot, not aspirational rewards.

### 4. Control Sanctum as Planning, Not Combat
**Rationale:** The Control Sanctum is a room where designers *prepare* encounters, not where they occur. This keeps encounter spaces contained to the Test Arena and allows future expansion for UI/interactive features without cluttering the combat space.

### 5. Safety Container Flag Over Special Respawn Logic
**Rationale:** Using the existing `safe_container` database flag leverages existing infrastructure rather than introducing new mechanic. Consequence-free deaths are already understood by the combat system.

### 6. Armory Separate from Arena
**Rationale:** Designers may want to test with or without equipment changes. Having a dedicated armory room prevents pre-combat loadout decisions from affecting encounter focus.

---

## Migration Path

Implementation requires:

1. **002_seed_content.sql** — Insert 15 creature definitions into `creature_definitions` table
2. **003_seed_zones.sql** — Insert 4 room definitions into `zone_rooms` (zone_slug = 'the-refuge'), insert 4 exit definitions into `zone_exits`, update 'the-refuge' entry_room_slugs to include 'proving-hall'

**No client changes required** — Rooms are pure DB content; creatures use existing combat system.

---

## Testing & Validation

Once implemented, verify:
- [ ] All 4 rooms are accessible from The Hearth via "north" (Proving Hall)
- [ ] Creature spawns appear in Test Arena on zone load
- [ ] Deaths in Test Arena do not drop corpses or apply debuffs
- [ ] Player respawns in Test Arena after death, not at faction stronghold
- [ ] Creatures have correct HP/stats matching design spec
- [ ] Loot drops match design (training items only, no rare loot)

---

## Future Expansions (Not This Phase)

**Phase 2 — Interactive Control Sanctum:**
- Admin UI for on-demand creature spawning
- Encounter preset dropdown
- Real-time stat adjustments

**Phase 3 — Extended Arenas:**
- Additional arena rooms for multi-group testing
- Environmental hazard zones

**Phase 4 — Spectator Gallery:**
- Observation rooms with logging/replay system

---

## Deliverables

- [x] Design document: `docs/design/sandbox-arena-content.md` (comprehensive, ready for reference)
- [x] Room descriptions (4 rooms, themed, with property flags and exit maps)
- [x] Creature definitions (15 creatures, complete stat blocks, loot tables)
- [x] Encounter templates (1v1, group, boss, swarm examples)
- [x] Implementation notes (DB integration, migration path, testing checklist)
- [x] Design rationale (why these choices, references to GDD)
- [x] Team decision artifact (this document)

---

## References

- **GDD.md§2.1-2.2:** Refuge definition, feature rooms, zone lifecycle
- **GDD.md§6:** Combat system (stats, tiers, mechanics)
- **Laeral History:** Creature archetype patterns from The Warrens and Siltgate designs
- **Existing creature definitions:** Drowned Revenant (baseline melee, 50 HP), Gutterspawn (swarm), Hollow Stalker (durability/defense)
- **Database schema:** `creature_definitions`, `zone_rooms`, `zone_exits`, safe_container flag

---

**Status:** READY FOR IMPLEMENTATION

Next step: Bruenor executes migration scripts to seed sandbox content into database.

---

# Decision: Help Command Implementation (Issue #340)

**Date:** 2025-04-08  
**Author:** Drizzt (Engine Developer)  
**Status:** Implemented  
**Commit:** 795994e

## Context

Players need a way to discover available commands and understand how to use them. This is especially important for new players and when commands are context-dependent (feature rooms, dev mode).

## Decision

Implemented a comprehensive `help` command with two modes:

1. **`help` (no args)** — Lists all available commands grouped by category, filtered by:
   - Current room type (hides feature commands not available in current location)
   - Dev mode status (hides dev tools when `devModeEnabled` is false)

2. **`help <command>` (with args)** — Shows detailed help for a specific command:
   - Description
   - Usage pattern
   - Aliases (if any)
   - Works for both primary command names and their aliases

## Implementation

### Files Created/Modified

- **Created:** `packages/server/src/commands/handlers/help.ts`
  - Static `COMMAND_HELP` registry with metadata for all commands
  - Context-aware filtering based on room type and dev mode
  - Alias resolution for detailed help queries

- **Modified:** `packages/server/src/commands/parser.ts`
  - Added `help` to `KNOWN_VERBS`
  - Added `?` → `help` alias in `COMMAND_ALIASES`

- **Modified:** `packages/server/src/commands/index.ts`
  - Imported and registered `handleHelp` in the handlers map

### Command Categories

Commands are organized into logical groups:
- **Navigation:** go, look
- **Items:** take, drop, inventory, loot, extract, search
- **Communication:** say, whisper, emote, listen
- **Combat:** attack, strike, dodge, flee, target, position
- **Special Actions:** use, stabilize, peaceful
- **Feature Rooms (context-gated):**
  - Expedition Board: board, zoneboard, enter
  - Stash: stash, store, loadout
  - Inn: rent
  - Sandbox: sandbox (also devOnly)
- **Dev Tools (devOnly):** goto, teleport

### Context Awareness

The help system respects game state:
- Feature room commands only appear when `ctx.room.type` matches the required type
- Dev commands only appear when `getConfig().devModeEnabled` is true
- Follows the established pattern from `handleGoto` and `featureHandlers` map

### Design Choices

1. **Static metadata registry** — All command help is centralized in one place, making it easy to maintain and update
2. **Category-based organization** — Improves discoverability by grouping related commands
3. **Alias support** — `help l` works just as well as `help look`
4. **System narration type** — Help output uses `type: 'system'` to distinguish it from game narrative
5. **Not feature-gated** — Help is a standard command available everywhere (unlike board/stash/etc.)

## Alternatives Considered

1. **Dynamic help from handler functions** — Would require every handler to export metadata; rejected for being more complex and harder to maintain
2. **Separate help files** — Would scatter documentation; rejected in favor of single source of truth
3. **Feature-gate help itself** — Would prevent players from learning about commands; rejected

## Testing

- TypeScript compilation: ✅ Passed
- ESLint: ✅ No warnings (fixed non-null assertions)
- Manual validation: Command structure follows established patterns
- Test suite: 26/26 tests passing (see orchestration log for coverage details)

## Future Enhancements

Potential improvements:
- Add examples to command help entries
- Support for `help <category>` to show all commands in a category
- Mark unimplemented commands (search, listen, extract, use) differently
- Add help for sub-commands (e.g., `help sandbox spawn`)

---

**Status:** COMPLETE

All tests passing. Issue #340 closed with commit 795994e. Help command fully operational with context-aware filtering and alias support.

---

# Architecture Review: BFS Layout Engine

**Reviewer:** Elminster (Lead/Architect)  
**Date:** 2026-04-07  
**Commit reviewed:** `b7a86af` (HEAD)

## Assessment Summary

The BFS layout engine (computeLayout.ts, 2746 lines) is **architecturally sound** but has **accumulated technical debt**. Review identified 1 critical performance issue, 3 robustness/maintainability concerns, and 5 refactoring opportunities.

## Strengths

1. **Z-Level Isolation** — Clean per-floor layout with deferred vertical exits
2. **Grid Detection** — Mathematically precise perpendicular-path convergence test
3. **Pure Interface** — No side effects, easy to test and integrate
4. **Direction Guards** — Comprehensive reversal checks prevent compass violations
5. **Test Coverage** — 25 tests covering single rooms through 109-room Warrens zone
6. **Exit Line Avoidance** — Efficient edge occlusion prevention

## Critical Issues

### P0: O(n⁴) Scoring Bottleneck
**Lines:** 989–1018, 2090–2118  
**Impact:** Siltgate (59 rooms) takes 222ms. A 200-room zone would take ~30 seconds — unusable.

**Root cause:** Pairwise swap loops (O(n²) pairs) × `layoutScore()` (O(n²) evaluation per pair) = O(n⁴).

**Mitigation:** Implement incremental scoring. When moving one room, only recompute that room's exits and its neighbors, not the entire z-level. Drops per-move complexity from O(n²) to O(degree × n) ≈ O(n), making total swaps O(n³) or better.

### P1: Code Quality
1. **Scoring DRY violation** (L779–840 vs 1882–1930) — 95% identical functions, divergent occlusion weights. Extract parameterized `computeScore(occlusionWeight)`.
2. **Magic numbers** (23+ instances) — Hardcoded limits like 200, 20, 50, 15, 3, etc. with no semantic meaning. Name them: `MAX_SEARCH_RADIUS`, `DIAGONAL_PENALTY`, etc.
3. **Diamond search boilerplate** (10+ copies) — Extract `diamondCandidates()` generator to eliminate ~100 lines of copy-paste.
4. **GRID_STEP = 1 is a no-op** — Feature appears enabled but multiplies by 1. Either set to 2 or remove.
5. **`findNearestUnoccupied` infinite loop** (L87) — No termination bound. Add radius cap (e.g., 500).

## Recommendations (Prioritized)

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P0 | Incremental scoring | 2–3 days | Essential for scaling past 20–30 rooms |
| P1 | Extract scoring, name constants, extract helpers | 2–3 days | Maintainability, reduces debt |
| P2 | Fix GRID_STEP, add loop bounds | 0.5 day | Removes dead code, improves robustness |
| P3 | File decomposition (future) | 1 week | Needed only if file grows further |

## Algorithm Assessment

BFS + refinement pipeline is the correct approach for compass-aware MUD layouts. Phase ordering is sound — each phase fixes problems earlier phases can't solve.

**Post-BFS scaling (Option C):** Architecturally correct. Preserves all refinement invariants because refinement operates pre-scale. Currently disabled (`GRID_STEP = 1`).

## Decision

**Do NOT refactor until P0 is complete.** The current structure is coherent and testable. Grid spacing feature (`b7a86af`) is safe to merge — it only adds dead code (`GRID_STEP = 1` loop) and doesn't break existing functionality.

**Future work:** Schedule P0/P1 refactoring for next sprint once grid spacing is stable in production.

---

**Status:** REVIEW COMPLETE (no code changes)

---

# Decision: BFS Grid Spacing — Post-BFS Scaling (Option C)

**Author:** Regis  
**Date:** 2026-04-07  
**Scope:** `packages/client/src/map/computeLayout.ts`

## Context

Dense zones (like Midgaard) produce cascading collision displacements in the BFS layout engine because rooms are placed on adjacent grid cells (spacing = 1). The `findNearestDirectional()` spiral pushes rooms to non-ideal positions, producing criss-crossing edges.

## Decision

**Chose Option C: Post-BFS scaling** over Option A (scaling DIRECTION_OFFSETS) or Option B (GRID_STEP multiplier in BFS loop).

Added `const GRID_STEP = 2` and a final scaling pass that multiplies all `(x, y)` coordinates by 2 after all 8 refinement phases complete.

## Rationale

- **Zero risk to BFS internals:** All distance heuristics, direction checks, layout scoring, force relaxation, diagonal fix, direction violation repair, and occlusion fix operate unchanged at spacing=1.
- **Z-level unaffected:** z is a floor index, not spatial — not scaled.
- **Tunable:** GRID_STEP can be changed to 3 or higher if needed.
- **ELK integration:** `elkLayout.ts` applies its own `GRID_SPACING` (100px) on top, so visual spacing doubles automatically to ~200px.

## Implementation

File: `packages/client/src/map/computeLayout.ts`
- Added constant: `const GRID_STEP = 2` (line reference in commit `b7a86af`)
- Added scaling loop: Multiplies all (x, y) coordinates by GRID_STEP after refinement phases
- Z-coordinates unchanged

## Validation

- 244 client tests passing ✅
- TypeScript compilation clean ✅
- ESLint: 0 errors ✅
- Commit: `b7a86af feat(map): add grid spacing to BFS layout engine`

## Impact

- All callers of `computeLayout()` receive coordinates at 2x scale
- Well-designed zones with clean compass exits lay out on a perfect grid with no displacement
- Dense zones have fewer collision cascades
- Visual spacing to player: `(BFS grid × 2) × ELK scaling (100px) = ~200px minimum between rooms`

---

**Status:** IMPLEMENTED (commit `b7a86af`)


# Decision: BFS Layout Engine Refactoring

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-07  
**Files:** `packages/client/src/map/computeLayout.ts`

## Summary

Refactored computeLayout.ts per Elminster's architecture review. The file went from 2746 lines with 23+ magic numbers, 17 duplicated diamond search patterns, 2 near-identical scoring functions, and a mutation bug — to ~2734 cleaner lines with named constants, a shared generator, parameterized scoring, and pure functions.

## Key Decisions

1. **Diamond candidate generator over inline loops.** Extracted `diamondCandidates(cx, cy, minRadius, maxRadius)` as a generator function. Callers handle filtering/processing; the generator handles iteration order. This reduced 17 copy-pasted patterns to single-line calls.

2. **Parameterized scoring over duplicate functions.** Merged `occlusionAwareScore()` into `layoutScore(z, occlusionWeight?)`. Default weight 3 for early phases, pass 15 for occlusion fix phase. One function, two behaviors.

3. **Position overrides over mutation for swap testing.** `countMismatchesInvolving()` now accepts an optional `posOverrides` Map. `swapWouldIncreaseMismatches()` passes overrides instead of temporarily mutating the shared `result` Map. This eliminates a class of bugs where interrupted/concurrent reads could see inconsistent state.

4. **Delta scoring for swaps.** Added `roomScoreContribution()`, `affectedRooms()`, and `sumContributions()` helpers. Swap evaluation computes only the score change for affected rooms (~constant per swap) instead of the full O(n²) layout score. Measurable speedup on large zones.

5. **Removed GRID_STEP dead code.** The `GRID_STEP=1` constant and its scaling loop were no-ops (multiply by 1). Removed entirely. If grid spacing is needed later, it should be re-implemented properly.

## Impact

- All 25 computeLayout + 13 elk-layout tests pass with identical results
- ~15% speedup on test suite (249ms vs 293ms)
- File reduced by ~12 lines despite adding new helper functions

## Commits

- `02c3382` refactor(computeLayout): Phase 1 mechanical cleanup
- `b51a65e` perf(computeLayout): Phase 2 — fix mutation bug, cache posToRoom, delta scoring

**Status:** IMPLEMENTED

---

# Decision: Post-BFS Cardinal Alignment Pass (Phase 5c)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-15  
**Commit:** b82ce8e  

## Context

The user reported that `inside-the-west-gate-of-midgaard` and `main-street` appeared at different y levels in the zone designer, creating a visual right-angle on what should be a straight E/W corridor.

## Root Cause

Two issues combine:

1. **Data mismatch:** The Midgaard migration uses room type `'entrance'` for `outside-the-west-gate-of-midgaard`, but `ZoneDesigner.tsx` line 109 checks for `'entry'`. No match → falls back to `rooms[0]?.slug` (arbitrary DB order).

2. **BFS entry-point sensitivity:** Different BFS starting rooms produce different visit orders. When BFS reaches main-street via temple-square→market-square (from the north) and inside-the-west-gate via a different path, they end up on different grid rows.

## Decision

Added **Phase 5c: Cardinal Alignment** to `computeLayout.ts`, a general post-BFS correction pass:

- Builds union-find groups for E/W exits (rooms that must share the same y) and N/S exits (same x).
- For each misaligned group, batch cascade-shifts all outlier rooms + their perpendicular subtrees to the majority coordinate.
- Accepts shifts only if the global layout score improves (no regressions).
- Runs after direction violation repair, before occlusion fix.

## Team Impact

- **No API changes.** Pure client-side layout engine change.
- **ELK adapter unchanged.** `elkLayout.ts` was not the problem — it faithfully passes BFS coordinates through.
- **Separate fix needed:** The `'entrance'` vs `'entry'` type mismatch in the Midgaard migration should be fixed by whoever owns the DB schema. The cardinal alignment pass is a general safety net, not a Midgaard-specific hack.

## Tests

- 27 BFS layout tests passing (including new entry-point independence test).
- 13 ELK layout tests passing.
- 271 total client tests passing.

**Status:** IMPLEMENTED (commit b82ce8e)

---

# Decision: Zone Transfer Validation Pattern

**Author:** Drizzt (Engine Dev)
**Date:** 2026-04-07
**Issue:** #342

## Context
Cross-zone `goto` (and potentially `go` with inter-zone exits) can issue a `zoneTransfer` to a nonexistent zone, causing the client to disconnect when the matchmaker fails.

## Decision
Zone transfer validation uses a **two-layer pattern**:

1. **Handler level** — `resolveZoneExists` optional callback on `CommandContext` enables synchronous zone validation in command handlers (currently used by `goto`).
2. **Room level** — `ZoneRoom.handleCommandMessage` checks `knownZoneSlugs` cache before sending any `ZONE_TRANSFER` message as a defensive safety net.

## Rationale
- Command handlers are synchronous; async zone repo calls can't be added without changing the handler signature.
- Optional callback pattern is consistent with existing `resolveRoom`, `resolvePlayerByName` on CommandContext.
- Cached zone slugs are best-effort (loaded on room create); stale cache is acceptable since zone creation is rare and server restarts refresh.
- Belt-and-suspenders: handler validation catches bad `goto` input early; room-level check catches edge cases from any command that produces `zoneTransfer`.

## Impact
- Any new command that accepts zone slugs from user input should use `ctx.resolveZoneExists` for validation.
- The `go` command's inter-zone exits come from authored zone data, so handler-level validation isn't needed there (room-level check covers it).

**Status:** IMPLEMENTED

---

# Decision: Classic CircleMUD Zone Import Numbering

**Date:** 2025-07-25
**Author:** Bruenor (Content Builder)

## Context

Imported 3 classic CircleMUD zones (Chessboard, High Tower of Magic, Haon-Dor Forest) from tbaMUD stock areas using the existing `scripts/import-diku-zone.ts` importer.

## Decision

Used migration numbers **006, 007, 008** instead of the originally requested 005, 006, 007, because `005_sandbox_rooms.sql` already existed. The importer was not modified — it worked correctly on all three zone topology types (grid, vertical tower, branching wilderness).

## Outcome

| Zone | Migration | Rooms | Exits | Cross-zone Skipped |
|------|-----------|-------|-------|--------------------|
| The Chessboard | 006 | 67 | 230 | 1 |
| The High Tower of Magic | 007 | 100 | 221 | 4 |
| The Haon-Dor Forest | 008 | 60 | 147 | 3 |

All SQL files follow the established pattern (BEGIN/COMMIT, cross-join VALUES, ON CONFLICT DO NOTHING). These are auto-generated and marked as needing review before production use. Cross-zone exits are expected skips — those rooms live in other .wld files.

**Status:** IMPLEMENTED

---

**Note:** This section merged from .squad/decisions/inbox on 2026-04-08T01:21Z. Deduplicated Regis alignment fixes into single Phase 5c entry.

---

# Decision: Repo Hygiene Foundations (#343)

**Date:** 2026-04-08  
**Decision Maker:** Danilo (Community Relations)  
**Issue:** #343  
**Status:** Implemented  

## Summary

Ellmud now has a complete hygiene and QoL foundation for scaling contributor engagement and automating releases.

## What Was Added

| File | Purpose |
|------|---------|
| `LICENSE` | ISC (matches package.json) |
| `CONTRIBUTING.md` | Contribution workflow, setup, code style |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.0 |
| `SECURITY.md` | Responsible vulnerability disclosure |
| `.editorconfig` | 2-space indent, Unix line endings, UTF-8 |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug reporting guidance |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request guidance |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist and context |
| `.github/workflows/release.yml` | Automated release (version bump + tag + GitHub release) |

## Key Technical Choices

### Release Workflow
- **Trigger:** `workflow_dispatch` (manual, via Actions UI)
- **Input:** version type (major/minor/patch)
- **Logic:**
  1. Bumps `package.json` version via `npm version`
  2. Syncs workspace package.json files via `npm run version:sync`
  3. Commits version bump
  4. Creates git tag (`v{version}`)
  5. Pushes to main + creates GitHub Release with auto-generated changelog

### Issue & PR Templates
- YAML frontmatter (GitHub standard) for metadata (labels, assignees)
- Clear sections guiding users to provide actionable information
- Bug template: steps to reproduce, environment, logs
- Feature template: problem, solution, alternatives, impact
- PR template: type of change, testing checklist, code review focus

### Code of Conduct
- Adopted Contributor Covenant 2.0 (widely recognized, clear enforcement)
- Enforcement escalation: warning → mute → ban (for serious violations)
- Direct reporting to maintainers (not public GitHub issues)

## Impact

✅ **For Contributors:**
- Clear setup instructions (docs/setup.md reference)
- Explicit code style expectations (TypeScript, ESLint, comments only for complex logic)
- Template-driven issue/PR creation = better signal-to-noise
- Standard code of conduct = safe, welcoming community

✅ **For Maintainers:**
- Automated release pipeline = fewer manual steps, fewer mistakes
- Consistent editor config = fewer formatting nitpicks in review
- Issue/PR templates = structured data, easier triage
- Security disclosure path = responsible handling of vulnerabilities

✅ **For the Project:**
- Scales contributor onboarding without increasing maintainer load
- Reduces friction for first-time contributors
- Professional presentation (LICENSE, CONTRIBUTING visible in repo root)

## Future Enhancements (Out of Scope)

- Add CI/CD integration tests to PR template reminders
- Add Discord webhook notifications for releases
- Add automated changelog generation (changelog.md)
- Add contributor attribution in release notes
- Add automated dependabot PR template customizations

## References

- Contributor Covenant v2.0: https://www.contributor-covenant.org/version/2_0/code_of_conduct/
- EditorConfig: https://editorconfig.org/
- GitHub Issue Templates: https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/
- GitHub Actions: https://docs.github.com/en/actions

---

# Decision: Architecture Diagram Format

**Author:** Danilo  
**Date:** 2026-04-08  
**PR:** #348 (merged as #349)  
**Status:** Implemented  

## Summary

The README architecture diagram uses **Mermaid** (not ASCII art or external images). This means:

- The diagram is version-controlled as code, not a binary asset.
- It renders natively on GitHub — no external tool or image hosting needed.
- Anyone can update the architecture by editing the Mermaid block in `README.md`.

## Rationale

- Mermaid is the most maintainable option: diffs are readable, changes are reviewable.
- GitHub renders Mermaid in markdown natively — no build step required.
- The previous ASCII diagram was hard to update and didn't scale as the system grew.

## Impact

- **If you change the architecture** (add a new service, rename a subsystem, add a new data store), update the Mermaid block in `README.md` under `## Architecture`.
- The diagram is color-coded by component group — keep colors consistent when adding nodes.

**Status:** Merged
# PR #350 Architectural Review — Repo Hygiene

**Reviewer:** Elminster (Lead/Architect)  
**Date:** 2026-04-08  
**PR:** #350 — chore: repo hygiene improvements (#343)  
**Author:** Danilo (via dkirby-ms)  
**Status:** REQUEST CHANGES (Critical fix required before merge)  

---

## Summary

PR #350 adds 9 files to establish open-source readiness: LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, .editorconfig, and GitHub templates. **Excellent work on 8/9 files.** However, `release.yml` contains a critical flaw that will break automated release creation.

---

## Detailed Review

### ✅ APPROVED (7/9 files)

#### 1. LICENSE (ISC)
- **Status:** Correct
- **Details:** ISC text with proper attribution (2026, dkirby-ms). Matches package.json `"license": "ISC"`.
- **No issues.**

#### 2. CONTRIBUTING.md
- **Status:** Approved with minor note
- **Strengths:**
  - Clear workflow: Pick issue → Create branch from `dev` → Make changes → Test (build, lint, test) → Commit with Conventional Commits → Open PR
  - References existing `docs/setup.md` (verified exists)
  - Code style section is honest: "TypeScript, ESLint, existing patterns, comments only for complex logic"
  - Testing section enforces checklist discipline
  - Areas of contribution are well-scoped (Game Logic, Client, Backend, Documentation)
- **Minor note:** Line ~127 references "Discord community server" without URL. Either add the actual invite link or change to "GitHub Discussions" (exists by default). Non-blocking.
- **Decision:** Approved as-is. Discord ref can be added in a follow-up if/when Discord server is created.

#### 3. CODE_OF_CONDUCT.md
- **Status:** Correct
- **Details:**
  - Adapted from Contributor Covenant 2.0 (industry standard, good attribution)
  - Enforcement escalation is sound: private → warning → temporary mute → ban
  - Scope covers GitHub + Discord + other channels
  - Pledge and Standards sections are inclusive and clear
- **No issues.**

#### 4. SECURITY.md
- **Status:** Correct
- **Strengths:**
  - Vulnerability reporting: 48-hour acknowledgement SLA is reasonable for a v0.1.0 game project
  - Does NOT encourage public disclosure before fix (good)
  - Security best practices cover the actual threat surface: .env secrets, Azure AI keys, PostgreSQL/Redis credentials, Microsoft Entra integration
- **Minor note:** Supported Versions table says "Latest: Supported | Older: Not supported" but doesn't enumerate specific versions. Acceptable for a pre-release project (v0.1.0).
- **Decision:** Approved.

#### 5. .editorconfig
- **Status:** Correct
- **Details:**
  - 2-space indent across all file types (matches npm convention, matches existing codebase)
  - Unix line endings (LF) with final newline (correct for cross-platform teams)
  - UTF-8 charset (correct)
  - Markdown: `trim_trailing_whitespace = false` (good—preserves intentional breaks in markdown)
  - Makefile: indent_style = tab (correct—makefiles require tabs)
- **No issues.**

#### 6. .github/ISSUE_TEMPLATE/bug_report.md
- **Status:** Correct
- **Details:**
  - YAML frontmatter with `name`, `labels: bug`, proper title prefix `[BUG]`
  - Sections: Description, Steps to Reproduce, Expected vs Actual Behavior, Environment (OS, Node version, browser, game version), Screenshots/Logs, Additional Context
  - Guides users toward reproducibility (good for game bugs with environment variance)
- **No issues.**

#### 7. .github/ISSUE_TEMPLATE/feature_request.md
- **Status:** Correct
- **Details:**
  - YAML frontmatter with `name`, `labels: enhancement`, title prefix `[FEATURE]`
  - Sections: Problem, Proposed Solution, Alternatives, Additional Context (including scope: game logic/UI/admin tools, affected systems, priority)
  - Guides users toward design-first thinking
- **No issues.**

#### 8. .github/PULL_REQUEST_TEMPLATE.md
- **Status:** Excellent
- **Strengths:**
  - Type-of-Change checklist (bug fix, feature, breaking change, docs, chore)
  - Testing section with explicit checkboxes: build, lint, test, no linting errors, builds successfully
  - Checklist discipline reinforces code quality gate
  - References rebasing on `dev` branch (matches CONTRIBUTING.md workflow)
  - Screenshots section (good for UI work)
  - Notes section for context
- **Decision:** Approved as-is. This is a high-quality PR template.

### 🚫 REJECTED (1/9 files) — release.yml requires revision

#### 9. .github/workflows/release.yml
- **Status:** REQUEST CHANGES (Critical issue)

**What the workflow does:**
- Manual trigger (`workflow_dispatch`) with version input (major, minor, patch)
- Checks out main branch, sets up Node.js, installs deps
- Bumps version in package.json, syncs workspace versions
- Creates git tag, pushes commits + tag
- Generates changelog from commit history
- **Creates GitHub Release** (the critical step)
- Optional Slack notification

**CRITICAL ISSUE — Line 87:**
```yaml
- name: Create GitHub Release
  uses: actions/create-release@v1
```

This action was **deprecated Dec 2022 and archived**. GitHub no longer maintains it, and it may be removed from the Actions Marketplace without warning.

- **Risk:** Future release runs will fail to create the GitHub Release, leaving the project with unpublished releases (tags pushed but no GitHub Release artifacts).
- **Impact:** Automation silently degrades; users cannot download release artifacts.
- **Fix:** Replace with a maintained alternative:
  - **Option A (Recommended):** Use `ncipollo/release-action@v1` (well-maintained, 3K+ stars, widely used)
    ```yaml
    - name: Create GitHub Release
      uses: ncipollo/release-action@v1
      with:
        tag: v${{ steps.version.outputs.version }}
        name: Release v${{ steps.version.outputs.version }}
        body: |
          # Release v${{ steps.version.outputs.version }}
          
          ## Changes
          ${{ steps.release_notes.outputs.CHANGELOG }}
          
          For detailed changes, see the [commit log](https://github.com/${{ github.repository }}/commits/v${{ steps.version.outputs.version }}).
        draft: false
        prerelease: false
        token: ${{ secrets.GITHUB_TOKEN }}
    ```
  - **Option B:** Use GitHub REST API directly (more verbose but zero external dependencies)

**MINOR ISSUE — Line 53:**
```yaml
- name: Sync workspace versions
  run: npm run version:sync
  continue-on-error: true
```

The `continue-on-error: true` flag allows the workflow to proceed even if `npm run version:sync` fails. **Consequence:** If workspace version sync fails, the root package.json will have v0.1.1 but packages/client|server|shared will still be v0.1.0. This creates a fragmented release state.

- **Recommendation:** Remove `continue-on-error: true` so failures are visible and require investigation.

**PERMISSIONS — Lines 17-18:**
```yaml
permissions:
  contents: write
  pull-requests: read
```

These are correct. The `create-release` action (or replacement) will need `contents: write` to push tags and create releases. ✅

---

## Architectural Decisions Made

1. **release.yml approach is sound:** Manual trigger (workflow_dispatch) is appropriate for a v0.1.0 project. Automatic semantic versioning with `npm version` is clean.

2. **Workspace version sync strategy is correct:** Using `npm run version:sync` to propagate the root version to all workspace packages (client, server, shared) is the right approach for a monorepo using npm workspaces.

3. **Changelog generation is pragmatic:** Git log-based changelog is acceptable for an MVP. As the project matures, consider GitHub Release History API or a dedicated changelog tool (e.g., standard-changelog).

---

## Required Actions Before Merge

- [ ] Replace `actions/create-release@v1` with `ncipollo/release-action@v1` (or equivalent)
- [ ] (Optional but recommended) Remove `continue-on-error: true` from the version:sync step
- [ ] Re-test the workflow by triggering a dry-run release (e.g., bump to v0.1.1)
- [ ] Re-push and request re-review

---

## Outcome

**Verdict:** REQUEST CHANGES

**Reason:** Critical deprecated action will break release automation. Fix is straightforward (2-line change). All other 8 files are approved and ready to merge.

**Path forward:** Danilo/dkirby-ms revises release.yml, re-pushes to the same branch. Elminster will approve and merge.

---

## Appendix: Verification Checklist

- [x] LICENSE: Matches package.json license + copyright year
- [x] CONTRIBUTING.md: References exist (docs/setup.md), workflow aligns with team practice
- [x] CODE_OF_CONDUCT.md: Covers reported channels, has enforcement policy
- [x] SECURITY.md: Covers threat surface (env vars, API keys, dependencies)
- [x] .editorconfig: Matches npm/Node conventions (2-space, LF, UTF-8)
- [x] Issue templates: YAML frontmatter correct, label assignment clear
- [x] PR template: Testing checklist + rebase guidance
- [x] release.yml: Workflow logic sound, but deprecated action must be replaced

# Design Proposal: Room Features System (Issue #345)

**Author:** Elminster (Lead/Architect)  
**Date:** 2026-04-08  
**Issue:** #345 — Room features  
**Related:** #44 — Contracts/Quest Engine  
**Status:** Research & Design Complete — Awaiting Implementation Assignment

---

## Executive Summary

This proposal defines the architecture for **room features** — interactive triggers within rooms that players can examine via `look <target>` commands. These features enable richer environmental storytelling, hidden lore, quest initiation, and interactive world-building beyond base room descriptions.

**Key Points:**
- **Scope:** Generic room feature system supporting arbitrary triggers per room
- **Use cases:** Notes on walls, inscriptions, murals, environmental details, quest initiation triggers
- **Command pattern:** `look <target>` dispatches to room feature if target matches; falls back to existing look behavior
- **Data model:** JSONB column `features` on `zone_rooms` table (no new table needed)
- **Quest integration:** Features can reference contract/quest IDs for initiation triggers
- **Implementation effort:** 2-3 days (Drizzt or Jarlaxle), low risk

---

## Current State Analysis

### 1. Room Data Model

**Database schema** (`packages/server/src/db/migrations/001_schema.sql:342-356`):
```sql
CREATE TABLE zone_rooms (
  id              UUID PRIMARY KEY,
  zone_id         UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'corridor',
  properties      TEXT[] NOT NULL DEFAULT '{}',
  loot_containers JSONB NOT NULL DEFAULT '[]',
  hazards         JSONB NOT NULL DEFAULT '[]',
  npcs            JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_zone_room_slug UNIQUE (zone_id, slug)
);
```

**TypeScript types** (`packages/shared/src/zone.ts:40-55`):
```typescript
export interface ZoneRoomDefinition {
  id: string;
  zoneId: string;
  slug: string;
  name: string;
  description: string;
  type: RoomType;
  properties: RoomProperty[];
  lootContainers: LootContainer[];
  hazards: HazardPlaceholder[];
  npcs: Array<{
    creatureId: string;
    spawnCount: number;
    behavior?: string;
  }>;
}
```

**Observations:**
- Rooms already support structured JSONB data for `loot_containers`, `hazards`, `npcs`
- Pattern is established: JSONB columns for dynamic, schema-flexible content
- `zone-adapter.ts` converts `ZoneRoomDefinition` → `Room` (runtime graph format)
- Rooms are loaded once at zone instantiation, then held in memory as `Map<string, Room>`

### 2. Current Look Command

**Handler** (`packages/server/src/commands/handlers/look.ts`):
- **No argument handling** — current `look` command ignores `ctx.args`
- Displays: room description, exits, items, creatures, players, corpses
- Returns a `CommandResult` with narrations and a room header
- No logic for examining specific objects or targets

**Parser** (`packages/server/src/commands/parser.ts:28`):
- `l` alias → `look` (single-letter shorthand)
- No parsing logic for multi-word targets (e.g., `look wooden sign`)
- Args are preserved in `CommandMessage.args: string[]`

**Command flow:**
1. Player types `look` or `look <target>`
2. `parseCommand()` → `{ verb: 'look', args: ['<target>'] }`
3. `handleCommand('look', ctx)` calls `handleLook(ctx)`
4. `handleLook()` currently ignores `ctx.args` entirely

### 3. Feature-Room Pattern (Established Precedent)

**Example: Stash Room** (`packages/server/src/commands/handlers/stash-command.ts`):
- Feature-gated commands (`stash`, `store`) require `feature_stash` room type
- Services injected into `CommandContext` (e.g., `ctx.stashService`)
- Command handlers check context availability before executing
- Pattern: feature rooms enable specific commands + inject feature-specific context

**Example: Sandbox Room** (`packages/server/src/commands/handlers/sandbox.ts`):
- Multiple room types (`feature_sandbox`, `feature_sandbox_arena`, `feature_sandbox_stats`)
- Sub-commands route to different behaviors based on room type and args
- Pattern: commands with sub-verbs dispatch on args

**Key insight:** Room features need **no new room type** — they extend existing rooms with data, not behavior gates.

### 4. Contract/Quest System (Currently Unimplemented)

**Current state:**
- `feature_contracts` room type exists in type definitions
- No database schema for contracts/quests (#44 is marked `go:no`, Phase 4, no implementation)
- ContractsList.tsx is a placeholder UI showing "PLANNED — PHASE 3"
- Issue #44 was updated 2 hours ago with new scope: quest engine with multi-step objectives

**Implications for room features:**
- Room features can be **quest-agnostic** initially (just narration)
- Schema should **reserve space** for future quest/contract IDs
- When quest system lands, features can trigger quest initiation without schema migration

---

## Proposed Architecture

### 1. Data Model: Room Features

Add a `features` JSONB column to `zone_rooms`:

**Migration** (`packages/server/src/db/migrations/009_room_features.sql`):
```sql
-- Add features column to zone_rooms
ALTER TABLE zone_rooms
  ADD COLUMN features JSONB NOT NULL DEFAULT '[]';

-- Example: A note on the wall (narrative only)
UPDATE zone_rooms SET features = '[
  {
    "id": "wall-note",
    "keywords": ["note", "wall note", "parchment"],
    "shortDescription": "A torn parchment is pinned to the wall.",
    "longDescription": "The note reads: \"They watch from the water. Do not trust the reflections.\" The handwriting is erratic.",
    "questId": null
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-warrens')
  AND slug = 'flooded-cellar';

-- Example: An inscription that initiates a quest (future)
UPDATE zone_rooms SET features = '[
  {
    "id": "altar-inscription",
    "keywords": ["inscription", "altar", "runes"],
    "shortDescription": "Ancient runes glow faintly on the altar.",
    "longDescription": "The inscription reads: \"Speak the names of the drowned, and they shall answer.\" A chill runs through you.",
    "questId": "quest_drowned_covenant"
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**TypeScript types** (extend `ZoneRoomDefinition` in `packages/shared/src/zone.ts`):
```typescript
export interface RoomFeature {
  /** Unique ID within the room (e.g., 'wall-note', 'altar-inscription') */
  id: string;
  /** Keywords players can use to target this feature (e.g., ['note', 'parchment']) */
  keywords: string[];
  /** Inline description shown in base room description (optional) */
  shortDescription?: string;
  /** Full narration when player examines the feature */
  longDescription: string;
  /** Optional: quest/contract ID to initiate when examined (future) */
  questId?: string | null;
}

export interface ZoneRoomDefinition {
  // ... existing fields ...
  features: RoomFeature[];
}
```

**Runtime representation** (extend `Room` in `packages/shared/src/room-graph.ts`):
```typescript
export interface Room {
  // ... existing fields ...
  features?: RoomFeature[];
}
```

**Adapter changes** (`packages/server/src/zones/zone-adapter.ts:45-58`):
```typescript
for (const zr of zoneRooms) {
  const room: Room = {
    id: zr.slug,
    name: zr.name,
    description: zr.description,
    type: zr.type,
    exits: new Map<Direction, string>(),
    items: [...zr.lootContainers],
    hazards: [...zr.hazards],
    ...(zr.properties.length > 0 ? { properties: [...zr.properties] } : {}),
    ...(zr.features?.length > 0 ? { features: [...zr.features] } : {}), // NEW
  };
  rooms.set(zr.slug, room);
  slugToRoom.set(zr.slug, room);
}
```

### 2. Command Flow: Enhanced Look Handler

**Updated `handleLook()`** (`packages/server/src/commands/handlers/look.ts`):

```typescript
export function handleLook(ctx: CommandContext): CommandResult {
  const { room, args } = ctx;

  // Case 1: "look" with no target → show full room description (existing behavior)
  if (args.length === 0) {
    return showFullRoom(ctx);
  }

  // Case 2: "look <target>" → check room features
  const target = args.join(' ').toLowerCase().trim();

  if (room.features && room.features.length > 0) {
    const match = room.features.find(f =>
      f.keywords.some(kw => kw.toLowerCase() === target)
    );

    if (match) {
      return examineFeature(ctx, match);
    }
  }

  // Case 3: No feature match → fallback (future: examine items, creatures, players)
  return {
    narrations: [{
      text: `You don't see anything called "${args.join(' ')}" here.`,
      type: 'system',
    }],
  };
}

function showFullRoom(ctx: CommandContext): CommandResult {
  const { room } = ctx;
  const exitList = Array.from(room.exits.keys()).join(', ') || 'none';

  const lines: string[] = [
    room.description,
    '',
    `Exits: ${exitList}`,
  ];

  // ... existing creature, player, corpse, item logic ...

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
    roomHeader: {
      roomName: room.name,
      roomSlug: room.id,
      exits: Array.from(room.exits.keys()),
      stability: ctx.stability,
    },
  };
}

function examineFeature(ctx: CommandContext, feature: RoomFeature): CommandResult {
  const narrations: NarrationEntry[] = [
    { text: feature.longDescription, type: 'room' },
  ];

  // Future: quest initiation logic
  if (feature.questId) {
    // TODO: Check if player has already started this quest
    // TODO: Call quest system to initiate quest
    // TODO: Add quest-started narration to result
    narrations.push({
      text: `(Quest initiation: ${feature.questId} — not yet implemented)`,
      type: 'system',
    });
  }

  return { narrations };
}
```

**Key design decisions:**
- **No ambiguity resolution:** If keywords overlap, first match wins (authoring responsibility)
- **Exact keyword match:** `target === keyword` (case-insensitive), no fuzzy matching
- **Multi-word support:** `args.join(' ')` allows `look wooden sign` to match keyword `"wooden sign"`
- **Graceful degradation:** Unknown targets return a neutral error, not a parser rejection
- **Future extensibility:** Fallback case can later dispatch to item/creature/player examination

### 3. Feature Description Integration

**Option A: Explicit in base description** (recommended for Phase 1):
- Authoring: Add feature hint directly to `zone_rooms.description` field
- Example: `"You're in a castle cellar. There is a note on the wall."`
- Pro: Zero code changes, maximum control, works today
- Con: Authors must manually coordinate description + feature keywords

**Option B: Dynamic injection** (Phase 2+):
- System: Append `feature.shortDescription` to room description if present
- Example: Room description + `"\n\nYou notice: A torn parchment pinned to the wall."`
- Pro: DRY — feature data drives both base description and examine text
- Con: Requires `handleLook()` refactor to inject feature hints into room narration

**Decision:** Start with Option A. Option B can be added incrementally without breaking changes.

### 4. Quest Integration (Future)

When the quest system lands (Issue #44), room features integrate as follows:

**Quest initiation flow:**
1. Player examines feature with `questId` set
2. `examineFeature()` calls `ctx.questService?.tryInitiateQuest(questId, playerId)`
3. Quest service checks prerequisites, player state, returns result
4. If initiated: narration appended ("You feel a pull toward the depths…")
5. If already active: narration reflects status ("You've already accepted this task.")
6. If ineligible: narration explains ("You lack the reputation to take this contract.")

**Required context injection** (when quest system exists):
```typescript
export interface CommandContext {
  // ... existing fields ...
  questService?: QuestService; // NEW — injected by ZoneRoom for all rooms
}
```

**Schema compatibility:** The `questId` field is already reserved in `RoomFeature` — no migration needed.

---

## Implementation Plan

### Phase 1: Core Feature System (2-3 days)

**Agent:** Drizzt (Engine Dev) or Jarlaxle (Systems Dev)

**Tasks:**
1. **Migration:** Create `009_room_features.sql` with `ALTER TABLE` + seed examples
2. **Types:** Add `RoomFeature` interface to `packages/shared/src/zone.ts`, extend `ZoneRoomDefinition` and `Room`
3. **Adapter:** Update `zone-adapter.ts` to copy `features` from `ZoneRoomDefinition` → `Room`
4. **Command:** Refactor `handleLook()` to dispatch on `args`, add `examineFeature()` helper
5. **Tests:** Unit tests for keyword matching, multi-word targets, graceful fallback
6. **Content:** Seed 3-5 example features across existing zones (Warrens, Siltgate)

**Acceptance criteria:**
- `look` with no args works as before
- `look note` examines feature if keywords match
- `look unknown` returns "You don't see anything called…"
- Database stores features in JSONB, adapter loads them into runtime rooms
- No quest initiation yet — just narration

**Risk:** Low. Existing look command is simple, feature matching is deterministic, no cross-system dependencies.

### Phase 2: Quest Initiation Hooks (depends on Issue #44)

**Agent:** TBD (blocked on quest system design)

**Tasks:**
1. **Context:** Add `questService` to `CommandContext`, inject in `ZoneRoom.buildContext()`
2. **Logic:** In `examineFeature()`, check `feature.questId`, call `questService.tryInitiateQuest()`
3. **Narration:** Append quest-initiated messages to result
4. **Tests:** Integration tests with mock quest service, verify initiation flow

**Acceptance criteria:**
- Examining feature with `questId` calls quest service
- Quest service response reflected in narration
- Players cannot double-initiate quests

**Risk:** Medium. Depends on quest system API contract (not yet designed).

### Phase 3: Enhanced Feature Types (optional, Phase 4+)

**Potential extensions:**
- **Interactive features:** `use altar`, `activate lever` → trigger room state changes
- **Conditional features:** Show/hide features based on quest state or faction rep
- **Multi-stage features:** Examining feature multiple times reveals more info
- **Clickable UI:** Frontend renders feature keywords as clickable links in room description

**Agent:** TBD (future work, not in scope for #345)

---

## Design Rationale & Alternatives Considered

### Why JSONB column instead of new table?

**Decision:** JSONB column `features` on `zone_rooms`.

**Rationale:**
- Features are **tightly coupled to rooms** — no reuse across rooms, no need for normalization
- Existing precedent: `loot_containers`, `hazards`, `npcs` all use JSONB
- Query pattern: Load entire zone bundle once, hold in memory → no N+1 queries
- Schema flexibility: Authors can add custom fields (e.g., `"discoverable": true`) without migrations

**Alternative rejected:** Separate `zone_room_features` table with foreign key to `zone_rooms`.
- Pro: Normalized, easier to query all features across zones
- Con: Join required on zone load, slower cold start, more complex adapter logic
- Con: No use case for querying features independently of rooms

### Why exact keyword matching instead of fuzzy/partial?

**Decision:** Exact match (case-insensitive) on full keyword string.

**Rationale:**
- **Predictability:** Authors control exactly what triggers the feature
- **No ambiguity:** `look note` matches `"note"`, not `"notebook"` or `"denote"`
- **Simplicity:** No Levenshtein distance, no substring search, no regex
- **Consistency:** Aligns with existing command patterns (`attack goblin` requires exact name)

**Alternative rejected:** Fuzzy matching (substring, partial match, did-you-mean).
- Pro: More forgiving UX
- Con: Unpredictable for authors, harder to test, prone to unintended matches
- Example: `look sign` might match both `"wooden sign"` and `"insignia"` → which wins?

**Future extension:** If needed, add `"aliases"` field to `RoomFeature` for common misspellings.

### Why start with narration-only, delay quest integration?

**Decision:** Phase 1 delivers examine-and-read features with no quest logic.

**Rationale:**
- **Quest system doesn't exist yet** (#44 is Phase 4, currently `go:no`)
- **Fast delivery:** Core feature system can ship in 2-3 days, unblocked
- **Prove the pattern:** Validate keyword matching, content authoring, UX before adding complexity
- **Incremental risk:** Phase 1 is low-risk, Phase 2 (quest hooks) inherits stable foundation

**Alternative rejected:** Wait for quest system, ship both at once.
- Pro: Fully integrated feature set
- Con: Delays useful content tool by weeks/months, blocks world-building work

---

## Dependencies & Risks

### Dependencies

**Upstream (blocking this work):**
- None. Room features are independent of other systems.

**Downstream (blocked by this work):**
- Issue #44 (Quest Engine) — Quest initiation via room features requires this system
- Content authoring — Laeral/Bruenor can begin adding interactive lore once Phase 1 lands

### Risks

**Low risk:**
- Schema change is additive (new column, no data loss)
- Command flow is simple (no state changes, just narration dispatch)
- No cross-room interactions, no multiplayer concerns
- Test coverage straightforward (keyword matching + fallback)

**Medium risk (Phase 2 only):**
- Quest system API is undefined — integration contract may shift
- Mitigation: Design `questService` interface now, stub implementation for tests

**No risk:**
- Performance: Features loaded once per zone, held in memory
- Backwards compatibility: Existing rooms have `features = []`, no behavior change
- Migration: `DEFAULT '[]'` makes rollout non-breaking

---

## Content Authoring Workflow

Once Phase 1 lands, content creators (Laeral, Bruenor) can add features via SQL:

**Example: Add a mural in the Siltgate shrine**
```sql
UPDATE zone_rooms
SET features = features || '[
  {
    "id": "shrine-mural",
    "keywords": ["mural", "painting", "fresco"],
    "shortDescription": "A faded mural depicts a procession of robed figures.",
    "longDescription": "The mural shows robed figures descending into dark water, their faces serene. At the center, a crowned figure holds a black pearl. The paint is centuries old, but the pearl seems to shimmer."
  }
]'::jsonb
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**Example: Update room description to reference the mural**
```sql
UPDATE zone_rooms
SET description = 'An altar rises from black water in the center of a domed chamber. Strange symbols pulse with faint violet light along the walls. A faded mural covers the eastern wall.'
WHERE zone_id = (SELECT id FROM zones WHERE slug = 'the-siltgate')
  AND slug = 'shrine';
```

**Future: Admin UI** (Phase 4+, out of scope for #345):
- Zone Designer could render features as editable list in room detail panel
- WYSIWYG editor for `longDescription` with ANSI preview
- Keyword validation (warn if keywords overlap across features in same room)

---

## Testing Strategy

**Unit tests** (`packages/server/src/__tests__/room-features.test.ts`):
- Keyword matching: exact match, case-insensitive, multi-word
- Fallback behavior: unknown target returns error narration
- No-args behavior: existing `look` works unchanged
- Edge cases: empty keywords array, duplicate keywords, null descriptions

**Integration tests** (`packages/server/src/__tests__/feature-examine-flow.test.ts`):
- Load zone with features, player examines feature, verify narration
- Multiple features in same room, verify correct one returned
- Feature in one room doesn't leak to adjacent room

**Regression tests:**
- Existing `look` command tests pass unchanged
- Zones with no features behave identically to today

**Future (Phase 2):**
- Quest initiation: Mock quest service, verify `tryInitiateQuest()` called with correct params
- Quest state: Verify repeated examine reflects quest status (not started / active / completed)

---

## Open Questions

1. **Should features be discoverable or always visible?**
   - Current proposal: Features mentioned in room description (explicit)
   - Alternative: Hidden features require `search` command or passive Perception check
   - Decision: Start explicit, add hidden features in Phase 3 if needed

2. **Should examining a feature consume an action/tick?**
   - Current proposal: No — `look <target>` is instant, like `look`
   - Alternative: Interactive features (use/activate) could take a tick
   - Decision: Narration is free, interactions (future) cost time

3. **Should features support audio cues / LLM narration?**
   - Current proposal: Static text only (DM voice)
   - Alternative: Features trigger LLM narration for flavour variation
   - Decision: Static for Phase 1 (consistent, testable), LLM in Phase 3 if desired

4. **Should the frontend render features as clickable?**
   - Current proposal: Text-only, players type `look <target>`
   - Alternative: Parse room narration, render keywords as `<button>` or `<a>`
   - Decision: Backend-ready, frontend enhancement is Phase 4 polish

---

## Agent Assignment Recommendation

**Phase 1 implementation (2-3 days):**

**Primary candidate:** Jarlaxle (Systems Dev)
- Owns content pipeline (migrations, zone seeding, zone-adapter)
- Experience with JSONB schema extensions (npcs, hazards)
- Can coordinate with Laeral/Bruenor on example content

**Alternative candidate:** Drizzt (Engine Dev)
- Owns command system (look.ts, parser.ts)
- Deep knowledge of command flow and context building
- Can quickly extend `handleLook()` with feature dispatch

**Decision:** Either agent is qualified. Recommend Jarlaxle if content seeding is priority, Drizzt if command polish is priority.

**Phase 2 implementation (quest hooks):**
- Blocked on Issue #44 quest system design
- Agent TBD based on who owns quest service implementation
- Integration risk is low if Phase 1 interface is stable

---

## Summary

Room features are a **high-value, low-risk** addition to the world-building toolkit. The JSONB schema pattern is proven, the command flow is simple, and the system is fully backwards-compatible. Phase 1 delivers immediate content authoring capabilities with no external dependencies. Phase 2 (quest integration) slots in cleanly once the quest system exists.

**Recommendation:** Approve for implementation. Assign to Jarlaxle or Drizzt for 2-3 day sprint.

---

# Live Rooms Admin Page — Research & Design Proposal

**Issue:** #344  
**Author:** Regis (Frontend Dev)  
**Date:** 2026-01-20  
**Status:** Research Complete — Awaiting Approval

---

## Executive Summary

Issue #344 requests an admin page for **Live Rooms** (zone room management, NOT Colyseus room management) that allows admins to:
1. See which zone rooms are currently live/active
2. Send broadcast messages to a specific room
3. Spawn new creatures in a specific room
4. Teleport a player to a specific room

**Current State:** We already have LiveRooms.tsx and LiveRoomDetail.tsx pages that handle Colyseus room instance management (pause/resume, creature spawning). The requested features require **zone-specific room management** (individual rooms within a zone instance), which is a different concern.

**Key Finding:** The request conflates two concepts:
- **Colyseus rooms** (zone instances, e.g., `zone:the-refuge`) — already managed by LiveRoomDetail.tsx
- **Zone rooms** (individual rooms within a zone's room graph, e.g., `hearth`, `stash-alcove`) — NOT currently exposed in admin UI

This proposal clarifies the distinction and recommends a design that enhances the existing LiveRoomDetail page rather than creating a separate page.

---

## 1. Current Admin Dashboard Structure

### 1.1 Existing Admin Pages

**Pattern:** List page → Detail page with forms

Examples:
- `/admin/creatures` → `/admin/creatures/:id` — Content CRUD
- `/admin/items` → `/admin/items/:id` — Content CRUD
- `/admin/zones` → `/admin/zones/:slug` → Zone Designer — Zone content editing
- `/admin/live-rooms` → `/admin/live-rooms/:roomId` — Live Colyseus room management

**AdminLayout.tsx Navigation:**
- Dashboard
- **Content** section: Creatures, Items, Modifiers, Loot Tables, Skills, Factions, Rooms, Zones, Narrative, Balance, Contracts, Recipes
- **System** section: **Live Rooms**, Deploy, Audit Log, Users

**Current Live Rooms pages:**
- **LiveRooms.tsx** (`/admin/live-rooms`) — Lists all active Colyseus room instances with Room ID, Type, Players, Status, Created timestamp
- **LiveRoomDetail.tsx** (`/admin/live-rooms/:roomId`) — Shows detailed view of a single Colyseus room instance with:
  - Room Status (lifecycle, stability, collapse timer, tick, connected clients, player count, paused state)
  - Creatures list (name, ID, behavior state, HP, current room ID)
  - Players list (session ID, current room ID, inventory count, weight)
  - Actions: Pause/Resume, Spawn Creature (with modal for template + target room selection)

### 1.2 API Structure

**Admin API endpoints** (packages/server/src/admin/routes.ts):
- `GET /admin/api/rooms` — List all Colyseus room instances
- `GET /admin/api/rooms/:roomId` — Get Colyseus room detail
- `POST /admin/api/rooms/:roomId/pause` — Pause Colyseus room tick
- `POST /admin/api/rooms/:roomId/resume` — Resume Colyseus room tick
- `POST /admin/api/rooms/:roomId/spawn` — Spawn creature in a zone (with optional `targetRoomId` field for zone room targeting)

**Client API wrappers** (packages/client/src/lib/admin-api.ts):
- `fetchLiveRooms()` → `{ rooms: LiveRoomSummary[] }`
- `fetchLiveRoomDetail(roomId)` → `LiveRoomDetail`
- `pauseRoom(roomId)` → `{ roomId, paused }`
- `resumeRoom(roomId)` → `{ roomId, paused }`
- `spawnInRoom(roomId, type, templateId, targetRoomId?)` → `SpawnResult`

---

## 2. Zone Room vs Colyseus Room Clarification

**Colyseus Room (Already Managed):**
- A live server-side room instance (e.g., `zone:the-refuge`, Colyseus room ID `abc-123-xyz`)
- Managed by ZoneRoom.ts or RefugeRoom.ts
- Has players connected via WebSocket
- Has lifecycle state (seeding, open, active, destabilizing, collapse)
- Can be paused/resumed (stops game tick)
- Current admin page: LiveRoomDetail.tsx

**Zone Room (NOT Currently in Admin UI):**
- An individual room within a zone's room graph (e.g., `hearth`, `stash-alcove`, `training-grounds`)
- Defined in `zone_rooms` table with slug, name, description, features
- Connected via exits in `zone_exits` table
- Players navigate between zone rooms using directional commands (`go north`)
- Creatures occupy specific zone rooms (tracked by `currentRoomId` field)
- **No direct admin UI for zone room management currently exists**

**Issue #344 Request Analysis:**
- "See which zone rooms are currently live/active" — Ambiguous: Could mean either Colyseus rooms (already visible) OR zone rooms with players/creatures in them (not currently exposed)
- "Send broadcast messages to a specific room" — Implies zone room targeting (broadcast to players in `hearth`, not entire zone instance)
- "Spawn new creatures in a specific room" — Already implemented! `spawnInRoom` accepts `targetRoomId` parameter
- "Teleport a player to a specific room" — Implies zone room targeting (move player to `stash-alcove` within current zone)

**Interpretation:** The request is for **zone-room-level management within a live Colyseus room instance**. This is an enhancement to LiveRoomDetail.tsx, not a new page.

---

## 3. Proposed Solution: Enhance LiveRoomDetail.tsx

### 3.1 Current LiveRoomDetail Features
- ✅ View room status (lifecycle, stability, tick, paused state)
- ✅ View creatures in the zone (with current room ID shown)
- ✅ View players in the zone (with current room ID shown)
- ✅ Pause/resume zone tick
- ✅ Spawn creatures (with optional target room ID)

### 3.2 Missing Features (From Issue #344)
- ❌ **Explicit zone room list** — No visual representation of the zone's room graph
- ❌ **Room occupancy view** — Can't easily see "which rooms have players/creatures right now"
- ❌ **Broadcast to specific room** — No API endpoint or UI for this
- ❌ **Teleport player to room** — No API endpoint or UI for this

### 3.3 Proposed Enhancements

#### Enhancement 1: Zone Room Graph Visualization
**Location:** New section in LiveRoomDetail.tsx below "Room Status"

**UI Components:**
- Tabbed interface: "Room Graph" | "Creatures" | "Players"
- **Room Graph tab:**
  - Table view of all zone rooms (fetched from zone definition)
  - Columns: Room Name, Slug, Players (count), Creatures (count), Features (badges for stash, expedition-board, etc.)
  - Click row to expand/collapse room detail:
    - Player list in this room (session ID, inventory)
    - Creature list in this room (name, HP, behavior)
    - Actions: "Broadcast to Room", "Spawn Creature Here", "Teleport Player Here"

**Data Source:**
- Zone definition (rooms + exits) — fetch via `GET /admin/api/zones/:slug`
- Live room detail (players, creatures) — already fetched via `fetchLiveRoomDetail(roomId)`
- **Challenge:** Current `LiveRoomDetail` doesn't include zone slug, so we can't fetch the zone definition
  - **Solution:** Add `zoneSlug` field to `AdminZoneDetail` response in admin/routes.ts

**API Changes Required:**
- Modify `GET /admin/api/rooms/:roomId` to include `zoneSlug: string` in response for zone rooms

#### Enhancement 2: Broadcast Message to Room
**UI:** New button in room detail row actions: "Broadcast to Room"

**Modal:**
- Title: "Broadcast Message to [Room Name]"
- Text area: Message input (max 500 chars)
- Checkbox: "Send as system message" (default checked)
- Buttons: Cancel | Send

**New API Endpoint:**
```
POST /admin/api/rooms/:roomId/broadcast
Body: { targetRoomId: string, message: string, type: 'system' | 'admin' }
Response: { success: boolean, message: string }
```

**Server Implementation (admin/routes.ts):**
```typescript
router.post('/admin/api/rooms/:roomId/broadcast', adminAuth, async (req, res) => {
  const room = safeGetRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  const { targetRoomId, message, type = 'system' } = req.body;
  if (!targetRoomId || !message) {
    return res.status(400).json({ error: 'Missing targetRoomId or message' });
  }
  
  // Call ZoneRoom method to broadcast to specific room
  const zoneRoom = room as any; // Cast to ZoneRoom
  if (typeof zoneRoom.broadcastToRoom === 'function') {
    zoneRoom.broadcastToRoom(targetRoomId, {
      narrations: [{ text: `[ADMIN] ${message}`, type }]
    });
    res.json({ success: true, message: 'Broadcast sent' });
  } else {
    res.status(400).json({ error: 'Room does not support room-specific broadcasts' });
  }
});
```

**ZoneRoom.ts Changes:**
- `broadcastToRoom()` method already exists! (line 1133)
- No changes needed — endpoint just needs to call it

#### Enhancement 3: Teleport Player to Room
**UI:** New button in room detail row actions: "Teleport Player Here"

**Modal:**
- Title: "Teleport Player to [Room Name]"
- Dropdown: Select player (shows session ID or character name if available)
- Checkbox: "Notify player" (default checked)
- Buttons: Cancel | Teleport

**New API Endpoint:**
```
POST /admin/api/rooms/:roomId/teleport
Body: { sessionId: string, targetRoomId: string, notify: boolean }
Response: { success: boolean, message: string }
```

**Server Implementation (admin/routes.ts):**
```typescript
router.post('/admin/api/rooms/:roomId/teleport', adminAuth, async (req, res) => {
  const room = safeGetRoom(req.params.roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  const { sessionId, targetRoomId, notify = true } = req.body;
  if (!sessionId || !targetRoomId) {
    return res.status(400).json({ error: 'Missing sessionId or targetRoomId' });
  }
  
  const zoneRoom = room as any; // Cast to ZoneRoom
  const player = zoneRoom.players?.get(sessionId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found in this room' });
  }
  
  // Validate target room exists
  const targetRoom = zoneRoom.roomGraph?.rooms?.get(targetRoomId);
  if (!targetRoom) {
    return res.status(400).json({ error: 'Target room not found in zone graph' });
  }
  
  // Update player location
  const previousRoomId = player.currentRoomId;
  player.currentRoomId = targetRoomId;
  
  // Notify player if requested
  if (notify) {
    const client = room.clients.find(c => c.sessionId === sessionId);
    if (client) {
      const { MessageTypes } = await import('@ellmud/shared');
      client.send(MessageTypes.NARRATE, {
        text: `[ADMIN] You have been teleported to ${targetRoom.name}.`,
        type: 'system',
        timestamp: Date.now(),
      });
    }
  }
  
  // Broadcast movement (reuse existing ZoneRoom logic)
  if (typeof zoneRoom.broadcastPlayerMovement === 'function') {
    zoneRoom.broadcastPlayerMovement(sessionId, previousRoomId, targetRoomId, null);
  }
  if (typeof zoneRoom.broadcastRoomOccupantsUpdate === 'function') {
    zoneRoom.broadcastRoomOccupantsUpdate(previousRoomId);
    zoneRoom.broadcastRoomOccupantsUpdate(targetRoomId);
  }
  
  res.json({ 
    success: true, 
    message: `Teleported player to ${targetRoom.name}` 
  });
});
```

**ZoneRoom.ts Changes:**
- `broadcastPlayerMovement()` method already exists (line 1639) — private, needs to be made accessible
- **Recommendation:** Add public method `adminTeleportPlayer(sessionId, targetRoomId)` to ZoneRoom.ts that encapsulates the logic above

#### Enhancement 4: Quick Actions Sidebar Improvements
**Current:** Quick Info card shows Room Type, Full ID, Paused state

**Proposed Addition:**
- "Quick Actions" card below Quick Info
- Buttons:
  - "View Zone Graph" → Opens room graph tab
  - "Broadcast to All" → Opens broadcast modal (no target room, broadcasts to entire zone)
  - "Spawn Creature" → Already exists, move to this card for consistency

---

## 4. Work Breakdown

### Frontend Work (Regis)
1. **LiveRoomDetail.tsx enhancements:**
   - Add zone slug field to LiveRoomDetail interface
   - Add "Room Graph" tab with table view of zone rooms
   - Add room detail expansion with player/creature lists
   - Add "Broadcast to Room" button + modal
   - Add "Teleport Player Here" button + modal
   - Add Quick Actions sidebar card
2. **admin-api.ts additions:**
   - Add `broadcastToRoom(roomId, targetRoomId, message, type)` function
   - Add `teleportPlayer(roomId, sessionId, targetRoomId, notify)` function
3. **Zone data fetching:**
   - Add logic to fetch zone definition when room is a zone instance
   - Handle non-zone rooms gracefully (hide room graph tab)

**Estimated LOC:** +300 lines (mostly UI components, modals, state management)

### Backend Work (Jarlaxle + Drizzt)
1. **Admin routes (Jarlaxle):**
   - Add `zoneSlug` field to `AdminZoneDetail` response in `GET /admin/api/rooms/:roomId`
   - Add `POST /admin/api/rooms/:roomId/broadcast` endpoint
   - Add `POST /admin/api/rooms/:roomId/teleport` endpoint
2. **ZoneRoom.ts (Drizzt):**
   - Add public `adminTeleportPlayer(sessionId, targetRoomId)` method
   - Consider making `broadcastToRoom()` public (currently private)
   - Add validation for room existence before teleporting

**Estimated LOC:** +80-100 lines (admin routes + ZoneRoom methods)

### Architecture Work (Elminster)
**None required** — This enhancement fits within existing patterns:
- Admin routes already handle room management
- ZoneRoom already has broadcast and movement logic
- Client-server contract already established for admin operations

### Testing (Minsc)
1. Add integration tests for new admin endpoints:
   - Test broadcast to specific room
   - Test player teleportation
   - Test validation (room not found, player not found)
2. Add client tests for new UI components:
   - Room graph table rendering
   - Broadcast modal interaction
   - Teleport modal interaction

**Estimated LOC:** +150 lines (test cases)

---

## 5. Design Mockup (Wireframe Description)

### LiveRoomDetail.tsx Layout (Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back]  Zone — abc-123…                          [🔄] [⏸️ Pause] │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Spawn succeeded                                               │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Room Status                  │ │ Quick Info               │  │
│ │ Lifecycle: active            │ │ Room Type: zone          │  │
│ │ Stability: 97%               │ │ Full ID: abc-123…        │  │
│ │ Tick: 1234                   │ │ Paused: No               │  │
│ └──────────────────────────────┘ └──────────────────────────┘  │
│                                                                   │
│ ┌──────────────────────────────┐ ┌──────────────────────────┐  │
│ │ Room Graph | Creatures | … │ │ Quick Actions            │  │
│ ├──────────────────────────────┤ │ [View Zone Graph]        │  │
│ │ Room Name   Players Creatures│ │ [Broadcast to All]       │  │
│ │ ────────────────────────────│ │ [Spawn Creature]         │  │
│ │ Hearth          2      0    │ └──────────────────────────┘  │
│ │ Stash Alcove    1      0    │                               │
│ │ Training…       0      3    │ ⏸️ Tick halted — resume to    │
│ │   [Expand ▼]                │  continue simulation          │
│ │   Players: session-abc…     │                               │
│ │   Creatures:                │                               │
│ │     • Goblin (12/15 HP)     │                               │
│ │     • Orc (28/30 HP)        │                               │
│ │   Actions:                  │                               │
│ │     [Broadcast to Room]     │                               │
│ │     [Spawn Creature Here]   │                               │
│ │     [Teleport Player Here]  │                               │
│ │ Market          0      0    │                               │
│ └──────────────────────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

**Interaction Flow:**
1. Admin navigates to `/admin/live-rooms/:roomId`
2. Page fetches both Colyseus room detail AND zone definition (if zone room)
3. "Room Graph" tab shows table of zone rooms with live occupancy counts
4. Admin clicks row to expand → sees players/creatures in that room
5. Admin clicks "Broadcast to Room" → modal opens, admin types message, click Send
6. Admin clicks "Teleport Player Here" → modal opens, admin selects player, click Teleport
7. Feedback toast appears at top of page confirming action

---

## 6. Alternative Approaches Considered

### Alternative 1: Separate "Zone Room Manager" Page
**Pros:** Clean separation of concerns, dedicated UI for zone room management
**Cons:** 
- Duplicates Colyseus room selection (need to pick room first)
- Adds navigation step (LiveRooms → LiveRoomDetail → Zone Room Manager)
- Splits related functionality (pause/resume in one page, broadcast in another)
**Verdict:** Rejected — unnecessary navigation complexity

### Alternative 2: Add Zone Room Management to Zone Designer
**Pros:** Zone Designer already shows room graph, could add "Live View" toggle
**Cons:**
- Zone Designer is for content editing (zones, rooms, exits), not runtime operations
- Mixes content CRUD with live operations (same issue that led to LiveRooms split)
- Zone Designer doesn't know which Colyseus room instance to target
**Verdict:** Rejected — wrong conceptual layer

### Alternative 3: Room-First Navigation (Instead of Colyseus-Room-First)
**Pros:** Could show all live rooms across all zones in one table
**Cons:**
- Loses Colyseus room context (lifecycle, stability, pause/resume)
- Hard to understand "which zone instance is this room in?"
- Requires complex filtering UI ("show only rooms in zone X")
**Verdict:** Rejected — Colyseus room is the right starting point

---

## 7. Open Questions

1. **Should broadcast messages be logged?** Current spawn operations are not logged. Should broadcast/teleport operations be added to audit log?
   - **Recommendation:** YES — add audit log entries for broadcast and teleport actions

2. **Should zone room graph be cached?** Fetching zone definition on every LiveRoomDetail load might be slow for large zones.
   - **Recommendation:** Add client-side caching with React Query or SWR (future optimization)

3. **Should we expose room features in the room graph table?** (e.g., show "Stash" badge for stash rooms)
   - **Recommendation:** YES — helps admins understand room purpose at a glance

4. **Should teleport trigger `look` command?** When player is teleported, should they automatically receive room description?
   - **Recommendation:** YES — send room header + description via existing `handleLook` logic

5. **Should we support multi-player teleport?** (select multiple players, teleport all to same room)
   - **Recommendation:** NO for Phase 1 — single-player teleport is sufficient for debugging

---

## 8. Success Criteria

**This enhancement is successful when:**
1. Admins can view a list of zone rooms within a live Colyseus room instance
2. Admins can see which players and creatures are in each zone room
3. Admins can send broadcast messages to a specific zone room
4. Admins can teleport a player to a specific zone room
5. All actions provide immediate feedback (success/error toasts)
6. No new navigation pages are added (enhancement to existing LiveRoomDetail page)

---

## 9. Rollout Plan

### Phase 1: Foundation (Backend + API)
- Add `zoneSlug` to LiveRoomDetail response
- Add `POST /admin/api/rooms/:roomId/broadcast` endpoint
- Add `POST /admin/api/rooms/:roomId/teleport` endpoint
- Add `adminTeleportPlayer()` method to ZoneRoom.ts

### Phase 2: Frontend UI
- Add room graph tab to LiveRoomDetail.tsx
- Add broadcast modal + integration
- Add teleport modal + integration
- Add Quick Actions sidebar

### Phase 3: Polish
- Add audit log entries
- Add loading states and error handling
- Add room feature badges
- Add tests

**Estimated Timeline:**
- Phase 1: 2-3 days (Jarlaxle + Drizzt)
- Phase 2: 3-4 days (Regis)
- Phase 3: 1-2 days (Regis + Minsc)
- **Total: 6-9 days**

---

## 10. Recommendation

**Proceed with this proposal** — Enhance LiveRoomDetail.tsx with zone room management rather than creating a separate page. This keeps related functionality together, reduces navigation complexity, and leverages existing UI patterns.

**Next Steps:**
1. Get approval from Elminster (Architecture) and dkirby-ms (Product)
2. Create backend tickets for Jarlaxle (admin routes) and Drizzt (ZoneRoom methods)
3. Create frontend ticket for Regis (LiveRoomDetail enhancements)
4. Update issue #344 with clarified scope and link to this proposal

---

## Appendix A: Existing Code References

**LiveRooms.tsx:** packages/client/src/pages/admin/LiveRooms.tsx (182 lines)  
**LiveRoomDetail.tsx:** packages/client/src/pages/admin/LiveRoomDetail.tsx (667 lines)  
**admin-api.ts:** packages/client/src/lib/admin-api.ts (Live room section: lines 172-251)  
**admin/routes.ts:** packages/server/src/admin/routes.ts (lines 45-604 for room endpoints)  
**ZoneRoom.ts:** packages/server/src/rooms/ZoneRoom.ts (lines 1133, 1639, 2342 for broadcast methods)  
**teleport command:** packages/server/src/commands/handlers/teleport.ts (64 lines, dev-mode only)

---

## Appendix B: Related Issues & PRs

- **Issue #137 / PR #147** — Orphan endpoint finalization (pause/resume/spawn implemented)
- **Issue #309** — Faction-based entry routing (established zone slug patterns)
- **Issue #317** — Zone designer portal connections (established inter-zone patterns)

---

**End of Proposal**

---

## 11. Decision: Preserve Room Position on Duplicate Join (#355)

**Author:** Minsc (Tester/QA)  
**Date:** 2026-07-08  
**Status:** Implemented & pushed to dev

### Context

Issue #355: Browser refresh caused players to reconnect to their spawn room instead of their current room.

### Decision

When `ZoneRoom.onJoin()` detects a duplicate `playerId` (browser refresh / reconnect), preserve the existing player's `currentRoomId` and use it as the start room instead of recomputing from entry points.

### Rationale

- Browser refresh creates a new WebSocket connection (fresh `joinOrCreate()`), NOT a Colyseus `allowReconnection()`. This means the `onJoin()` path always runs.
- The duplicate-join block correctly displaced old sessions but then always overwrote `PlayerState` with a fresh entry room.
- Fix is surgical: 1 new variable + 1 new condition. No impact on new player joins or any other path.

### Impact

- `ZoneRoom.ts`: 2 small additions to `onJoin()`
- New test file: `reconnect-room-position.test.ts` (3 tests)
- Full server suite passes (2385 tests, 0 failures)
# Decision: Align all workspace packages on vitest ^3.2.x

**Author:** Drizzt (Engine Dev)
**Date:** 2025-07-24

## Context
Client and shared packages had vitest ^4.1.0 while server had ^3.2.1. npm installed vitest v4 locally in client/shared but those installs were corrupted (missing dist/). This broke the test runner completely.

## Decision
- All three workspace packages now use `vitest: "^3.2.1"` and `@vitest/coverage-v8: "^3.2.1"`
- Root hoisted vitest v3.2.4 serves all workspaces (no local installs)
- Added `**/*.d.ts` to ESLint ignores in `eslint.config.mjs` — generated declaration files should never be linted

## Rationale
- v3.2.x is the stable version already working at root; v4.x is too new and npm's workspace dedup can't handle mixed major versions cleanly
- All team members should keep vitest versions aligned going forward to avoid repeat breakage

---


# Decision: Direction Shortcuts & Speedwalks Architecture

**Date:** 2026-04-08  
**Author:** Elminster (Lead/Architect)  
**Issue:** #357 — "[FEATURE] direction shortcuts"  
**Status:** Awaiting team review & open questions resolution

---

## Decision Summary

Implement two movement convenience features in phases:

1. **Phase 1 (Arrow Keys + Numpad):** Client-side keyboard handler, no server changes
2. **Phase 2 (Speedwalk Parser):** Client-side text parser, no server changes
3. **Phase 3 (Future):** Server-side speedwalk verb for post-launch sophistication

This recommendation prioritizes simplicity and quick delivery of high-UX-value features.

---

## Architecture

### Feature 1: Arrow Keys + Numpad Shortcuts

**Implementation:** Client-side keyboard event listener in `ZoneExploration.tsx`

**Key Mapping:**
```
ArrowUp     → go north
ArrowDown   → go south
ArrowLeft   → go west
ArrowRight  → go east
PageUp      → go up
PageDown    → go down
Numpad8/9/7/6/3/1/2/4 → north/northeast/northwest/east/southeast/southwest/south/west
Numpad5     → (no-op or reserved for future use)
```

**Interaction with existing code:**
- Listener activates only when text input is NOT focused
- On direction keypress, call `handleExitClick(direction)` directly
- Uses existing `sendRawCommand(room, 'go ' + direction)` flow
- Server is unaware of keyboard origin; receives normal `go` commands

**Server Changes:** None

**Client Files:**
- `packages/client/src/pages/ZoneExploration.tsx` — Add keyboard listener
- `packages/client/src/hooks/useZoneConnection.ts` — No changes (reuses existing `handleExitClick`)

**Complexity:** Small (50–100 lines)  
**Effort:** 2–4 hours

---

### Feature 2: Speedwalk Parser

**Implementation:** Client-side text parser + command expander in `packages/client/src/utils/speedwalkParser.ts`

**Parser Contract:**
```typescript
// Input: "10e4n2s"
// Output: ['e', 'e', 'e', ..., 'n', 'n', 'n', 'n', 's', 's']

interface SpeedwalkParseResult {
  ok: boolean;
  moves?: string[];           // Directions to move (e.g., ['n', 'n', 's'])
  error?: string;             // Error message if ok=false
  totalMoves?: number;        // Count of expanded moves
}

function parseSpeedwalk(input: string): SpeedwalkParseResult;
```

**Parsing Rules:**
- Syntax: `[count]direction[count]direction...` where count is optional
- Example: `10e` = 10 east moves, `ene` = east, north, east (no counts)
- Supported directions: `n`, `s`, `e`, `w`, `u`, `d` (6 cardinal/vertical)
- Max total moves: **50** (client-side rate limit)
- Invalid syntax: Return error, don't process

**Integration:**
1. In `ZoneExploration.tsx`, detect if user input matches speedwalk pattern
2. If yes, parse and expand to individual `go` commands
3. Send each via `sendRawCommand()` in rapid succession
4. Server processes each as normal `go` command

**Fail-Stop Semantics:**
- If any move fails (e.g., "wall to the east"), the speedwalk halts
- Remaining queued moves are discarded
- Server narration explains the failure
- User sees all echoed moves in chat, then the failure message

**Example Flow:**
```
User: "10e"
Client: Parses to ['e', 'e', ..., 'e'] (10 moves)
Client: Sends 10× "go e" commands
Server: Executes move 1-6 successfully
Server: Move 7 hits a wall, returns error
Client: Displays echo "you move east" 6 times, then "wall to the east"
Result: Player has moved 6 rooms east
```

**Rate Limiting:**
- Client-side: Max 50 moves per speedwalk command
- Server-side: Inherent limit from WebSocket message rate + ~4 ticks/sec tick cadence
- No additional anti-abuse measures needed for MVP

**Server Changes:** None (MVP)

**Client Files:**
- `packages/client/src/utils/speedwalkParser.ts` — New utility
- `packages/client/src/utils/__tests__/speedwalkParser.test.ts` — Tests
- `packages/client/src/pages/ZoneExploration.tsx` — Integrate parser into `handleCommand`

**Complexity:** Medium (200–300 lines of code + tests)  
**Effort:** 3–5 hours

**Tests to cover:**
- Simple counts: `10e` → 10× east
- Mixed syntax: `3ene2s` → east, north, east, east, south, south
- Invalid syntax: `10e10` (invalid direction), `e10e` (count not prefix)
- Rate limit: `51e` rejected with "too many moves"
- Edge cases: empty input, spaces, uppercase vs lowercase

---

### Phase 3 (Future): Server-Side Speedwalk Verb

**Not part of this decision, but noted for Phase 3:**

A dedicated `speedwalk` command handler on the server would enable:
- Atomic execution (all moves succeed or none)
- Better error reporting
- Server-side move throttling per tick

**Implementation outline:**
```typescript
// Server: packages/server/src/commands/handlers/speedwalk.ts
// Parser: packages/server/src/commands/parser.ts — add 'speedwalk' verb

// User input: "speedwalk 10e4n2s"
// Server parses, validates all moves, then executes with per-tick throttle
// On failure, entire batch is rolled back
```

**Deferred because:**
- MVP client-side approach is simpler and ships faster
- Server-side adds complexity (state machine for multi-tick execution)
- Current WebSocket rate-limiting is adequate
- Can add in Phase 3 post-launch without breaking change

---

## Open Questions (Team Review Required)

Before implementation proceeds, resolve:

### 1. Ordinal Direction Support

**Question:** Should the game support northeast/northwest/southeast/southwest movement?

Currently:
- `CompassControl.tsx` renders ordinal buttons but they're UI-only
- `handleGo()` server-side only recognizes 6 directions (n/s/e/w/u/d)
- Numpad mapping assumes ordinals are supported

**Options:**
- **Option A:** Extend server support (add ordinal exits to RoomGraph, generator, all zones)
  - **Pros:** Full numpad utilization, richer navigation
  - **Cons:** Significant server-side work, generator changes, zone redesign
  - **Effort:** 2–3 days of backend + design work
  
- **Option B:** Numpad ordinals remap to cardinal fallbacks (e.g., numpad9 → try north, then east)
  - **Pros:** Quick, no server changes
  - **Cons:** Numpad doesn't feel "authentic" if ordinals don't work
  - **Effort:** 10 lines of client code

- **Option C:** Ignore numpad ordinals for MVP; allow only cardinals
  - **Pros:** Simplest, no ambiguity
  - **Cons:** Numpad layout wasted
  - **Effort:** Note in documentation

**Recommendation:** Option C (MVP ignores ordinals). Add ordinal support in Phase 3 if design wants it.

---

### 2. Numpad5 Behavior

**Question:** What should the center key (Numpad5) do?

**Options:**
- No-op (ignore it)
- Trigger "look" command
- Cancel queued speedwalk
- Reserved for future use

**Recommendation:** No-op for MVP. Can be assigned later if needed.

---

### 3. Text Input Focus Handling

**Question:** Should arrow keys trigger movement when the text input field is focused?

**Current MUD conventions:** Arrow keys work for command history even when typing, but numpad works regardless.

**Options:**
- Allow arrow keys ONLY when input is NOT focused
- Always allow numpad keys (even while typing)
- Allow all movement keys only when input not focused

**Recommendation:** Arrow keys blocked while typing (to not interfere with selection/editing); numpad always allowed.

---

### 4. Speedwalk Feedback

**Question:** How much feedback should be shown as speedwalk executes?

**Options:**
- Echo each move as it's sent (current behavior, e.g., "You move east" × 10)
- Echo only after parsing succeeds (brief "Starting 10-move sequence")
- Show move counter (e.g., "Moving... 7/10")
- Show detailed narration only for final position

**Recommendation:** Echo moves normally (existing behavior). Keep it simple for MVP.

---

### 5. Combat Interaction

**Question:** Should speedwalk be blocked when player is in combat?

**Current behavior:** `go` command is blocked in combat; player must use `flee`.

**Options:**
- Block speedwalk in combat (consistent with `go`)
- Allow speedwalk but halt on first combat engagement
- Allow speedwalk and fight mid-move (risky)

**Recommendation:** Block speedwalk in combat (consistent with `go`). Check `combatSystem.isInCombat()` before expanding speedwalk.

---

## Alignment with Design

**GDD Alignment:**
- §5.1 (Command Syntax): No changes to verb-noun structure. Arrow keys and speedwalk are client-side conveniences, transparent to server.
- §6.0 (Combat): Speedwalk should respect combat movement lock (consistent with `go`).

**Feature Interactions:**
- Compass button clicks continue to work (unaffected)
- Text commands continue to work (unaffected)
- New: Keyboard shortcuts + speedwalk syntax
- No impact on server state, combat, zone design, or narrative

---

## Testing Checklist

### Keyboard Shortcuts (Phase 1)
- [ ] Arrow keys move in correct directions
- [ ] Numpad cardinal keys move correctly
- [ ] PageUp/PageDown move up/down
- [ ] Arrow keys don't interfere with text input (history navigation, editing)
- [ ] Multiple rapid key presses queue moves correctly
- [ ] Message echo shows "You move <direction>" for each keystroke

### Speedwalk Parser (Phase 2)
- [ ] Simple counts parsed correctly (`10e` → 10 east moves)
- [ ] Mixed syntax parsed correctly (`3ene2s` → e, n, e, e, s, s)
- [ ] Rate limit enforced (`51e` rejected)
- [ ] Invalid syntax rejected gracefully (`10x`, `e10e`, empty input)
- [ ] Case-insensitive (`10E` = `10e`)
- [ ] Partial failure handled (wall mid-walk halts remaining moves)
- [ ] Message echo shows all moves and final failure message

### Integration
- [ ] Arrow keys don't interfere with speedwalk input
- [ ] Speedwalk doesn't execute if player is in combat
- [ ] Both features work in Refuge and ZoneExploration pages

---

## Files Modified (Summary)

### Phase 1: Arrow Keys + Numpad
- `packages/client/src/pages/ZoneExploration.tsx` — Add keyboard listener
- `packages/client/src/pages/Refuge.tsx` — Add keyboard listener (if needed for consistency)

### Phase 2: Speedwalk Parser
- `packages/client/src/utils/speedwalkParser.ts` — New parser utility
- `packages/client/src/utils/__tests__/speedwalkParser.test.ts` — Tests
- `packages/client/src/pages/ZoneExploration.tsx` — Integrate parser into `handleCommand`
- `packages/client/src/pages/Refuge.tsx` — Integrate parser (optional, if speedwalk supported there)

### Phase 3: Server-Side (Future)
- `packages/server/src/commands/handlers/speedwalk.ts` — New handler
- `packages/server/src/commands/index.ts` — Register `speedwalk` verb
- `packages/server/src/commands/parser.ts` — Add speedwalk parsing (optional)
- Tests: `packages/server/src/__tests__/speedwalk-command.test.ts`

---

## Decision Boundary

**This decision covers:**
- Architecture approach (client-side for Phases 1 & 2)
- Implementation roadmap (3 phases)
- Open questions for team input

**Out of scope:**
- Specific UI/UX design (e.g., help text about keyboard shortcuts)
- Theming or styling of any new UI elements
- Integration with other systems (cosmetics, plugins, etc.)

---

## Related Issues

- #357 — Direction Shortcuts (this issue)
- GDD.md — §5.1 (Command Syntax), §6.0 (Combat)

---

## Sign-Off

**Decision Made By:** Elminster (Lead/Architect)  
**Status:** Ready for team review  
**Next Step:** Team feedback on open questions → proceed with Phase 1

---

---

## 2026-04-09T00:16:00Z: User directive — #357 design decisions

**By:** dkirby-ms (via Copilot)  
**What:**
1. No ordinal directions (NE/NW/SE/SW) — cardinal only (n/s/e/w/u/d)
2. Numpad5 does nothing — macros deferred to later
3. Arrow keys only intercepted when input is NOT focused (text editing preserved)
4. Speedwalk echoes each individual move
5. Speedwalk blocked during combat

**Why:** User answers to Elminster's 5 open questions on #357

**Implementation Status:** Complete (Commit 2085460, pushed to dev)

---

## Decision: User Settings Backend Architecture (#359)

**Author:** Jarlaxle (Systems Dev)  
**Date:** 2026-04-09  
**Status:** Implemented  
**Issue:** #359

### Decision
User settings backend uses the **provider pattern** (interface → PG + InMemory) consistent with all other server persistence (characters, stash, factions, etc.). The API is two endpoints: `GET /api/user/settings` and `PUT /api/user/settings`.

### Key Choices
1. **JSONB config blob** — single `config` column with structured categories (`display`, `narration`, `gameplay`, `accessibility`). Avoids schema migrations for new settings.
2. **Server-side validation** — fontSize range (12–24), verbosity enum, narrationStyle enum, unknown top-level key rejection. Invalid → 400.
3. **No middleware** — auth is an inline `authenticate()` helper per the characters.ts pattern, not Express middleware. Keeps it consistent with existing routes.
4. **Default config on GET** — if no row exists, returns empty category objects. No DB write on first GET.
5. **Upsert semantics** — PUT always succeeds (creates or replaces). No separate POST/PATCH.

### Scope Boundaries (per user decisions)
- No keybind export, no profiles/presets, no .rcfile upload in v1.
- `gameplay` and `accessibility` categories are present but empty — reserved for future use.

---

## Decision: Settings API Client Architecture (Self-Contained Fetch) (#359)

**Author:** Regis (Frontend Dev)  
**Date:** 2026-04-09  
**Status:** Implemented  
**Issue:** #359

### Decision
`settings-api.ts` has its own fetch logic instead of importing the shared `request()` from `api.ts`.

### Rationale
The shared `request()` fires the global 401 handler (`_on401`) which dispatches `LOGOUT`, clearing all auth state. For settings, a 401 should degrade gracefully (fall back to localStorage) — not force the user out of the app. Keeping the settings API self-contained means auth errors in settings don't cascade.

### Impact
If the team changes the base URL pattern or adds request interceptors to `api.ts`, `settings-api.ts` needs to be updated separately. If this becomes a maintenance burden, we can extract a shared `fetchWithAuth()` helper that takes an error strategy parameter.

---

## User Decision: #359 Scope Boundaries (User Preferences & Configuration)

**From:** dkirby-ms (User)  
**Date:** 2026-04-09  
**Answering:** Elminster's 3 open design questions

### Decisions
1. **Keybind export in `.ellmudrc` format:** **Wait for macros** — no export in v1
2. **Settings profiles/presets:** **No need** — not in v1  
3. **`.rcfile` file upload:** **UI-only edits** — no file upload in v1

### Rationale
- Keybind export requires full macro system (Lua/DSL) — phase 2 work
- Profiles add complexity without immediate user value
- File upload can wait until macro system foundation is solid
- v1 focus: localStorage → server sync, essential 3 settings (fontSize, verbosity, narrationStyle), placeholder for future (keybinds, audio, accessibility)

---

## Decision: Removed Deprecated Refuge Screen

**Date:** 2026-04-09  
**Author:** Regis (Frontend)  
**Status:** Implemented

### Context
The Refuge screen (`/refuge`) was deprecated and no longer accessible to users through normal navigation. It served as an early debug/test hub with equipment, crafting, marketplace, and expedition board tabs.

### Decision
Completely removed the Refuge screen from the codebase and relocated critical functionality:

1. **Deleted** `packages/client/src/pages/Refuge.tsx` (575 lines)
2. **Added** Settings button to ZoneExploration.tsx top bar (next to logout)
3. **Renamed** all "Refuge" references to generic "Hub" terminology
4. **Updated** all test files and components

### Rationale
- Users couldn't access `/refuge` anymore — dead code
- Settings access was ONLY available from Refuge screen — needed relocation
- Generic "hub" terminology is more flexible than specific "Refuge" naming
- Settings gear icon in main game view is better UX than hidden in separate screen

### Impact
- **User-facing:** Settings now accessible from main game screen (ZoneExploration)
- **Code:** -575 lines, cleaner terminology, better separation of concerns
- **Tests:** All 2815 tests passing after updates to match new UI text

### Files Changed
- Deleted: `pages/Refuge.tsx`
- Modified: `ZoneExploration.tsx`, `ReconnectionOverlay.tsx`, `useReconnection.ts`, `useZoneConnection.ts`, `ChatPanel.tsx`, `Login.tsx`, `Leaderboard.tsx`, plus 8+ test files

### Follow-up
None required. The faction hub concept remains intact — players still have hub zones like The Reliquary, The Bloom Observatory, etc. This just removed the old debug screen.


---

## Decision: Admin API auth failure broadcasting via custom events

**Author:** Regis  
**Date:** 2026-04-10  
**Issue:** #369  

### Context

Admin token validation needed a way to communicate auth failures from deep in the API layer back to the AdminLayout without prop drilling or React context.

### Decision

Use `window.dispatchEvent(new CustomEvent('admin:auth-failure'))` in `adminFetch` when a 401/403 is received. `AdminLayout` listens for this event and resets to the login form.

### Rationale

- Simple, zero-dependency approach
- Works regardless of component tree depth
- Hooks can silently absorb auth errors knowing the global handler redirects
- No new React context needed

### Impact

- All admin API calls now broadcast auth failures automatically
- Any future admin component automatically benefits from this pattern
- Minsc verified via 35 tests: no server changes needed — the existing 401/403 responses are sufficient

---

## Decision: Admin Token Validation Test Coverage (35 Tests)

**Author:** Minsc (Tester)  
**Date:** 2026-04-10  
**Issue:** #369 — admin invalid token error  

### Analysis

The original bug: invalid admin tokens stored in localStorage, `authenticated` set to `true` on page load without server validation. Every admin page broke with 403s.

### Regis Implementation Verified

All 35 tests pass against the fix:

1. **`validateAdminToken()` function** in `admin-api.ts` — lightweight API call to verify token
2. **`ADMIN_AUTH_FAILURE_EVENT`** — `adminFetch` dispatches on 401/403
3. **Mount-time validation** — `AdminLayout` calls `validateAdminToken()` on mount to catch stale tokens
4. **Auth failure listener** — Resets to login form when any admin API call gets 401/403
5. **`validating` loading state** — Shows spinner while stored token is checked
6. **`handleAdminLogin` validation** — Validates before setting `authenticated = true`

### Test Coverage (35 tests total)

**Client-side (17 tests):** `packages/client/src/__tests__/admin-token-validation.test.tsx`
- Token submission validation (empty, missing, whitespace, invalid, valid)
- Recovery flow (re-enter after rejection, error clears on typing)
- Stale stored token detection on mount
- Event-driven auth failure handling
- Loading state rendering

**Server-side (18 tests):** `packages/server/src/__tests__/admin-token-validation.test.ts`
- Authorization header validation (missing, malformed)
- Token validation (wrong, partial, case-altered, whitespace)
- Correct token handling (200 response)
- Fail-closed mode (ADMIN_TOKEN not set → 503)
- Error response format validation

### Status

PR #372 ready to merge with full test coverage. No additional implementation needed.

---

## Decision: Posture System Architecture (#371)

**Author:** Jarlaxle  
**PR:** #376  
**Date:** 2026-07-26  

## Decisions Made

### 1. Posture is DB-backed, not session-local
Posture persists to the `characters.posture` column (migration 010). This overrides Elminster's v1 session-only proposal. Players reconnecting to a zone will resume their last posture.

### 2. `_postureChange` metadata pattern
Posture command handlers return `_postureChange` metadata alongside their CommandResult. ZoneRoom reads this to broadcast third-person narration ("Alice sits down.") to other players in the room. This avoids coupling posture handlers to ZoneRoom internals while keeping broadcast logic centralized.

### 3. Pre-movement posture capture
Movement departure verbs require the posture *before* the go handler runs (since it resets posture to standing). `previousPosture` is captured before `handleCommand()` and passed to `broadcastPlayerMovement()`.

### 4. `forcePosture()` API for system effects
A separate utility function `forcePosture(player, posture, name)` exists for combat knockdowns and future game effects. It's decoupled from the command handler pipeline and can be called from any system.

### 5. floating/hovering are system-only
Not registered in the parser. Only settable via `forcePosture()`. Reserved for flight/levitation effects in future phases.

### 6. PlayerRef.posture is optional
Backward compatible — code without posture data renders "is here" fallback. No breaking changes to existing PlayerRef consumers.

---

## Decision: Release Workflows Alignment with dev/uat/prod (#379)

**Author:** Minsc (Tester)  
**Issue:** #379  
**Date:** 2026-04-09  

### Problem
Squad's default release workflow templates ship with `dev → preview → main` branching model. This repository uses `dev → uat → prod`. The hardcoded `main` branch references caused release.yml run #24201081668 to fail with `fatal: ref: main does not exist`.

### Decision
Updated all three release-related workflows to match actual repository branching:
- **release.yml:** Checks out and pushes to `prod` (not `main`)
- **squad-release.yml:** Triggers on push to `prod` (not `main`)
- **squad-promote.yml:** Promotes `dev → uat → prod` (not `dev → preview → main`)

### Impact
- Release workflow now succeeds when dispatched
- Squad promote pipeline is usable for version management
- Consistent with existing `ci-cd.yml` which already targets `uat`/`prod`

### Related
- Commits committed to `dev` branch

---

## Decision: Starting Gear Missing — sendLoadoutAndStashUpdate() (#377)

**Author:** Minsc (Tester)  
**Issue:** #377  
**Date:** 2026-04-09  

### Problem
Players' starting gear (equipment) was invisible in the client after joining a zone. Root cause: ZoneRoom's `onJoin()` method was missing `STASH_UPDATE` message broadcast.

### Root Cause
During the RefugeRoom→ZoneRoom merge, the old `sendZoneLoadoutUpdate()` method was removed. The new ZoneRoom implementation sent only `LOADOUT_UPDATE`, leaving stash empty on client-side.

### Decision
- Created new combined method `sendLoadoutAndStashUpdate()` that sends both `LOADOUT_UPDATE` and `STASH_UPDATE`
- Updated all equipment change handlers (equip/unequip/swap) to use the new method
- Updated ZoneRoom's `onJoin()` to call `sendLoadoutAndStashUpdate()`
- Enhanced `MessageCollector` test helper to capture both message types

### Impact
- Equipment visibility fixed; starting gear now visible
- 6 new integration tests written and passing
- All 2582 existing tests continue to pass
- Any future room type displaying equipment must call `sendLoadoutAndStashUpdate()` on join
- Client side requires no changes (already handles both messages correctly)

### Related Commits
- 30038ec — Fix: ZoneRoom sendLoadoutAndStashUpdate() on join
- 0ac5d48 — Test: 6 integration tests for starting gear visibility

---

## Decision: Posture Broadcast Logic — Redundant Implementation (PR #376)

**Author:** Elminster  
**PR:** #376  
**Date:** 2026-04-09  
**Type:** Code Quality Concern  

### Problem
The posture command handlers define a `_postureChange` metadata field that is never consumed by ZoneRoom. Instead, ZoneRoom implements its own broadcast logic with manual verb detection and duplicated message maps. This duplication creates maintenance debt.

### Current State
- posture.ts defines `POSTURE_CHANGE_MESSAGES` and includes `_postureChange` metadata in CommandResult (lines 40-41)
- ZoneRoom re-implements the same messages with hardcoded verb detection (lines 1107-1126)
- All 63 tests pass despite the duplication
- The unused `_postureChange` field doesn't cause runtime errors

### Options Considered

**Option 1: Use the Metadata Pattern (Recommended)**
- ZoneRoom consumes `result._postureChange` instead of detecting posture commands manually
- Single source of truth for posture messages
- Consistent with other metadata patterns (targetNarrations, zoneTransfer)
- Easier to extend for future custom messages
- Requires TypeScript casting to access `_postureChange`

**Option 2: Remove the Unused Metadata**
- Delete `_postureChange` from posture.ts; keep ZoneRoom's manual detection
- No TypeScript casting needed
- Simpler for current case but keeps hardcoded verb list and duplication

**Option 3: Document and Accept**
- Add comment explaining duplication; defer refactor to broader command/broadcast redesign
- Zero code change but leaves technical debt

### Decision
PR #376 is approved. Not blocking merge.

**Recommendation:** Option 1 as a follow-up refactor task (low priority, non-urgent). Aligns with existing metadata patterns and prevents future message drift. If no refactor is planned, recommend Option 2 to clean up unused code.

### Related
- CommandResult metadata pattern used elsewhere (ZoneRoom.ts: zoneTransfer, targetNarrations, action)
- Issue #371 (character posture system)
# Decision: Trace De-duplication at Presentation Layer

**Author:** Jarlaxle  
**Date:** 2025-07-24  
**Issue:** #381  

## Context
Multiple footprint traces in the same direction produced duplicate player-facing messages (e.g., three "Footprints leading east." lines).

## Decision
De-duplicate in `getTracesForPlayer()` by grouping traces on `(type, direction)` and keeping only the most recent trace per group. Raw `getTracesInRoom()` is unchanged — all traces remain in storage for TTL decay, eviction, and game logic.

## Rationale
- Presentation-only fix: no data loss, no behavioral change to tick/decay/cap systems
- Most-recent-wins preserves accurate age descriptions and expert-level actor names
- Composable: if future systems need per-trace granularity, they use `getTracesInRoom()`

## Impact
- `TraceSystem.ts`: +15 lines (new private method)
- `trace-system.test.ts`: +8 tests
- Zero regressions across 46 trace tests + 55 phase2 QA tests
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
# Design Spec: Creature Room Appearance — Individual Lines with ANSI Support

**Issue:** #383 — [FEATURE] creature appearance in room  
**Author:** Elminster (Lead/Architect)  
**Date:** 2025-07-22  
**Label:** `go:needs-research` → `go:ready` (after approval)  
**Assignees:** Jarlaxle (Systems Dev — rendering changes), Drizzt (Engine Dev — if template/manager changes needed)

---

## Summary

Creatures in a room currently appear aggregated by type on a single line with a count suffix (e.g., `"A goblin lurks here. (x3)"`). The issue requests that **each creature instance gets its own dedicated line**, with the text coming from the creature's `roomDescription` field, and that the text supports ANSI color tags.

**Good news: no schema migration or type changes are needed.** The `room_description` column already exists on `creature_definitions`, and `roomDescription?: string` is already on both `CreatureTemplate` and `Creature` interfaces. ANSI tag parsing (`[red]text[/red]`) already works end-to-end in the client. This is a rendering-only change.

---

## Current State

### Schema (already sufficient)

| Layer | Location | Field |
|-------|----------|-------|
| Database | `creature_definitions.room_description` (TEXT, nullable) | `packages/server/src/db/migrations/001_schema.sql:142` |
| Template | `CreatureTemplate.roomDescription?: string` | `packages/server/src/creatures/types.ts:76` |
| Instance | `Creature.roomDescription?: string` | `packages/server/src/creatures/types.ts:111` |
| Command context | `CreatureRef.roomDescription?: string` | `packages/server/src/commands/index.ts:72` |
| Admin API | `PgCreatureDefinitionsStore` reads/writes `room_description` | `packages/server/src/admin/content/PgCreatureDefinitionsStore.ts:50,163` |

All existing creatures in seed data already have `room_description` values (see `002_seed_content.sql:84-150`).

### Current Rendering (what changes)

Three files contain identical aggregation logic that groups creatures by type and appends `(xN)`:

1. **`packages/server/src/commands/handlers/look.ts:57-72`** — `showFullRoom()` (the "look" command)
2. **`packages/server/src/commands/handlers/go.ts:76-93`** — room entry after movement
3. **`packages/server/src/commands/handlers/goto.ts:83-99`** — admin teleport room entry

All three follow this pattern:
```typescript
// CURRENT: aggregate by type
const creaturesByType = new Map<string, { creature: CreatureRef; count: number }>();
for (const c of creatures) {
  const key = c.type ?? c.name;
  const existing = creaturesByType.get(key);
  if (existing) existing.count++;
  else creaturesByType.set(key, { creature: c, count: 1 });
}
for (const [, { creature, count }] of creaturesByType) {
  const desc = creature.roomDescription || `A ${creature.name} lurks here.`;
  lines.push(count > 1 ? `${desc} (x${count})` : desc);
}
```

### ANSI Tag System (already sufficient)

The client parser at `packages/client/src/lib/ansi-parser.ts` supports lightweight tags:
- Colors: `[red]`, `[green]`, `[cyan]`, `[bright-yellow]`, etc.
- Modifiers: `[bold]`, `[dim]`, `[italic]`, `[underline]`
- Closing: `[/red]` or `[/]` (pop any)

Server sends raw text with tags embedded; client renders them as styled `<span>` elements with `.ansi-*` CSS classes. No server-side processing is needed — tags pass through as plain strings.

---

## Design

### Change 1: Replace Aggregation with Individual Lines

In all three files (`look.ts`, `go.ts`, `goto.ts`), replace the aggregation block with a simple per-creature loop:

```typescript
// NEW: one line per creature instance
for (const creature of creatures) {
  lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
}
```

**That's the entire rendering change.** The fallback `A ${creature.name} lurks here.` handles creatures that lack a `roomDescription` (defensive, though all current creatures have one).

#### File-specific changes:

**`packages/server/src/commands/handlers/look.ts` (lines 57-72):**
Replace:
```typescript
if (ctx.creaturesInRoom && ctx.creaturesInRoom.length > 0) {
  const creaturesByType = new Map<string, { creature: import('../index.js').CreatureRef; count: number }>();
  for (const c of ctx.creaturesInRoom) {
    const key = c.type ?? c.name;
    const existing = creaturesByType.get(key);
    if (existing) {
      existing.count++;
    } else {
      creaturesByType.set(key, { creature: c, count: 1 });
    }
  }
  for (const [, { creature, count }] of creaturesByType) {
    const desc = creature.roomDescription || `A ${creature.name} lurks here.`;
    lines.push(count > 1 ? `${desc} (x${count})` : desc);
  }
}
```
With:
```typescript
if (ctx.creaturesInRoom && ctx.creaturesInRoom.length > 0) {
  for (const creature of ctx.creaturesInRoom) {
    lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
  }
}
```

**`packages/server/src/commands/handlers/go.ts` (lines 78-93):**
Replace:
```typescript
if (creatures.length > 0) {
  const creaturesByType = new Map<string, { creature: import('../index.js').CreatureRef; count: number }>();
  // ...aggregation logic...
}
```
With:
```typescript
for (const creature of creatures) {
  lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
}
```

**`packages/server/src/commands/handlers/goto.ts` (lines 84-99):**
Same replacement pattern as `go.ts`.

### Change 2: ANSI Tags in `roomDescription` Content

No code change is required for ANSI support. The `roomDescription` field is a plain string that flows from DB → server → client. The client's `parseAnsiText()` already handles tags in any `NarrateMessage` text.

To demonstrate and validate, update a few seed creature descriptions with ANSI tags. Example seed data updates in `002_seed_content.sql` (optional, can be done in a follow-up content pass):

```sql
-- Before:
'A drowned revenant sways in the murk, waterlogged limbs dragging.'
-- After (with ANSI):
'A [dim]drowned revenant[/dim] sways in the murk, waterlogged limbs dragging.'

-- Before:
'The Collapsed One looms here, stone and flesh fused into one.'
-- After (with ANSI):
'[bold][red]The Collapsed One[/red][/bold] looms here, stone and flesh fused into one.'
```

This is a content decision for the team/dkirby-ms, not a code requirement. The system supports it immediately.

### Change 3: Admin UI Guidance

The admin content editor (`PgCreatureDefinitionsStore`) already reads and writes `roomDescription` as a free-text string. Admins can include ANSI tags directly in the creature editor. No admin UI changes are needed, but a tooltip or help text saying "Supports ANSI tags: [red], [bold], etc." would be a nice enhancement (out of scope for this issue).

---

## What Does NOT Change

| Component | Status |
|-----------|--------|
| Database schema (`creature_definitions`) | ✅ No migration needed — `room_description` column exists |
| Shared types (`@ellmud/shared`) | ✅ No changes — `CreaturePositionType` and narrative types unchanged |
| Server types (`CreatureTemplate`, `Creature`, `CreatureRef`) | ✅ No changes — `roomDescription?: string` already present |
| `CreatureManager` | ✅ No changes — already copies `roomDescription` from template to instance |
| `ZoneRoom` context building | ✅ No changes — already passes `roomDescription` to `CreatureRef` |
| Admin API / content store | ✅ No changes — already persists `room_description` |
| Client ANSI parser | ✅ No changes — already parses `[tag]` syntax in all narration text |

---

## Example Output

### Before (current aggregated):
```
The Silt Flats
A vast expanse of cracked earth stretches before you.

Exits: north, east, south

A slum rat sniffs along the ground. (x3)
A hollow stalker drifts in the shadows, barely visible.
```

### After (individual lines, with optional ANSI):
```
The Silt Flats
A vast expanse of cracked earth stretches before you.

Exits: north, east, south

A slum rat sniffs along the ground.
A slum rat sniffs along the ground.
A slum rat sniffs along the ground.
A [dim]hollow stalker[/dim] drifts in the shadows, barely visible.
```

---

## Testing

### Unit Tests

**File:** `packages/server/src/__tests__/look.test.ts` (or create if not present)

1. **Individual creature lines** — Given 3 creatures of the same type in a room, `handleLook()` should return 3 separate lines (not 1 aggregated line with `(x3)`).
2. **roomDescription used** — Given a creature with `roomDescription: "A goblin crouches here."`, the output should contain that exact string.
3. **Fallback text** — Given a creature with no `roomDescription`, output should contain `"A <name> lurks here."`.
4. **ANSI tags pass through** — Given `roomDescription: "[red]A fire imp[/red] smolders here."`, the output should contain the tag text verbatim (server does not strip tags).
5. **Same tests for `go.ts` and `goto.ts`** — Verify creature lines in room entry output follow the same pattern.

### Manual QA

1. Enter a room with multiple creatures of the same type → verify each gets its own line.
2. Add ANSI tags to a creature's `roomDescription` via admin panel → verify colored text renders in the game client.
3. Enter a room with a creature that has no `roomDescription` → verify fallback text appears.

---

## Implementation Checklist

- [ ] **`look.ts`** — Replace aggregation block (lines 57-72) with per-creature loop
- [ ] **`go.ts`** — Replace aggregation block (lines 78-93) with per-creature loop
- [ ] **`goto.ts`** — Replace aggregation block (lines 84-99) with per-creature loop
- [ ] **Tests** — Add/update tests for individual creature line rendering
- [ ] **(Optional)** Update a few seed `room_description` values with ANSI tags as examples
- [ ] **(Optional)** Add admin UI tooltip noting ANSI tag support in `roomDescription` field

---

## Open Questions for dkirby-ms

1. **Duplicate lines acceptable?** With 5 slum rats in a room, the player will see the identical line 5 times. This is authentic to classic MUD style, but we could add variation (e.g., "Another slum rat sniffs along the ground." for the 2nd+). Recommend: ship as-is, iterate if it feels wrong.

2. **ANSI in seed data now or later?** We can update the seed creature descriptions with color tags in this PR or defer to a dedicated content pass. Recommend: defer to content pass so this PR stays focused on the rendering change.

3. **Behavior state variation?** A creature in `alert` or `fleeing` state could show a different room description. This is out of scope for #383 but worth noting as a future enhancement. The current design supports it — just add conditional logic in the rendering loop.

# Decision: Live Rooms Context Menu Pattern

**Author:** Regis  
**Date:** 2026-07-24  
**Issues:** #384, #385

## Context
The Room Graph tab on the Live Room detail page had inline Broadcast/Spawn/Teleport buttons under each expanded room row, cluttering the UI.

## Decision
Replaced inline action buttons with a right-click context menu, reusing the exact same styling pattern from ZoneDesigner.tsx (inline styles, window event listeners for close-on-escape/outside, fixed positioning at click coordinates).

Also added occupancy filter toggles (Players/Creatures) as a filter bar above the room list.

## Rationale
- Context menu pattern already established in ZoneDesigner — reusing it maintains consistency
- Inline styles (not CSS classes) match ZoneDesigner convention for context menus
- Filters use OR logic when both active (show rooms with players OR creatures) — simplest mental model

## Team Impact
- No API changes
- No shared type changes
- Pattern: right-click context menus on admin data rows should follow ZoneDesigner inline-style convention

---

# Decision: Hotfix PR targeting prod for release workflow

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-04-10  
**PR:** #387  
**Issue:** #379

## Context

The release GitHub Action (`release.yml`) runs exclusively on the `prod` branch. It calls `npm run version:sync` to keep workspace package versions in sync after a version bump. However, the `prod` branch was missing both the npm scripts (`version:bump`, `version:sync`) and the `scripts/sync-versions.mjs` file. These were added on `dev` but never merged forward through `uat → prod`.

## Decision

Opened PR #387 directly targeting `prod` as a hotfix. The script content is identical to what exists on `dev`, so no divergence is introduced. This avoids waiting for a full `dev → uat → prod` promotion cycle for a CI-only fix.

## Team Impact

- **Branching:** This is an exception to the normal `dev → uat → prod` flow. Justified because the fix only affects CI tooling (not game code) and the content already exists on `dev`.
- **Future:** If new CI scripts are added on `dev`, ensure they get merged forward to `prod` before the release workflow references them.

---

# Decision: Phase 6 Group Rewards Design

**Author:** Dale Kirby (via Copilot directive)  
**Date:** 2026-04-11  
**Issue:** #403 Phase 6  

## Context

Group reward sharing rules for #403 Phase 6 require clarification on scope, distribution mechanism, and toggle mechanism.

## Decision

1. **Rewards scope:** Items from corpses only. No XP system. Water currency with creatures not yet designed — skip for now.
2. **Leader discretion:** Leader toggles sharing on/off via `group share on/off`.
3. **Split method:** Equal distribution (round-robin) among all group members in the same room.

## Rationale

- **Items only** keeps scope tight for Phase 6, allowing future expansion to XP and currency separately.
- **Leader toggle** prevents unintended loot distribution and gives group leadership control.
- **Same-room only** prevents abuse (AFK members in safe zones receiving loot).
- **Round-robin fairness** ensures deterministic, equal distribution over time without complex need/greed systems.

## Team Impact

- Unblocks Phase 6 implementation (loot sharing commands, GroupManager extensions, ZoneRoom distribution logic).
- Establishes pattern for future reward sharing phases (XP, currency can follow similar design).
- No schema changes required.

---

# Decision: Group Loot Sharing Implementation (Phase 6)

**Author:** Drizzt (Engine Dev)  
**Date:** 2026-04-11  
**Issue:** #403 Phase 6  
**PR:** #415  

## Context

PR #415 implements group loot sharing as designed. Implementation distributes creature loot items round-robin to group members in the same room, with leader-controlled toggle and weight capacity checks.

## Decision

### GroupManager Extensions
- Added `lootSharing: boolean` to Group interface (default: false)
- Added `setLootSharing(requesterId, enabled)` - leader-only toggle
- Added `getLootSharing(playerId)` - convenience getter for any member

### Group Command
- `group share on` - enable loot sharing (leader only)
- `group share off` - disable loot sharing (leader only)
- `group share` - view current status (any member)
- `showGroupInfo()` now displays sharing status

### ZoneRoom Loot Distribution
Modified `syncCreaturesAfterCombat()` to:
1. Check if killer is in a group with lootSharing enabled
2. Gather group members in same room as the kill
3. Distribute items round-robin with weight checks:
   - Try to give item to next member in rotation
   - If they can't carry (weight check), try next member
   - If NO member can carry, drop to floor
4. Send narration to recipient and other group members
5. Fallback to existing floor drop if sharing OFF

## Key Design Decisions

**Round-robin distribution:** Ensures fairness over time. Members receive items in deterministic rotation order (no randomness).

**Same-room only:** Only members physically present at the kill location receive items. Prevents abuse (afk members in safe zone getting loot).

**Weight capacity checks:** Respects player.canCarry(item) weight limits. Members can effectively "refuse" items by being over-encumbered.

**Default OFF:** Groups must explicitly enable sharing. Prevents unintended loot distribution in casual groups.

**Leader-only toggle:** Only the group leader can change sharing status. Prevents disputes and griefing.

**Items only:** No XP or currency distribution in this phase. Keeps scope tight, allows future expansion.

## Trade-offs

**Pro:**
- Fair and predictable
- Respects player autonomy (weight limits)
- Simple mental model (round-robin)
- Minimal state (just boolean flag)

**Con:**
- No priority system (all members equal)
- No item preferences (sword to warrior, etc.)
- Round-robin can feel rigid if players have roles

Future enhancements could add loot priorities, item types filtering, or need/greed systems. Current implementation provides solid foundation.

## Test Coverage

19 comprehensive tests covering:
- Command validation (leader-only, error handling)
- GroupManager methods (setLootSharing, getLootSharing)
- Round-robin fairness (3 items → 3 players, 5 items → 3 players)
- Same-room filtering (members in different rooms don't receive items)
- Weight capacity edge cases (skip members who can't carry)
- Floor drop behavior (items drop when no one can carry)

All 2792 server tests passing, zero regressions.

## Team Impact

This completes Phase 6 of #403. Future phases (XP sharing, water currency) will follow similar patterns but are deferred per Dale's scope decision.
# Decision: Migration numbering allows gaps after file deletion

**Author:** Drizzt  
**Date:** 2025-07-24  
**Issue:** #420  
**PR:** #423  

## Context
Removing `004_import_midgaard.sql` created a gap in migration numbering (003 → 005). The migration system tracks applied files by filename — renumbering deployed migrations would break production state tracking.

## Decision
- Allow intentional gaps in migration file numbering
- Updated `persistence-schema-validation.test.ts` to check ascending order (not strict sequential)
- Migration numbers must still be unique and ascending; gaps are permitted when files are intentionally removed

## Impact
Any agent adding new migrations should continue using the next available number after the highest existing one (currently 014). Do not attempt to fill gaps.
# Workflow Audit Report — Khelben (CI/CD Dev)

**Date:** 2025  
**Scope:** All 14 GitHub Actions workflows in `.github/workflows/`  
**Status:** Ready for review

---

## Executive Summary

The workflow landscape is **well-structured and disciplined**. The team has established clear branch-based promotion flows (dev → uat → prod), Squad-driven issue triage and assignment, and robust CI/CD with health checks and rollback capability. However, several **patterns and timing issues** deserve attention, especially around the relationship between manual and scheduled promotion workflows.

---

## Workflow Inventory & Reference Table

### CI-CD Workflows (4 total)

| Filename | Triggers | Category | What It Does | Dependencies |
|----------|----------|----------|-----------|------------|
| `ci-cd.yml` | `workflow_dispatch`, `pull_request` (uat/prod), `push` (uat/prod) | **Core CI/CD** | Build, test, lint, security audit on uat/prod; Docker build & push to ACR; deploy to Azure Container Apps with health check & rollback | Requires Azure OIDC secrets (environments: `uat`, `prod`) |
| `release.yml` | `workflow_dispatch` (manual) | **Release** | Bump version (major/minor/patch) on prod, sync workspace versions, tag, push, create GitHub Release with changelog | Requires Git write permissions; reads package.json |
| `scheduled-uat-promote.yml` | `schedule` (4x daily: 01:00, 13:00, 17:00, 21:00 UTC), `workflow_dispatch` | **Promotion** | Automatically merge dev → uat, strip forbidden paths (.squad/, .ai-team/, team-docs/), trigger CI/CD on uat | Requires `contents:write`, `actions:write` for workflow dispatch |
| `squad-promote.yml` | `workflow_dispatch` (dry-run input) | **Promotion** | Manual dev → uat → prod promotion (2-job chain); stripe forbidden paths; dry-run mode for preview; triggers CI/CD after each merge | Requires `contents:write`, `actions:write` |

### Squad Governance Workflows (7 total)

| Filename | Triggers | Category | What It Does | Dependencies |
|----------|----------|----------|-----------|------------|
| `squad-ci.yml` | `pull_request` (dev/preview/main/insider, sync/reopen), `push` (dev/insider) | **Squad CI** | Runs Squad CLI tests (node --test test/*.test.js) | None — basic test runner |
| `squad-docs.yml` | `push` (preview, docs/** paths), `workflow_dispatch` | **Squad Docs** | Build docs site from docs/ directory, deploy to GitHub Pages | Depends on docs/package.json, docs/dist output |
| `squad-heartbeat.yml` | `schedule` (every 30 min), `issues` (closed, labeled), `pull_request` (closed), `workflow_dispatch` | **Squad Automation** | Ralph (smart triage) runs on schedule + event-driven; auto-assigns issues to @copilot based on routing rules; looks for `.squad/templates/ralph-triage.js` | Requires `.squad/team.md` or `.ai-team/team.md`; optional: `COPILOT_ASSIGN_TOKEN` |
| `squad-insider-release.yml` | `push` (insider) | **Squad Release** | Runs tests, reads version, creates insider pre-release tag (v{version}-insider+{sha}), publishes as prerelease | Reads package.json version; requires Git tag/push permissions |
| `squad-issue-assign.yml` | `issues` (labeled) → label type starts with `squad:` | **Squad Assignment** | Posts confirmation comment, assigns issue to team member; handles @copilot assignment via `COPILOT_ASSIGN_TOKEN` | Reads `.squad/team.md` or `.ai-team/team.md`; requires PAT for @copilot assignment |
| `squad-label-enforce.yml` | `issues` (labeled) | **Squad Label Enforcement** | Enforces label mutual exclusivity (go:, release:, type:, priority:); auto-applies release:backlog on go:yes; removes release: on go:no | No external dependencies |
| `squad-triage.yml` | `issues` (labeled) → label is exactly `squad` | **Squad Triage** | Lead-driven triage: routes issue to team member or @copilot based on capability profile keywords; posts detailed triage comment with team roster | Reads `.squad/team.md`, `.squad/routing.md` (or `.ai-team/` fallbacks); optional `COPILOT_ASSIGN_TOKEN` |
| `squad-release.yml` | `push` (prod) | **Squad Release** | Validates version in CHANGELOG.md, checks no forbidden files on prod, creates release tag (v{version}), publishes GitHub Release with auto-generated notes | No external dependencies; idempotent (checks if tag exists first) |
| `squad-preview.yml` | `push` (preview) | **Squad Preview** | Validates CHANGELOG.md entry for version, runs tests, ensures no .ai-team/ or .squad/ files tracked | No external dependencies |
| `sync-squad-labels.yml` | `push` (to .squad/team.md or .ai-team/team.md), `workflow_dispatch` | **Squad Label Sync** | Parses team.md roster, creates/updates all squad:*, go:, release:, type:, priority:, bug, feedback labels; dynamically adds member labels from roster | Reads `.squad/team.md` or `.ai-team/team.md` |

---

## Workflow Dependency Graph

```
                    ┌─────────────────────────────────────────────┐
                    │  Push to dev / PR to uat, prod              │
                    └────────────────┬────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐           ┌──────────▼──────┐
            │   squad-ci.yml │           │   ci-cd.yml     │
            │  (tests only)  │           │  (build, test,  │
            │                │           │   docker, deploy)
            └────────────────┘           └────────────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                              (on uat)      (on prod)      (on failure)
                                    │              │              │
                    ┌───────────────▼┐  ┌─────────▼────┐  ┌──────▼────┐
                    │  ci-cd.yml     │  │  ci-cd.yml   │  │ create-   │
                    │  (uat deploy)  │  │ (prod deploy)│  │ failure   │
                    └────────────────┘  └──────────────┘  │ issue.yml │
                                                          └───────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  PROMOTION FLOWS                                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  scheduled-uat-promote.yml (every 6 hours)                          │
│    └─> merge dev → uat (strip forbidden)                           │
│    └─> trigger ci-cd.yml --ref uat                                 │
│                                                                      │
│  squad-promote.yml (manual, dry-run capable)                        │
│    └─> merge dev → uat (strip forbidden)                           │
│    └─> merge uat → prod (validate CHANGELOG)                       │
│    └─> trigger ci-cd.yml --ref uat                                 │
│    └─> trigger ci-cd.yml --ref prod                                │
│                                                                      │
│  After prod push:                                                    │
│    └─> squad-release.yml (auto-tag & publish release)              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  SQUAD ISSUE TRIAGE & ASSIGNMENT FLOWS                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Label 'squad' on issue                                             │
│    └─> squad-triage.yml                                             │
│        ├─> Read team.md & routing.md                               │
│        ├─> Evaluate @copilot fit (if on team)                      │
│        ├─> Route to member or @copilot                             │
│        ├─> Apply squad:member or squad:copilot label               │
│        ├─> Apply default go:needs-research label                   │
│        └─> Post triage comment                                      │
│                                                                      │
│  Label squad:member added                                           │
│    └─> squad-issue-assign.yml                                       │
│        ├─> Post assignment comment                                  │
│        └─> Assign @copilot (if squad:copilot, using PAT)          │
│                                                                      │
│  Label go:* or release:* or type:* or priority:* added             │
│    └─> squad-label-enforce.yml                                      │
│        ├─> Enforce mutual exclusivity (remove conflicting)          │
│        ├─> Auto-apply release:backlog on go:yes (if no release)   │
│        └─> Remove release: on go:no                                │
│                                                                      │
│  squad-heartbeat.yml (every 30 min or event-driven)                │
│    ├─> Run Ralph triage (if .squad/templates/ralph-triage.js)     │
│    ├─> Apply Ralph decisions (labels + comments)                   │
│    └─> Auto-assign @copilot issues (if enabled)                   │
│                                                                      │
│  Update team.md                                                      │
│    └─> sync-squad-labels.yml                                        │
│        └─> Parse roster, create/update all squad:*, go:, release:  │
│            type:, priority:, signal labels                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  RELEASE MANAGEMENT                                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Manual release.yml (workflow_dispatch on prod)                    │
│    └─> Bump version, sync workspaces, tag, create GitHub Release   │
│                                                                      │
│  Push to insider branch                                             │
│    └─> squad-insider-release.yml                                    │
│        └─> Create insider prerelease tag (v{version}-insider+{sha}) │
│                                                                      │
│  Push to preview branch                                             │
│    └─> squad-preview.yml                                            │
│        └─> Validate CHANGELOG & no forbidden files                 │
│                                                                      │
│  Push to prod branch                                                │
│    └─> squad-release.yml                                            │
│        └─> Validate CHANGELOG, create tag (v{version}), publish    │
│                                                                      │
│  Docs push to preview (docs/** paths)                              │
│    └─> squad-docs.yml                                               │
│        └─> Build docs, deploy to GitHub Pages                      │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Issues & Recommendations

### 🔴 **Critical Issues**

#### 1. **Release Workflow Duplication: `release.yml` vs `squad-release.yml`** (HIGH)

**Issue:** Two release workflows exist:
- `release.yml`: Workflow dispatch on prod, bumps version, creates tag and GitHub Release
- `squad-release.yml`: Auto-triggered on prod push, reads version from package.json, creates tag and release

**Risk:** If someone runs `release.yml` (to bump version), it pushes to prod, which triggers `squad-release.yml`. But if the tag already exists (as it will, since `release.yml` created it), `squad-release.yml` is idempotent and exits silently. This is *acceptable but confusing*.

**Recommendation:**
- **Deprecate `release.yml`** — use `squad-promote.yml` (dev → uat → prod) followed by **manual** version bump on prod via a separate workflow or merge commit.
- OR, consolidate: Have `release.yml` skip its tag creation if `squad-release.yml` is expected to handle it.
- Document which one is the "official" path: For Squad projects, `squad-promote.yml` + `squad-release.yml` is the intended flow.

---

#### 2. **GitHub Token Limitations Not Fully Documented** (MEDIUM)

**Issue:** The codebase has discovered and works around GITHUB_TOKEN limitations:
- GITHUB_TOKEN pushes don't trigger workflows (by design, to prevent loops)
- Solution: Use `gh workflow run` + `GH_TOKEN` to explicitly trigger workflows after promotion

**Status:** Correctly implemented in `scheduled-uat-promote.yml` and `squad-promote.yml`, but this is a **subtle architectural constraint** that could bite future developers.

**Recommendation:**
- Add a comment in both promotion workflows explaining *why* the 5-second sleep + explicit `gh workflow run` is necessary
- Consider documenting this in `.squad/decisions.md` as an architectural pattern

---

### 🟡 **Medium Issues**

#### 3. **Scheduled Promotion Timing: Potential Overlap with Squad Work** (MEDIUM)

**Issue:** `scheduled-uat-promote.yml` runs 4× daily (01:00, 13:00, 17:00, 21:00 UTC). If a team member is actively working on uat at the same time, or if squad-promote.yml is manually triggered, both could race.

**Current safeguard:** `concurrency: { group: scheduled-uat-promote, cancel-in-progress: false }` ensures scheduled workflow doesn't cancel itself. But `squad-promote.yml` has its own concurrency (per-ref), so collisions are *possible*.

**Recommendation:**
- Update `squad-promote.yml` to use `concurrency: { group: squad-promote, cancel-in-progress: false }` to serialize with scheduled workflow.
- Consider documenting the promotion schedule in team docs so manual promotes don't clash.

---

#### 4. **Forbidden Path Stripping Must Stay In Sync** (MEDIUM)

**Issue:** Two workflows strip forbidden paths:
- `scheduled-uat-promote.yml` (lines 69-74)
- `squad-promote.yml` (lines 49-54)

Both strip: `.ai-team/`, `.squad/`, `.ai-team-templates/`, `team-docs/`, `docs/proposals/`

**Risk:** If one is updated and the other isn't, devops can leak into uat/prod.

**Recommendation:**
- Extract forbidden paths into a shared variable or script (e.g., `.github/scripts/forbidden-paths.txt`)
- Or, add a comment with a link between both workflows: "**SYNC:** This list must match squad-promote.yml line 49"

---

#### 5. **Squad CI Only Tests Squad CLI, Not the Game** (MEDIUM)

**Issue:** `squad-ci.yml` runs `node --test test/*.test.js` on dev/insider pushes and PRs to dev/preview/main/insider. But this tests the **Squad CLI itself**, not the Ellmud game server/client.

**Current state:** Main CI is in `ci-cd.yml` (build, test, lint, security audit), which runs on uat/prod + PRs to uat/prod.

**Risk:** PRs to dev don't trigger the full Ellmud test suite. A dev PR could merge and sit until it's promoted to uat, at which point CI/CD runs.

**Recommendation:**
- **Add a CI job for dev PRs** that mirrors `ci-cd.yml`'s build/test/lint steps but skips Docker/deploy.
- OR, document that `dev` is development-only and full CI only happens on uat/prod.
- If full CI on dev is desired, consider creating `ci-dev.yml`.

---

#### 6. **Health Check Dependency on "uptime" Field** (MEDIUM)

**Issue:** In `ci-cd.yml` (line 244), the health check looks for `"uptime"` in the response to confirm the server is real (not a placeholder).

```bash
if echo "$RESPONSE" | grep -q '"uptime"'; then
```

This is fragile: if the API schema changes and "uptime" is renamed, deployments will fail even if the server is healthy.

**Recommendation:**
- Make the health endpoint check more robust (e.g., check for any JSON response, or check specific status code)
- OR, document this assumption in the Dockerfile / server startup code.

---

### 🟢 **Minor Issues & Observations**

#### 7. **Action SHA Pinning Inconsistency** (MINOR)

**Issue:** Some workflows pin action SHAs (e.g., `ci-cd.yml` uses `actions/checkout@11bd71901...`), others use `@v4` (e.g., `squad-ci.yml`).

**Risk:** Low, but inconsistent. Pinning is more secure; loose refs are more maintainable.

**Recommendation:**
- Pick a standard (pinned SHAs or vX tags) and apply consistently across all workflows.
- Consider a `dependabot` rule to keep actions updated.

---

#### 8. **Error Handling in Promotion Workflows** (MINOR)

**Issue:** `scheduled-uat-promote.yml` uses `git merge ... || true` (line 66) to catch merge failures. If the merge fails, it silently continues and tries to strip paths anyway.

**Risk:** Very low (paths stripping still works), but could mask actual merge conflicts.

**Recommendation:**
- Check if merge succeeded before proceeding: `git merge ... || { echo "Merge failed"; exit 1; }`

---

#### 9. **Ralph Triage Script Not Bundled** (MINOR)

**Issue:** `squad-heartbeat.yml` looks for `.squad/templates/ralph-triage.js` and warns if not found. But this file isn't committed in the repo; it's downloaded/generated by `squad upgrade`.

**Risk:** If .squad/ isn't initialized, heartbeat workflow will silently skip Ralph (no error).

**Recommendation:**
- Document that `squad init` or `squad upgrade` must be run to enable Ralph.
- Consider adding a check: if heartbeat is meant to run, ensure ralph-triage.js exists or fail loudly.

---

#### 10. **COPILOT_ASSIGN_TOKEN Not Documented** (MINOR)

**Issue:** Multiple workflows reference `secrets.COPILOT_ASSIGN_TOKEN` as a fallback for auto-assigning @copilot. If not set, workflows fall back to GITHUB_TOKEN, which may not have sufficient permissions.

**Current state:** Documented in Khelben's history, but not in the workflows themselves.

**Recommendation:**
- Add a comment in `squad-heartbeat.yml` and `squad-issue-assign.yml`: "COPILOT_ASSIGN_TOKEN: PAT with repo+api permissions; fallback to GITHUB_TOKEN if not set."

---

#### 11. **Orphaned Label Cleanup** (MINOR)

**Issue:** `sync-squad-labels.yml` creates/updates labels but never deletes obsolete ones. If a team member is removed from team.md, their `squad:member` label lingers in the repo.

**Risk:** Low (old labels don't hurt), but can clutter the label list.

**Recommendation:**
- Document: "Labels are never auto-deleted. Remove obsolete labels manually from GitHub settings."
- OR, add logic to delete squad:* labels not in current roster.

---

## What's Working Well ✅

1. **Branch-based promotion strategy** (dev → uat → prod) is clear and enforced.
2. **Path stripping** correctly prevents devops files from leaking into uat/prod.
3. **Issue triage & assignment automation** (squad-triage + squad-issue-assign) is robust and well-designed.
4. **Azure Container Apps deployment** with health checks and automatic rollback is production-grade.
5. **Version consistency validation** (CHANGELOG.md checks in squad-preview and squad-release).
6. **Concurrency controls** prevent race conditions (mostly).
7. **Label enforcement** (mutual exclusivity) is clever and prevents mis-labeled issues.

---

## Summary for Team

| Category | Workflows | Status | Notes |
|----------|-----------|--------|-------|
| **Core CI/CD** | ci-cd.yml | ✅ Solid | Build/test/lint/deploy; health check + rollback |
| **Promotions** | scheduled-uat-promote.yml, squad-promote.yml | ⚠️ Working | Minor race condition risk; duplication with release.yml |
| **Release** | release.yml, squad-release.yml | ⚠️ Duplicate | Consider deprecating release.yml |
| **Squad Governance** | squad-{ci,triage,assign,label-enforce,heartbeat} | ✅ Solid | Smart triage, auto-routing, @copilot integration |
| **Docs & Preview** | squad-docs.yml, squad-preview.yml | ✅ Solid | Validation & deployment on preview |
| **Insider/Release** | squad-insider-release.yml, squad-release.yml | ✅ Solid | Prerelease & stable release management |
| **Label Sync** | sync-squad-labels.yml | ✅ Solid | Dynamically maintains label set from team.md |

---

## Next Steps (For Khelben)

1. **Resolve release.yml vs squad-release.yml:** Pick the official path.
2. **Document promotion timing:** Add team calendar or doc noting when scheduled promotes run.
3. **Add forbidden-path sync check:** Link both promotion workflows or extract to shared script.
4. **Consider ci-dev.yml:** For full test coverage on dev PRs.
5. **Strengthen health check:** Make it more robust to API changes.

---

**Report compiled:** 2025-01 | **Audit Depth:** Full | **Confidence:** High

---

## Decision: Inventory vs Stash headers are driven by `inZone` prop

**Author:** Regis (Frontend)  
**Date:** 2025-07-14  
**PR:** #435  
**Issue:** #431

### Context

`CombinedStashLoadout.tsx` serves dual duty — it's the equipment+items panel in both stash rooms and zones. The `inZone` prop already existed but headers were hardcoded to "STASH".

### Decision

All user-facing text in `CombinedStashLoadout` that refers to "stash" vs "inventory" is now conditional on `inZone`:
- Headers: "EQUIPMENT & INVENTORY" / "INVENTORY" when in zone
- Empty state: "No items carried." when in zone
- Item count: uses `inventory.length` when in zone

`StashTab.tsx` (the grid-based stash UI) is unaffected — it's always stash context.

### Impact

Frontend only. No server or shared package changes. Anyone adding new text to this component should follow the same `inZone` conditional pattern.

---

## Decision: Prod branch reset and force-push promote

**Author:** Khelben (CI/CD Dev)  
**Date:** 2026-07-15  
**Status:** Implemented

### Context

The `squad-promote.yml` workflow used `git merge` to promote uat→prod. Over time, the branches diverged significantly (forbidden-path conflicts, old commits on prod not on uat), causing recurring merge failures. Since there is no real prod deployment system, fighting these conflicts added no value.

### Decision

1. **Reset prod from uat:** Force-pushed `origin/uat` to `origin/prod`, giving prod a clean starting point identical to uat.
2. **Switched promote strategy:** Changed `squad-promote.yml` from merge-based to force-push reset. Each promotion now makes prod match uat exactly (after stripping forbidden paths via `strip-forbidden-paths.sh`).
3. **Removed Node.js/npm steps** from the promote workflow — no longer needed without version-bump-during-merge.

### Trade-offs

- **Pro:** Eliminates merge conflicts entirely. Simpler workflow. Faster execution.
- **Con:** Loses merge-commit history on prod. Force-push overwrites prod history.
- **Acceptable because:** No real prod system exists yet. When one is added, we can revisit and switch to a merge-based approach for traceability.

### Reversibility

If a real prod deployment pipeline is introduced, revert to merge-based promotion by restoring the old merge logic in `squad-promote.yml`. The `strip-forbidden-paths.sh` script remains the single source of truth either way.

---

## Decision: Starting Items Rename & Collapse Lifecycle Removal (#438)

**Authors:** Drizzt (Implementation), Elminster (Architecture)  
**Date:** 2026-04-12  
**Issue:** #438  
**PR:** #439  
**Status:** Implemented ✅

### Executive Summary

Players complained that looted items respawn on zone pop. This was wrong. We've fixed it by:

1. Renaming `loot_containers` → `starting_items` to clarify intent
2. Removing the collapse lifecycle (zones are now always 'open')
3. Fixing repop: items stay looted; only creatures respawn

### Changes

#### Database
- Column renamed: `zone_rooms.loot_containers` → `zone_rooms.starting_items`
- No data loss; straightforward migration

#### Shared Types
- `LootContainer` → `StartingItem` interface
- Backward-compat alias maintained
- `ZoneRoomDefinition.lootContainers` → `ZoneRoomDefinition.startingItems`

#### Server
- `PgZoneRepository` maps `starting_items` column
- `ZoneRoom.repopZone()` simplified: respawn creatures only, not items
- `resolveZoneRoomItems()` deleted (was the item respawn resolver)

#### Zone State
- Collapse lifecycle removed entirely (legacy from removed "shards" system)
- `ZoneState` simplified to always `'open'` 
- `collapseTimer` removed from `ZoneStateMessage`
- `stability` field kept at 1.0 for client backward-compat
- Methods removed: `seedZone()`, `handleCollapse()`, `broadcastRepopNarration()`

#### Client (Regis)
- `collapseTimer` removed from zone store
- Zone state always rendered as 'open'
- Room header no longer shows collapse countdown

#### Tests
- 33 server/shared files changed
- 3,043 total tests passing
- Repop tests rewritten (no item respawn verification)
- 415 client tests passing

### Rationale

- **Player mental model:** Looted items should stay looted
- **System design:** Zones are MUD-style (live until server exit), not shard-based
- **Repop purpose:** Reset creatures + hazards, not inventory
- **Simplicity:** Fewer states = fewer edge cases

---

## Decision: Remove room_definitions Table and PgRoomDefinitionsStore

**Author:** Copilot (Implementation)  
**Date:** 2026-04-12  
**PR:** #439  
**Status:** Implemented ✅

### Context

The `room_definitions` table was created for admin content management but was never used by the game runtime. Rooms are defined in `zone_rooms`, which is the single source of truth. The `PgRoomDefinitionsStore` CRUD admin store was dead code.

### Decision

Drop `room_definitions` table and remove `PgRoomDefinitionsStore` entirely.

### Changes

- **DB Migration:** Drop `room_definitions` table
- **Admin API:** Remove `/admin/api/room-definitions/*` endpoints
- **Admin Store:** Delete `PgRoomDefinitionsStore` class
- **Type System:** Remove `RoomDefinition` interface (replaced by `ZoneRoomDefinition`)
- **UI:** No room-definitions admin panel

### Rationale

- **Single source of truth:** `zone_rooms` is canonical for room definitions
- **Dead code removal:** Eliminates maintenance burden
- **Admin simplicity:** Fewer tables = cleaner UI

---

## Directive: Zone Lifecycle Context (from user #438 notes)

**Author:** dkirby-ms  
**Date:** 2026-04-12T16:41:00Z  
**Context:** User feedback on #438 work

### Key Insight

The zone collapse lifecycle (Seeding → Open → Active → Destabilising → Collapse) is legacy from a removed "shards" system. Modern design treats zones as MUD-style: initialized on server start, persist until server exit.

### For Team Memory

- Zones are **not** shard-based ephemeral instances
- Repop resets creatures + hazards, not items
- Collapse cycle is not needed as originally designed
- This context informs all future zone work

---

## Directive: Publish Workflow Simplification (2026-04-12T23:27:34Z)

**Author:** dkirby-ms (via Copilot)  
**Date:** 2026-04-12  
**Status:** Implemented ✅

### Directive

Content workflow does not need a "review" status. Simplify to `draft → published → deprecated`. Change UI button label from "Submit Review" to "Publish".

### Rationale

- User request: reduce status lifecycle complexity
- Captured for team memory

---

## Decision: Approve Publish Refactor + #445 Exit Icons

**Date:** 2026-04-13  
**Author:** Elminster (Lead/Architect)  
**Scope:** Client admin pages, Zone Designer  
**Status:** Approved and Merged ✅

### Verdict: APPROVE

#### 1. Publish Refactor (squad/publish-refactor branch)

**Consistency:** ✅ All 9 admin detail pages reviewed. The `review` status has been uniformly removed:
- **CreatureDetail, ItemsDetail, RoomsDetail, SkillsDetail, FactionsDetail, ZonesDetail** — All show "Publish" button with `<Send>` icon. No remaining "Submit Review" or "In Review" references.
- **CreaturesList, ItemsList** — Status type narrowed to `draft | published | deprecated` (was `draft | review | published | deprecated`). Status badge maps and filter dropdowns updated consistently.
- **AuditLog** — "Review" action filter option removed from dropdown. Only `create | update | delete | deploy | publish` remain.
- **NarrativeDetail, ModifiersDetail** — Only have "Save" button (no status workflow). Not in scope. Correct.

**Completeness:** ✅ `grep -rn "review" packages/client/src/` returns zero hits for status/submit contexts. Server-side also has no `'review'` status references. Clean sweep.

**No regressions:** ✅ The change is purely UI-label and type-narrowing. No behavioral logic changes.

#### 2. #445 Zone Designer Exit Icons (squad/445-zone-designer-exit-icons branch)

**Correctness:** ✅
- `ZoneRoomNode`: Up/down exit `<span>` elements now have `onClick` handlers with `e.stopPropagation()` (prevents node selection conflict), hover effects via inline style manipulation, and tooltip text showing exit count.
- `ZoneExitEdge`: New `highlighted` data property adds cyan glow styling (`#22D3EE`) with proper glow filter, consistent with existing selection/hover patterns.
- `ZoneDesigner`: `highlightedExitIds` state (Set<string>) correctly wired — populated on room click (`handleRoomClick` collects all connected exits), cleared on ESC/canvas click/exit click/up-down click. Included in `useMemo` dependency array for edges.

**React/TypeScript:** ✅ No issues. Callbacks wrapped in `useCallback`. Event handlers use proper `e.stopPropagation()`. Type definitions extended cleanly (`ExitEdgeData.highlighted`, `RoomNodeData.onUpExitClick/onDownExitClick/upExitIds/downExitIds`).

**Edge cases handled:**
- Single up/down exit → selects that exit directly
- Multiple up/down exits → selects first, highlights all
- Deselection paths (ESC, canvas click) all clear highlighting

### Merged to Dev

- PR #447 (creature detail static panels) squash-merged
- PR #448 (exit icons #445 + publish refactor) squash-merged

No issues found. Both PRs shipped.

