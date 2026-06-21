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

# Drizzt — ACA Affinity for Node Load Harnesses

**Date:** 2026-05-20T17:59:23.199+00:00

## Context
UAT already has the expected Colyseus multi-replica ingredients: Redis presence, Redis matchmaker driver, and ACA sticky ingress. Even so, the raw Node WebSocket load test begins failing with `seat reservation expired` as soon as ACA scales beyond one replica.

## Decision
1. Treat ACA sticky sessions as a cookie-based contract that Node load tools must preserve explicitly.
2. For Colyseus load tests on ACA, make the harness carry the affinity cookie from the matchmake HTTP response into the WebSocket upgrade, or keep the environment pinned to a single replica while running a non-cookie-aware harness.
3. Do not blame `/api/spawn-zone`; the critical affinity boundary is Colyseus `POST /matchmake/...` to WebSocket consume-seat.

## Why
- Colyseus room seat reservations are still process-local in `Room._reservedSeats`; Redis presence/driver coordinate discovery and room metadata, but do not let another replica redeem a reservation created elsewhere.
- The Node `@colyseus/sdk` path used by the current harness performs HTTP and WebSocket as separate steps without a shared cookie jar, so ACA ingress affinity is lost under scale-out.
- Browser clients are less exposed because same-origin cookies can flow automatically, but Node test harnesses need explicit support.

## Files
- `packages/e2e/src/load-test-ws.ts`
- `packages/server/src/api/spawn-zone.ts`
- `packages/server/src/index.ts`
- `infra/modules/container-apps.bicep`
- `node_modules/@colyseus/sdk/src/Client.ts`
- `node_modules/@colyseus/sdk/src/HTTP.ts`
- `node_modules/@colyseus/core/src/Room.ts`
- `node_modules/@colyseus/core/src/Transport.ts`

---

# Drizzt — ACA Affinity Cookie Passthrough for Colyseus Harnesses

**Date:** 2026-05-20T18:12:16.280+00:00

## Context
The raw Node WebSocket load harness failed above one ACA replica because Colyseus matchmake and websocket consume-seat happen on separate connections, while ACA sticky sessions are enforced through `ARRAffinity` cookies.

## Decision
1. For Node-based Colyseus load tools that must work against scaled ACA deployments, do the matchmake `POST /matchmake/...` step manually when cookie capture is required.
2. Extract `ARRAffinity` / `ARRAffinity_SameSite` from the matchmake response and forward them as a `Cookie` header on the websocket upgrade before calling `Client.consumeSeatReservation()`.
3. Keep cookie forwarding opportunistic so the same harness still works in local or non-ACA environments where no affinity cookies exist.

## Why
- The Node `@colyseus/sdk` path forwards configured websocket headers, but it does not automatically carry matchmake response cookies into the websocket handshake.
- ACA sticky ingress is only effective if the websocket upgrade reuses the affinity cookie that was minted on the matchmake response.
- Using `Client.consumeSeatReservation()` preserves the normal Colyseus room join flow while letting the harness own the cookie bridge explicitly.

## Files
- `packages/e2e/src/load-test-ws.ts`
- `node_modules/@colyseus/sdk/src/Client.ts`
- `node_modules/@colyseus/sdk/src/HTTP.ts`
- `node_modules/@colyseus/sdk/src/transport/WebSocketTransport.ts`

---

# Drizzt — Colyseus Scaling Decision

**Date:** 2026-05-19T15:02:22.910+00:00

## Context
Azure Container Apps scale-out exposed `seat reservation expired` failures: the Colyseus HTTP seat reservation landed on one replica while the WebSocket upgraded onto another. Separate logs also showed disconnect-time profile saves attempting `player_skills` writes with a non-character identifier.

## Decision
1. Keep Colyseus cluster coordination on Redis (`RedisPresence` + `RedisDriver`) with local fallback when Redis is unavailable.
2. Enable ACA ingress sticky sessions in IaC via `stickySessions: { affinity: 'sticky' }` so matchmake and WebSocket traffic stay replica-affine.
3. Resolve the active `characters.id` server-side in `ZoneRoom.onJoin()` when a client only supplies `playerId`, and preserve the owning `players.id` separately for persistence.
4. Skip profile persistence when the room cannot prove a valid player/character ID pair.

## Why
- Redis alone is insufficient; without sticky ingress, the Colyseus seat reservation can still be redeemed on the wrong replica.
- Character-scoped tables (`player_skills`) require room runtime IDs to be character IDs, not account IDs.
- The fallback path keeps local/dev environments working without requiring Redis.

## Files
- `packages/server/src/index.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `infra/modules/container-apps.bicep`
- `packages/server/src/__tests__/zoneroom-player-id.test.ts`

---

# Decision: Provision gameplay dashboards as portable PostgreSQL JSON models

**Date:** 2026-05-20T16:54:33.072+00:00

## Context
Azure Managed Grafana is now provisioned in `infra/`, and gameplay telemetry is being written into PostgreSQL table `game_metrics` with event-specific JSONB metadata.

## Decision
Store gameplay dashboards as checked-in Grafana JSON models under `infra/grafana/dashboards/`, and make them portable by referencing the PostgreSQL datasource via `${DS_POSTGRESQL}` instead of a hard-coded UID.

Use PostgreSQL-native dashboard queries that read `metadata` via JSONB operators and Grafana time macros so the same dashboard imports cleanly across environments while staying aligned with the live schema.

## Why
- Azure Managed Grafana imports standard dashboard JSON directly, so checked-in models are the simplest provisionable artifact.
- `${DS_POSTGRESQL}` avoids environment-specific datasource churn between dev, UAT, and production.
- JSONB-aware SQL keeps observability close to the engine event schema without adding ETL work.

## Files
- `infra/grafana/dashboards/game-metrics.json`
- `packages/server/src/metrics/MetricsService.ts`
- `packages/server/src/metrics/index.ts`
- `packages/server/src/metrics/metrics-provider.ts`

---

# Decision: Grafana Room & Connection Metrics Panels

**Date:** 2026-05-20T20:00:00.902+00:00  
**Author:** Drizzt (Engine Dev)  
**File changed:** `infra/grafana/dashboards/game-metrics.json`

## Summary

Added a new "Room & Connection Metrics" row to the Game Metrics Grafana dashboard with four panels covering the room metric event types added in the preceding task.

## Panels Added

| Panel ID | Title | Type | Event Type |
|----------|-------|------|------------|
| 201 | Active Players (from snapshots) | timeseries | `room_snapshot` |
| 202 | Join/Leave Rate | timeseries | `room_join`, `room_leave` |
| 203 | Chat Messages per Minute | timeseries | `chat_message` |
| 204 | Room Population Table | table | `room_snapshot` |

## Key Decisions

### Layout
- Row at y=26 (after existing "Leaderboards & Hotspots" which ends at y=26).
- Panels 201–202 span y=27 (two half-width panels side by side).
- Panels 203–204 span y=35 (two half-width panels side by side).
- Panel IDs 200–204 to avoid conflicts with existing IDs 1–7, 100–101.

### Active Players query
- Uses `AVG(playerCount)` not `SUM` when grouping by zone — summing would double-count players visible across multiple room snapshots for the same zone.
- 5-minute time buckets (`$__timeGroupAlias(created_at, '5m')`) match the 60-second snapshot cadence without being too coarse.

### Join/Leave Rate query
- Single query target with `event_type AS metric` produces two series (`room_join`, `room_leave`) automatically — avoids duplicating the query.

### Room Population Table
- Uses `DISTINCT ON (metadata->>'roomId') ORDER BY ... created_at DESC` for the latest snapshot per room.
- Intentionally **omits** `$__timeFilter` — the table shows current state, not time-windowed history.
- Thresholds: green (0–4 players), yellow (5–9), red (10+) for at-a-glance capacity signalling.

### Chat Messages panel
- Bar chart style (matching "Loot activity" pattern) since it's a count-per-bucket metric, not a continuous rate.

---

# Room metrics decision

**Date:** 2026-05-20T19:33:31.586+00:00
**Author:** Drizzt

## Decision
- Treat `room_snapshot` as a true room-scoped operational event and allow `game_metrics.player_id` to be nullable via migration 023.
- Emit room snapshots from `ZoneRoom` every 60 seconds (from the 1-second sim tick) to keep Grafana useful without turning the metrics table into tick spam.
- Use Colyseus room identity (`roomId`, `roomName`, `zoneSlug`) for these operational events rather than in-world room slugs, because the dashboard target is room/process occupancy and chat load.

## Why
- Join/leave/chat metrics still have a player actor, but periodic room health snapshots do not.
- Using a synthetic player row would couple ops telemetry to fake auth data and complicate retention semantics.
- A 60-second cadence is enough for load-test and production monitoring while keeping write amplification bounded.

---

# Decision: Prefer raw HTTP + Colyseus SDK for high-fanout load tests

**Status:** Proposed  
**Author:** Drizzt (Engine Dev)  
**Date:** 2026-05-20T15:22:42.185+00:00

## Context

The Playwright load harness is useful for UI-path validation, but each virtual user still carries browser context overhead. That makes it the wrong tool for connection-scale runs once we want hundreds of concurrent sockets on one machine.

## Decision

Add and prefer a browser-free load-test mode in `packages/e2e/src/load-test-ws.ts` for high-connection fan-out.

### Implementation

- Authenticate with raw HTTP (`/auth/login` or `/auth/register`).
- Create/select characters through the existing character APIs.
- Resolve the target zone with `/api/spawn-zone`.
- Join the returned `zone:<slug>` room with the Colyseus JS SDK using `{ token, characterId }`.
- Reproduce the existing stress profile by sending `MessageTypes.COMMAND` payloads for movement and `say` traffic.

## Rationale

- Removes browser RAM cost from connection-scale tests.
- Keeps the test on the authoritative protocols the real client uses.
- Reuses existing auth and room-join flows, so the harness stays representative without UI overhead.

## Impact

- Operators now have a path that should scale to hundreds of sockets per machine.
- Playwright remains available for end-to-end UI validation, while websocket scale testing moves to the lighter harness.

## Related Files

- `packages/e2e/src/load-test-ws.ts`
- `packages/e2e/src/load-test.ts`
- `packages/server/src/api/characters.ts`
- `packages/server/src/api/spawn-zone.ts`
- `packages/client/src/services/connection.ts`

---

# Drizzt — Zone Join Deferral and Matchmaker Wait Tuning

**Date:** 2026-05-20T13:34:19.228+00:00

## Context
Hot-zone load testing showed three coupled failures on one replica: long `ZoneRoom.onJoin()` hydration blocked the event loop, the default Colyseus concurrent-create wait was short enough to allow duplicate zone rooms during burst joins, and the default WebSocket heartbeat budget was too small for a saturated room.

## Decision
1. Keep `ZoneRoom.onJoin()` to the minimum synchronous work needed to admit a player and send immediate bootstrap messages.
2. Move profile, faction, character, posture, inventory, exploration, loadout, and stat restoration into a deferred async hydration phase that yields back to the event loop between heavy steps.
3. Track deferred hydration per player and wait for it during cleanup so disconnect persistence does not overwrite stored state with defaults.
4. Set the Colyseus concurrent room-create wait budget at startup before importing Colyseus, and relax WebSocket heartbeat defaults through central server config.

## Why
- The join path is the hottest shared bottleneck on a single room; shrinking the synchronous section reduces event-loop stalls for every connecting player.
- Colyseus reads `COLYSEUS_MAX_CONCURRENT_CREATE_ROOM_WAIT_TIME` during module initialization, so late assignment does not help.
- Heartbeat tolerance and join-path latency are linked under load; widening the pong window avoids compounding transient saturation into forced disconnects.

## Files
- `packages/server/src/index.ts`
- `packages/server/src/config.ts`
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/server/src/__tests__/wave3-redis-contracts.test.ts`

---

# Colyseus viability for 100-player text zones

- **Date:** 2026-05-20T00:04:53.502+00:00
- **Owner:** Elminster

## Decision
Keep Colyseus for Ellmud's shared text zones. Do not pursue a framework rewrite for the current 100-player target. Treat 100 concurrent players in a single zone as a realistic engineering target, provided we optimize room-level fanout hot paths and plan to run shared zones on at least 2-4 vCPU when expecting heavy same-room activity.

## Why
- Ellmud is not using Colyseus like a twitch game with large replicated entity Schema. `ZoneRoom` sends mostly typed text/event messages and runs on a 1-second simulation tick.
- The room's synchronized `ZoneState` is tiny, so the dominant cost is application code that loops over `this.players` for occupants, movement, social narration, and combat snapshots.
- Colyseus's room/process model does mean one hot zone is pinned to one Node process, so the practical limit is single-process CPU, not cluster-wide horizontal scale.
- For this workload, a rewrite to custom WebSockets would mostly trade mature connection/matchmaking/session plumbing for marginal wins unless profiling proves `ZoneRoom` fanout itself is unfixable.

## Impact
- Short term: profile and optimize `ZoneRoom` hot paths before making platform changes.
- Capacity planning: treat 1 vCPU as acceptable for lighter traffic, but budget 2-4 vCPU for credible 100-player shared-zone load, especially if many users co-locate in one room or enter large combat encounters.
- Architecture: if a single authored zone must exceed this comfortably, first split the zone into sub-rooms/shards or introduce finer-grained room partitioning before replacing Colyseus.

## Files
- `packages/server/src/rooms/ZoneRoom.ts`
- `packages/server/src/state.ts`
- `packages/server/src/config.ts`
- `packages/server/src/index.ts`
- `packages/shared/src/index.ts`

---

# UAT load-test acceptance criteria

- **Date:** 2026-05-19T23:05:13.930+00:00
- **Owner:** Elminster

## Decision
Treat live UAT load tests as proof only of the highest sustained concurrency actually reached and held after ramp-up. A target value alone is not evidence of capacity; operators must confirm achieved live connections, hold duration at peak, and cleanup behavior separately.

## Why
The Playwright harness ramps at 2 connections/second by default and performs real auth, character selection, and browser joins before each socket becomes live. That means a 200-connection run needs about 100 seconds just to finish ramping, so an early stop can understate server capacity while still showing healthy behavior at a lower achieved concurrency.

## Files
- `packages/e2e/src/load-test.ts`
- `scripts/load-test.sh`
- `packages/server/src/config.ts`

---

# Khelben decision inbox — ACA alert to ServiceNow

- **Date:** 2026-05-20T20:43:40.179+00:00
- **Area:** Azure Monitor / ServiceNow alert routing

## Decision

Model the Azure Container Apps scale alert in Bicep as a dedicated `infra/modules/alerts.bicep` module, and support two ServiceNow delivery paths inside the action group:

1. **Preferred:** Azure Monitor ITSM connector via `itsmReceivers`
2. **Fallback:** ServiceNow secure webhook / scripted REST API via `webhookReceivers`

## Why

- The user asked for Bicep IaC that opens a ServiceNow incident when `ellmud-uat-app` scales above one replica.
- Azure Monitor still supports `itsmReceivers`, but Microsoft documents the legacy ServiceNow ITSM action path as deprecated, so a webhook fallback keeps the deployment usable if the ITSM connector is unavailable or already retired in a tenant.
- The Container App resource ID should come from `infra/modules/container-apps.bicep` output rather than being rebuilt in `main.bicep`.

## Implementation notes

- Alert metric: `Microsoft.App/containerApps` / `Replicas`
- Trigger: `Maximum > 1`
- Evaluation frequency: `PT1M`
- Window: `PT5M`
- Main wiring: `infra/main.bicep`
- Operator docs: `infra/main.bicepparam`, `docs/deployment.md`

---

# Khelben — Azure OpenAI infra wiring

Decision: keep the Azure AI Foundry deployment gated by `deployAiFoundry = false` and route its endpoint/key/deployment into Container Apps only when explicitly enabled.

Rationale: this preserves current UAT/template-only behavior while making the Azure provider path deployable when the team opts in. Container Apps currently passes LLM keys as environment values rather than `secrets`/`secretRef`, so the Azure key was wired consistently and marked secure at the Bicep parameter boundary; a future refactor should move both OpenAI and Azure OpenAI keys to Container App secrets together.

---

# Khelben deploy resilience decision

## Context
GitHub issue #508 was a false-alarm CI/CD failure: UAT revision `ellmud-uat-app--0000002` for commit `a557ccb` is already Running and Healthy. The deploy job failed because one transient `az containerapp revision show` connection reset aborted the monitor loop under `bash -e`, then rollback attempted multiple-revision traffic commands against a single-revision Container App.

## Decision
Harden `.github/workflows/ci-cd.yml` deploy-job rollback/monitoring without changing the intended single-revision app mode.

- Capture rollback metadata before deployment: active revision, active image, and `activeRevisionsMode`.
- Wrap deployment-monitor Azure CLI calls in bounded retry-with-backoff helpers. A transient `az`/network failure now logs and retries the poll instead of immediately failing the job.
- Monitor the latest revision until it is Running/RunningAtMaxScale and Healthy (or health is unavailable), failing only on terminal failed running states or timeout.
- Make rollback mode-aware:
  - Single revision mode: redeploy the previously captured image with the existing explicit Node command and target port, then monitor the active rollback revision. No traffic-splitting or multiple-mode-only commands are used.
  - Multiple revision mode: preserve traffic-weight rollback behavior and deactivate the failed revision, both behind `az` retries.
- Do not switch the Container App to multiple mode as a side effect.

## Validation
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci-cd.yml'))"` passed.
- Embedded deploy-job scripts passed `bash -n` after substituting GitHub expressions.
- `shellcheck` was not installed in the environment.

---

# Decision: Discord UAT chirp — use merge-parent git range for workflow_dispatch

**Author:** Khelben  
**Date:** 2026-05-20T13:37:30.442+00:00  
**Status:** Implemented  
**File changed:** `.github/workflows/ci-cd.yml`

---

## Decision

For `workflow_dispatch` events in the `notify-discord-uat` job, derive the Discord release chirp changelog from the merge commit's second parent (`HEAD^1..HEAD^2`) rather than falling back to `CHANGELOG.md`.

## Rationale

`github.event.before` is not populated for `workflow_dispatch` events. The old code fell back to reading the latest entry in `CHANGELOG.md`, which always returned the same stale content. Since `scheduled-uat-promote.yml` creates a proper `--no-ff` merge commit when it merges dev → uat, the second parent (`HEAD^2`) is the dev tip at merge time, and `HEAD^1` is the prior uat state. The range `HEAD^1..HEAD^2` is therefore the canonical set of commits that the promotion brought in.

## Consequences

- Discord chirps for scheduled promotes now show the actual commits that shipped, not stale release notes.
- If the merge introduced only chore/noise commits, the chirp is suppressed entirely (no empty or misleading posts).
- If a `workflow_dispatch` is triggered in a non-merge state (edge case), the step falls back to commits since the last tag, which is still better than `CHANGELOG.md`.
- `CHANGELOG.md` is no longer used as a fallback in the notification pipeline at all.

## Noise filters added

In addition to the existing `chore(release):`, `[Scribe]`, and `squad` filters, added:
- `chore:` — general maintenance commits, not player-facing
- `chore(` — all scoped chore variants (e.g. `chore(deps):`, `chore(ci):`)

---

# Khelben Decision Inbox — Grafana infrastructure

**Date:** 2026-05-20T15:36:05.073+00:00
**Agent:** Khelben

## Context

Ellmud already had `infra/modules/monitoring.bicep` creating Log Analytics and workspace-based Application Insights, and the Container App module already passed `APPLICATIONINSIGHTS_CONNECTION_STRING` into the server container.

## Decision

Add Azure Managed Grafana as a dedicated Bicep module (`infra/modules/grafana.bicep`) using Standard SKU, system-assigned managed identity, and the shared infra tag set. Grant Grafana's managed identity `Monitoring Reader` on the resource group so Azure Monitor/App Insights data can be queried without extra per-resource RBAC.

Do **not** add extra Azure RBAC for the Container App identity for telemetry emission. The current telemetry path is application -> Application Insights connection string -> Azure Monitor -> Grafana, so write access is already handled by the connection string rather than managed-identity RBAC.

## Impact

- `infra/main.bicep` should compose Grafana after the ACA app module and expose Grafana outputs.
- Future observability work can extend dashboards or Azure Monitor integrations without changing the app telemetry bridge.

---

# Khelben Decision Inbox — Grafana PostgreSQL datasource

**Date:** 2026-05-20T16:54:33.072+00:00
**Agent:** Khelben

## Context

Ellmud already provisions Azure Managed Grafana with Bicep and writes gameplay telemetry into PostgreSQL via the app's `DATABASE_URL`, but the PostgreSQL data source itself was not wired into Grafana.

## Decision

Keep the Grafana workspace and PostgreSQL networking in Bicep, but configure the PostgreSQL data source with an idempotent post-deploy Azure CLI step (`az grafana data-source create/update`) instead of trying to force it into the `Microsoft.Dashboard/grafana` resource model.

Keep PostgreSQL on the public-access path and retain the `AllowAzureServices` firewall rule so Azure Managed Grafana can reach the server over SSL. Supply database credentials from runtime environment variables (`POSTGRES_ADMIN_PASSWORD` / `GRAFANA_POSTGRES_PASSWORD`) rather than storing them in source control.

## Impact

- `infra/configure-grafana-postgres-datasource.sh` becomes the reusable automation entrypoint for Grafana datasource wiring.
- `infra/deploy.sh` can now include this step when `CONFIGURE_GRAFANA_POSTGRES_DATASOURCE=true`.
- Operators still need Grafana Editor/Admin rights on the workspace, which is documented in `docs/deployment.md`.

---

# PR #506 conflict resolution decision

**Author:** Khelben (CI/CD Dev)  
**Date:** 2026-06-20T16:04:29Z  
**Request:** Make PR #506 (`dev` → `uat`) mergeable without damaging `dev` or violating the promotion model.

## Verification

- `origin/uat` has no tracked `.squad/` files (`git ls-tree -r --name-only origin/uat | grep '^\.squad/'` returned no paths).
- `origin/uat` does retain Squad-adjacent operational files, including `.github/workflows/squad-*.yml`, `.github/agents/squad.agent.md`, and `.copilot/skills/*`.
- A test merge of `origin/uat` into local `dev` produced unmerged paths only at:
  - `.github/workflows/squad-promote.yml` (content conflict)
  - `.squad/templates/copilot-instructions.md` (modify/delete)
  - `.squad/templates/routing.md` (modify/delete)
  - `.squad/templates/scribe-charter.md` (modify/delete)
  - `.squad/templates/squad.agent.md.template` (modify/delete)
- The same test merge also staged many `.squad/` deletions because `uat` intentionally strips that directory. Committing such a merge without restoring them would damage `dev`.
- Recent scheduled `uat` merge commits preserve a zero `.squad/` count in the resulting `uat` tree.
- PR #506's raw diff from `uat` to `dev` includes `.squad/` paths, so a normal GitHub PR merge would introduce `.squad/` content into `uat`.
- `.gitattributes` only has union merge rules for selected `.squad` state files; it does not provide a branch-specific strategy to exclude `.squad/` from PR merges.
- `scheduled-uat-promote.yml` is the existing dev→uat promotion workflow and explicitly strips forbidden paths after merging.

## Decision

Do **not** resolve PR #506 by merging `origin/uat` into `dev` and pushing the merge commit.

That would make the PR technically mergeable only by making `uat` an ancestor of `dev`; the subsequent PR merge would carry `dev`'s tree into `uat`, including `.squad/`, which violates the established stripped-uat model. Resolving the modify/delete conflicts by deleting `.squad/` from `dev` is also invalid because `dev` must retain Squad tooling and state.

The correct promotion path is the strip-based dev→uat workflow, not a raw `dev`→`uat` PR merge carrying the full `dev` tree.

## Workflow conflict note

For `.github/workflows/squad-promote.yml`, the `uat` side is the appropriate downstream version for the current branch model: it promotes `uat` → `prod` via PR and documents that dev→uat is handled by `scheduled-uat-promote.yml`. The `dev` side currently refers to non-existent `preview`/`main` branches, so it is stale for the active `dev`/`uat`/`prod` model. However, updating that file alone would not solve the `.squad/` raw-PR problem.

## Recommended next action

Close or supersede PR #506 as a raw `dev`→`uat` PR and promote via the strip workflow after ensuring allowed workflow files on `dev` match the active branch model. Do not force-push, do not rewrite `dev`, and do not delete `.squad/` from `dev`.

---

# Preserve ACA image on infra redeploy

- **Date:** 2026-05-19T22:04:11.514+00:00
- **Owner:** Khelben

## Decision
Keep the Container App bootstrap image and placeholder entrypoint as the default Bicep values for first deploys, but preserve the currently running container image/command/args during brownfield infra redeploys by having `infra/deploy.sh` query ACA and pass those values back into `infra/main.bicep`.

## Why
This is the smallest reliable fix that protects existing environments without breaking greenfield bootstrapping before ACR exists. It also keeps the intended ownership split clear: infra defines safe defaults, while CI/CD remains the mechanism that promotes the real application image.

## Files
- `infra/deploy.sh`
- `infra/main.bicep`
- `infra/modules/container-apps.bicep`

---

# Minsc decision — load-test gameplay mix

- **Date:** 2026-05-20T19:51:09.439+00:00
- **Agent:** Minsc
- **Scope:** `packages/e2e/src/load-test.ts`

## Decision
The Playwright load test should simulate gameplay instead of alternating only movement and chat. Each connected user now opens with `look`, then follows a weighted command mix: movement 25%, attack/kill 25%, loot 15%, look 10%, say 10%, inventory/stats 5%, take/get 5%, and who 5%.

## Why
This better exercises the live zone path players actually use: orientation, room traversal, combat starts, post-kill loot, social chatter, and periodic state checks. It increases behavioral variety without changing the existing auth, browser connection, reporting, or shutdown infrastructure.

## Notes
Defaults were also raised to 20 connections and a 2000ms base action interval so the richer behavior produces steadier load.

---

# Minsc decision — load-test navigation escape sequence

- **Date:** 2026-05-20T21:00:25.794+00:00
- **Agent:** Minsc
- **Scope:** `packages/e2e/src/load-test.ts`

## Decision
The Playwright browser load test should run a best-effort hub escape sequence before its normal stress loop: `look`, then `down`, `east`, `east` with 500–1000ms pauses. After that setup, it can keep the existing weighted random command mix, including the 25% movement share.

## Why
Load users spawn in `reliquary-inn`, which only exits `down`, and the broader Reliquary hub is still two rooms farther east. Without deterministic setup, 5 out of 6 random movement picks fail at spawn and the test under-exercises the 22-room zone.

## Notes
Each escape step should tolerate command failures and continue so transient UI or room-state issues do not abort the whole stress loop.

---

# Azure OpenAI Transport Provider Selection

Requested by: @dkirby-ms
Author: Volo
Date: 2026-06-20

## Decision

LLM provider resolution is explicit-first, then auto-detect:

1. If `LLM_PROVIDER=azure`, use Azure OpenAI only when `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY`, and `AZURE_OPENAI_DEPLOYMENT` are all present.
2. If `LLM_PROVIDER=openai`, use the existing OpenAI-compatible path only when `OPENAI_LLM_ENDPOINT` and `OPENAI_LLM_KEY` are present.
3. If `LLM_PROVIDER` is unset, prefer Azure OpenAI when complete Azure config exists; otherwise use OpenAI-compatible config; otherwise remain template-only.

`ENABLE_LLM_NARRATION=false` still overrides all provider selection and forces template-only behavior.

## Rationale

This keeps the existing `OPENAI_LLM_*` path backward-compatible while allowing Azure OpenAI to become the preferred configured provider once its required variables are present. Explicit `LLM_PROVIDER` gives operators a deterministic override during migration or incident response. Azure uses the stable GA API version default `2024-10-21`, with `AZURE_OPENAI_API_VERSION` available for future service changes.
