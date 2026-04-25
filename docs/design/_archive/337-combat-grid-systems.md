# Combat Grid System — Game Systems Design Analysis
**Issue:** [#337](https://github.com/dkirby-ms/ellmud/issues/337) — Feature idea: in-room combat represented by sprites in a grid (DCSS style)  
**Author:** Jarlaxle (Systems Dev)  
**Date:** 2025-01-04  
**Status:** Research / Design Proposal

---

## Executive Summary

This document analyzes the game systems implications of introducing DCSS-style grid-based tactical combat to Ellmud. The current combat system uses **abstract position zones** (Front/Flank/Rear) to provide tactical depth without spatial rendering. Grid combat would replace this with explicit x-y coordinates, opening up possibilities for line-of-sight mechanics, cover, ranged distance falloff, and area-of-effect shaping.

**Key findings:**
- The existing tick-based combat loop and position system provide a strong foundation for grid integration
- Grid dimensions of **8×8 to 12×12** tiles per room scale well for 1-20 players + creatures
- Movement costs (1 action to move 1-2 tiles) fit naturally into the tick cycle
- Server-authoritative grid state integrates cleanly with the existing CombatSystem architecture
- Backward compatibility is feasible — rooms can opt into grid mode without breaking non-grid content

**Risks:**
- Performance scaling with 20+ entities resolving line-of-sight and pathing per tick
- UI/UX challenge: representing grid state in a text-primary interface
- Complexity increase for content designers (placing creatures, telegraphs, obstacles)

---

## 1. Current Combat System Analysis

### 1.1 Architecture Overview

The combat system is implemented in `packages/server/src/combat/` with these core components:

| Component | Purpose |
|---|---|
| **CombatSystem.ts** | Orchestrates tick-based combat for a zone. Manages encounters, queued actions, simultaneous damage resolution. |
| **CombatState.ts** | Data model: `Combatant`, `CombatEncounter`, combat stats, position state. |
| **damage.ts** | Damage formula: `raw × stance_multiplier - armour × flanking_bonus`, with dodge rolls. |
| **actions.ts** | Resolves Strike, Dodge, Flee actions into narration events. |
| **abilities.ts** | Ability definitions (Heavy Strike, Block, Observe) with cooldowns and stamina costs. |
| **ThreatTable.ts** | Creature AI threat tracking (GDD §6.10). |

### 1.2 Tick-Based Resolution Loop

Combat resolves in **1-second ticks** (see `CombatSystem.tick()`):

1. **Position resolution** — Queued position changes execute first. Repositioning forfeits the action for that tick.
2. **Ability resolution** — Queued player abilities resolve. Wind-up telegraphs expire and execute.
3. **Auto-attacks** — All players/creatures without a queued ability or reposition auto-attack their targets.
4. **Creature actions** — Each creature consults its threat table and acts against highest-threat *reachable* target.
5. **Status effects** — DoT, buffs, debuffs, cooldowns tick down.
6. **State broadcast** — HP, cooldowns, position states, narration sent to clients.

This is **deterministic and simultaneous** — all damage is calculated from start-of-tick state, applied at once, then HP updated.

### 1.3 Existing Position System (GDD §6.11)

The current system uses **three abstract zones** instead of coordinates:

```typescript
export type PositionZone = 'front' | 'flank' | 'rear';
```

Each `Combatant` has:
- `position: PositionZone` — current zone
- `positionCooldown: number` — ticks remaining before can reposition (default 3)

**Mechanics:**
- **Front:** Melee range. Can reach Front/Flank targets. Vulnerable to Front-targeted telegraphs.
- **Flank:** Melee range. Can reach Front/Flank. Gains +15% flanking damage when target's focus is on Front.
- **Rear:** Ranged only. Melee attacks from Rear fail. Protected from melee creatures (they must reposition to reach Rear).

**Creature types** have position behavior (see `CreaturePositionType`):
- `melee` — defaults to Front, repositions toward unreachable high-threat targets
- `ranged` — defaults to Rear, can hit all zones
- `skirmisher` — defaults to Flank, actively repositions to chase healers
- `boss` — occupies "all" positions simultaneously

**Position changes:**
- Cost: 1 tick (forfeit action)
- Cooldown: 3 ticks before next reposition
- Command: `queuePositionChange(combatantId, newPosition)`

**Range validation:**
- `canReachTarget(attacker, target)` checks if attacker's position + type allows hitting target
- Melee from Rear → blocked
- Boss creatures reach all zones

This system provides tactical depth for group play (20-player raids need Front/Flank/Rear coordination) while being **ignorable in solo play** (default Front works fine).

### 1.4 Creature AI & Positioning

Creature behavior is deterministic (see `packages/server/src/creatures/behavior.ts`):

**State machine:** idle → alert → hostile → fleeing

**Action selection in hostile state:**
1. Check HP threshold → flee if below 20%
2. Consult threat table (GDD §6.10) → pick highest-threat *reachable* player
3. If unreachable and `skirmisher` type → reposition toward target (costs action)
4. Otherwise → attack highest-threat reachable target

Creature AI uses `pickCreatureTarget()` in CombatSystem, which:
- Filters players by reachability based on creature position + `CreaturePositionType`
- Considers threat values
- Repositions aggressive types toward unreachable targets

This AI would need pathfinding logic in a grid system.

---

## 2. Grid Combat Mechanics Proposal

### 2.1 Grid Dimensions

**Recommendation: 8×8 to 12×12 tiles per room.**

Rationale:
- **8×8** — Compact. Works for 3-5 entity encounters. Feels cramped with 20 players + 10 creatures.
- **10×10** — Sweet spot. Enough space for positioning, not so large that movement dominates actions.
- **12×12** — Maximum feasible for text-mode rendering. Larger grids become unwieldy without a visual client.

**Variable by room type:**
- Small rooms (corridor, dead_end): 8×8
- Standard rooms (junction, feature rooms): 10×10
- Boss arenas (boss room type): 12×12

Grid size stored per-room in `zone_rooms` table (new `grid_width`, `grid_height` columns, nullable for backward compatibility).

### 2.2 Coordinate System

**Server-authoritative x-y coordinates:**

```typescript
export interface GridPosition {
  x: number; // 0-indexed, left to right
  y: number; // 0-indexed, top to bottom
}

export interface Combatant {
  // ... existing fields
  gridPosition?: GridPosition; // Present if room has grid combat enabled
  position: PositionZone;      // Derived from gridPosition for backward compat
}
```

**Zone derivation from grid position (for backward compatibility):**
- Front zone: y ≤ 3 (front third of grid)
- Flank zone: 4 ≤ y ≤ 6 (middle)
- Rear zone: y ≥ 7 (back third)

This allows existing zone-based mechanics (flanking bonus, position-targeted telegraphs) to work unchanged.

### 2.3 Movement System

**Movement costs:**
- **1 action = 1 tile movement** (orthogonal: up/down/left/right)
- **Diagonal movement:** Allowed at same cost (simplicity over realism)
- **Multi-tile movement:** Not supported in Phase 1. Player must queue multiple move actions over multiple ticks.

**Movement validation:**
- Blocked by walls (room perimeter)
- Blocked by obstacles (furniture, chasms — stored per-room)
- Not blocked by other entities (can path through allies/enemies)

**Movement command:**
```
move <direction>       → move 1 tile in cardinal direction (n/s/e/w)
move <x> <y>           → move to specific coordinate (if pathing allowed)
position <zone>        → auto-path to nearest tile in zone (backward compat)
```

**Queuing:**
- Movement queued like position changes: `queuedActions.set(id, { action: 'move', gridTarget: {x, y} })`
- Resolved in Phase 1 of tick (same as current position resolution)

**Cooldown:**
- No per-move cooldown (unlike zone repositioning)
- Movement costs the action for that tick (no auto-attack + move in same tick)

### 2.4 Range Mechanics

**Melee range:** Adjacent tiles (8-way adjacency, including diagonals)

**Ranged weapons:** Effective range based on weapon type:
- Thrown weapons: 3-5 tiles
- Bow/crossbow: 8-10 tiles (almost full grid)
- Magic (future): varies by spell

**Range validation in damage calculation:**

```typescript
function getDistance(a: GridPosition, b: GridPosition): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); // Chebyshev distance
}

function canReachTarget(attacker: Combatant, target: Combatant): boolean {
  if (!attacker.gridPosition || !target.gridPosition) {
    // Fall back to zone-based logic for non-grid rooms
    return canReachTargetZone(attacker, target);
  }
  
  const distance = getDistance(attacker.gridPosition, target.gridPosition);
  const weaponType = getWeaponType(attacker); // melee | ranged_short | ranged_long
  
  if (weaponType === 'melee') return distance <= 1;
  if (weaponType === 'ranged_short') return distance <= 5;
  if (weaponType === 'ranged_long') return distance <= 10;
  
  return false;
}
```

**Damage falloff (optional Phase 2 feature):**
- Ranged attacks at max range deal reduced damage (e.g., 50% at 10 tiles, 100% at 5 tiles)
- Keeps ranged players from being invincible backliners

### 2.5 Line of Sight

**Full LOS system (Phase 2):**
- Raycasting from attacker to target
- Blocked by opaque obstacles (walls, pillars, furniture)
- Creatures can hide behind cover

**Simplified LOS (Phase 1 — recommended for initial implementation):**
- No LOS blocking — if target is in range, you can hit them
- Visual/narrative obstacles indicated but don't mechanically block attacks
- Reduces computational cost and design complexity

**LOS for telegraphs:**
- Cone telegraphs specify origin + direction (e.g., dragon breath in 90° cone)
- All tiles in cone affected
- Phase 1: Room-wide and position-zone telegraphs remain unchanged

### 2.6 Position-Based Evasion and Cover

**Evasion:**
- Keep existing dodge mechanic (AGI + dodge skill → % chance to fully avoid)
- No additional positional evasion bonus in Phase 1
- Phase 2: Being behind cover grants +20% dodge chance

**Cover mechanics (Phase 2):**
- Certain tiles marked as "cover" (behind pillars, crates, etc.)
- Ranged attacks against entities in cover have reduced hit chance or damage
- Melee attacks ignore cover (you're adjacent)

**Flanking:**
- Current +15% damage when attacking from Flank zone while target focuses Front
- Grid version: +15% damage when attacking from **behind or sides** (target's facing determined by their last attack direction or threat table focus)
- Requires tracking entity facing — deferred to Phase 2

### 2.7 Grid Integration with Tick Loop

**Modified tick loop:**

1. **Movement resolution** — Process queued moves. Validate pathing, update `gridPosition`. Entities that moved forfeit their action.
2. **Position zone sync** — Derive `position` (Front/Flank/Rear) from `gridPosition` for backward compat.
3. **Ability resolution** — Unchanged. Abilities with range requirements validate against grid distance.
4. **Auto-attacks** — Range validation now uses `getDistance()` + weapon type instead of zone logic.
5. **Creature actions** — Creature AI picks target using threat + reachability (now grid-distance-based). Pathfinding if repositioning needed.
6. **Status effects** — Unchanged.
7. **State broadcast** — Include `gridPosition` in combat state messages.

**Performance concern:** With 20 players + 10 creatures, validating range/LOS for every attack every tick is 900 checks/second (30 entities × 30 potential targets). Needs profiling.

**Optimization:** Cache distance matrix per-tick (computed once, reused for all range checks).

---

## 3. Creature AI Grid Positioning

### 3.1 Pathfinding

**Algorithm:** A* pathfinding on grid graph.

**When to path:**
- Creature's highest-threat target is out of melee range (for melee creatures)
- Creature is `skirmisher` type and wants to reposition toward Rear (where healers are)
- Creature is fleeing (pick random adjacent room exit, path toward it)

**Pathfinding cost:**
- Compute path once per tick per creature that needs it
- Cache path for 3-5 ticks (recompute if target moves significantly)
- Limit max path length to 10 tiles (prevents expensive searches)

**Move-toward behavior:**
- If path found: move 1 tile along path (costs action)
- If no path: attack highest-threat *reachable* target instead

### 3.2 Creature Positioning AI

Extend existing `CreaturePositionType` behavior:

| Type | Grid Behavior |
|---|---|
| **melee** | Start at front-center (y=2, x=grid_width/2). Path toward highest-threat target if > 1 tile away. Attack when adjacent. |
| **ranged** | Start at rear-center (y=grid_height-2). Hold position, shoot any target in range. Flee backward if melee enemy adjacent. |
| **skirmisher** | Start at flank (y=grid_height/2, x=0 or x=grid_width-1). Path toward high-threat Rear targets (healers). Mobile and aggressive. |
| **boss** | Start at center or designated spawn tile. Can reach all positions (ignores range). May have unique movement patterns (charge, teleport). |

### 3.3 Formation and Group Tactics

**Creature groups (3+ creatures of same type):**
- Spawn in loose formation (spread 2-3 tiles apart)
- Melee types form a front line
- Ranged types stay clustered in rear

**Flanking AI:**
- Skirmisher creatures attempt to path around player front line to attack Rear
- If blocked, attack Flank targets instead

**No swarm intelligence in Phase 1** — each creature makes independent decisions based on its threat table. Coordinated tactics (pincer attacks, focus-fire) deferred to Phase 2.

---

## 4. Integration Analysis

### 4.1 Changes to Existing Systems

| System | Changes Required | Backward Compatible? |
|---|---|---|
| **CombatSystem** | Add `gridPosition` to `Combatant`. Extend `canReachTarget()` with grid-distance logic. Add movement action queuing. | ✅ Yes — if `gridPosition` is undefined, fall back to zone logic. |
| **CombatState** | Add `GridPosition` interface, `gridPosition?: GridPosition` to `Combatant`. | ✅ Yes — optional field. |
| **damage.ts** | No changes needed. Range validation happens before calling `calculateDamage()`. | ✅ Yes |
| **Creature AI** | Add pathfinding. Extend `pickCreatureTarget()` with grid reachability. | ✅ Yes — check if room has grid enabled. |
| **Room data** | Add `grid_width`, `grid_height`, `obstacles: GridPosition[]` to `zone_rooms` table. | ✅ Yes — nullable columns. |
| **Client** | New grid renderer component. Parse `gridPosition` from combat state messages. | ⚠️ Additive — old clients ignore grid data, see zone text. |

**Critical path for backward compat:**
- If `room.grid_width` is null → room uses zone-based combat (existing behavior)
- If `room.grid_width` is set → room uses grid combat
- Combatants have both `gridPosition` and `position` — `position` derived from `gridPosition`
- Existing zone commands (`position front`) still work (auto-path to Front zone tiles)

### 4.2 Server-Authoritative Grid State

**Storage:**

```typescript
export interface GridCombatState {
  gridWidth: number;
  gridHeight: number;
  obstacles: GridPosition[]; // Blocked tiles (walls, chasms, furniture)
  entityPositions: Map<string, GridPosition>; // combatantId -> position
}

export interface CombatEncounter {
  // ... existing fields
  gridState?: GridCombatState; // Present if room has grid enabled
}
```

**Per-room setup:**
- When combat initiates in a grid-enabled room, `CombatSystem.initiateCombat()` creates `gridState`
- Load grid dimensions + obstacles from room data
- Spawn entities at designated spawn points (or default positions)

**State validation:**
- All position changes validated server-side
- Attempted moves to blocked tiles rejected (action wasted)
- Client cannot spoof positions

### 4.3 Client Synchronization

**Messages sent to client each tick:**

```json
{
  "type": "combat_state",
  "encounter_id": "enc-123",
  "tick": 42,
  "entities": [
    {
      "id": "player-1",
      "name": "You",
      "hp": 85,
      "maxHp": 100,
      "gridPosition": { "x": 5, "y": 3 },
      "position": "front"
    },
    {
      "id": "creature-goblin-1",
      "name": "Goblin Raider",
      "hp": 20,
      "maxHp": 30,
      "gridPosition": { "x": 4, "y": 1 },
      "position": "front"
    }
  ],
  "obstacles": [
    { "x": 3, "y": 5 },
    { "x": 7, "y": 7 }
  ],
  "events": [
    { "type": "strike", "actorId": "player-1", "targetId": "creature-goblin-1", "damage": 12, "narration": "You slash the goblin for 12 damage." }
  ]
}
```

**Client responsibilities:**
- Render grid (ASCII art, simple HTML grid, or DCSS-style tiles)
- Draw entities at their `gridPosition`
- Show obstacles as impassable tiles
- Allow click-to-move or arrow-key movement (sends move command to server)

**Latency handling:**
- Client predicts movement (moves avatar immediately on keypress)
- Server validates and sends authoritative position each tick
- Client reconciles if mismatch (rare in 1s tick system)

### 4.4 Performance Considerations

**Critical bottlenecks:**

1. **Range checks:** 30 entities × 30 targets = 900 distance calculations per tick
   - **Mitigation:** Cache distance matrix (O(n²) once per tick, then O(1) lookups)
   - **Cost:** 30×30 = 900 floats = 3.6 KB per room per tick (trivial)

2. **Pathfinding:** A* on 10×10 grid for up to 10 creatures per tick
   - **Mitigation:** Limit search depth to 10 tiles, cache paths for 3-5 ticks
   - **Cost:** ~100 nodes expanded per path × 10 creatures = 1000 node expansions/tick (acceptable)

3. **LOS raycasting (Phase 2):** 30 entities × 30 targets = 900 rays per tick
   - **Mitigation:** Defer to Phase 2. Use simplified range-only in Phase 1.

**Profiling plan:**
- Implement grid with 20 players + 10 creatures in dev environment
- Run 100-tick benchmark
- Target: <100ms per tick (well under 1s tick budget)

**Scaling limits:**
- Grid combat probably caps at 20 players + 15 creatures per room (35 entities)
- Beyond that, consider splitting encounters across multiple rooms

### 4.5 Backward Compatibility — Mixed Content

**Scenario 1: Old room, new client**
- Room has no `grid_width` → zone-based combat
- Client sees position zone text, no grid rendered
- No issues.

**Scenario 2: New room (grid-enabled), old client**
- Room has `grid_width` → grid combat
- Server sends `gridPosition` in state messages
- Old client ignores `gridPosition`, reads `position` (derived zone)
- Client sees zone-based text, no grid rendered
- **Degraded experience but functional.**

**Scenario 3: Mixed content in same zone**
- Some rooms have grids, others don't
- When player transitions from grid room to non-grid room, `gridPosition` dropped, `position` retained
- Combat state tracks which mode is active per-room
- **Fully supported.**

**Design constraint:** Once a room is grid-enabled, all creatures in that room must have spawn positions defined. Content designers must place entities explicitly (can't rely on default Front/Rear zones).

---

## 5. Open Questions and Risks

### 5.1 Open Questions

1. **How do we render the grid in a text interface?**
   - ASCII grid with letters for entities? (e.g., `P` = player, `G` = goblin)
   - Side-by-side: text feed on left, grid on right?
   - Pure text: "You are at (5, 3). Goblin at (4, 1) — 2 tiles north."?
   - **Recommendation:** Phase 1 uses text coordinates. Phase 2 adds ASCII grid. Phase 3 (stretch) adds DCSS-style tile rendering via canvas/WebGL.

2. **Do we need facing/orientation for entities?**
   - Affects flanking bonuses (can only flank from behind/sides)
   - Affects cone telegraphs (which way does the dragon breathe?)
   - **Recommendation:** Not in Phase 1. Facing derived from last attack target's position in Phase 2.

3. **How do AoE telegraphs work on a grid?**
   - Room-wide: affect all tiles (unchanged)
   - Zone-targeted: affect tiles in that zone (y-coordinate ranges)
   - Cone: origin + direction + angle → raycasting to determine affected tiles
   - Circle: origin + radius → all tiles within radius
   - **Recommendation:** Phase 1 uses room-wide and zone-based. Phase 2 adds cone/circle with explicit affected tile lists.

4. **What happens if 2 entities try to move to the same tile?**
   - Both succeed (entities can overlap — not ideal but simple)
   - First in tick order succeeds, second's move fails (wastes action — punishing)
   - Both pushed to adjacent tiles (complex to implement)
   - **Recommendation:** Allow overlap in Phase 1. Revisit if it causes problems.

5. **How do we handle spawn camping on grid entry points?**
   - Players spawn at entry tile (e.g., south exit tile)
   - Enemy can stand on that tile and attack immediately
   - **Mitigation:** Spawn players at random unoccupied tiles within Entry zone (y=7-9, random x). Same as current staggered entry.

### 5.2 Risks

**Risk 1: Performance degradation with 20-player raids**
- **Severity:** High
- **Likelihood:** Medium (needs profiling)
- **Mitigation:** Distance matrix caching, path caching, LOS deferral to Phase 2
- **Contingency:** Cap grid-enabled encounters at 10 players, or disable grid for 20-player content

**Risk 2: Content design complexity explosion**
- **Severity:** Medium
- **Likelihood:** High
- **Impact:** Designers must manually place spawn points, obstacles, and telegraphs for every grid room
- **Mitigation:** Provide editor tooling. Start with small number of grid rooms (boss fights only). Use procedural placement for standard rooms.
- **Contingency:** Make grid combat opt-in per room. Most rooms stay zone-based.

**Risk 3: Text-mode rendering is awkward and unreadable**
- **Severity:** Medium
- **Likelihood:** Medium
- **Impact:** Players struggle to visualize grid state from text alone. Combat feels less tactical than expected.
- **Mitigation:** Provide ASCII grid renderer early in dev. Conduct playtest with text-only group.
- **Contingency:** Defer grid combat to post-1.0 when graphical client is available.

**Risk 4: Pathfinding AI is exploitable**
- **Severity:** Low
- **Likelihood:** Medium
- **Impact:** Players kite melee creatures indefinitely. Creatures path into traps.
- **Mitigation:** Limit creature path recalculation frequency (they commit to a path for 3-5 ticks). Boss creatures ignore pathing and teleport/charge.
- **Contingency:** Add "give up" logic — if creature can't reach target after 10 ticks, it switches to ranged attack or repositions to zone-based logic.

**Risk 5: Backward compatibility breaks unexpectedly**
- **Severity:** High
- **Likelihood:** Low (if we test thoroughly)
- **Impact:** Non-grid rooms break. Old clients crash.
- **Mitigation:** Extensive integration tests. Feature flag to disable grid system in production.
- **Contingency:** Revert grid system, keep it in feature branch until fully baked.

---

## 6. Recommendation

**Phased implementation:**

### Phase 1: Minimal Grid (3-4 weeks)
- Add `gridPosition` to `Combatant`, `grid_width/height` to room data
- Implement grid movement (1 tile per action, no pathing UI)
- Extend `canReachTarget()` with Chebyshev distance + weapon range
- Basic creature pathfinding (A* toward target)
- Text-based coordinate rendering ("You are at (5,3). Goblin at (4,1).")
- **No LOS, no cover, no facing.** Keep it mechanically simple.
- **Test with 1-2 boss rooms only.** Do not convert all rooms to grid.

**Success criteria:**
- 20-player + 10-creature room runs at <100ms per tick
- Boss fight feels more tactical than zone-based version
- No regressions in non-grid rooms

### Phase 2: Tactical Depth (4-6 weeks)
- ASCII grid renderer in client
- Line-of-sight blocking (raycasting)
- Cover mechanics (+dodge chance)
- Facing and flanking (attack from behind = bonus)
- Cone/circle telegraph shapes
- Creature formation AI (coordinated positioning)

### Phase 3: DCSS-Style Rendering (8-12 weeks, stretch goal)
- Tile-based sprite rendering (canvas or WebGL)
- Animated movement and attacks
- Visual telegraphs (red highlight on affected tiles)
- Fog of war (LOS determines visibility)

**Go/No-Go Decision Point:**
After Phase 1, evaluate:
- Is performance acceptable?
- Does grid combat feel better than zone-based?
- Can we render it readably in text mode?
- Are content designers able to create grid rooms efficiently?

If **any** answer is "no," park the feature and revisit post-1.0 with graphical client.

---

## 7. Appendices

### A. Data Model Changes

**New columns in `zone_rooms` table:**
```sql
ALTER TABLE zone_rooms
  ADD COLUMN grid_width INTEGER DEFAULT NULL,
  ADD COLUMN grid_height INTEGER DEFAULT NULL,
  ADD COLUMN obstacles JSONB DEFAULT NULL; -- Array of {x, y} objects
```

**Example room data:**
```json
{
  "room_id": "boss-chamber-01",
  "grid_width": 12,
  "grid_height": 12,
  "obstacles": [
    {"x": 3, "y": 5},
    {"x": 4, "y": 5},
    {"x": 7, "y": 7}
  ],
  "spawn_points": {
    "players": [
      {"x": 6, "y": 10},
      {"x": 5, "y": 10},
      {"x": 7, "y": 10}
    ],
    "creatures": [
      {"creature_id": "boss-dragon", "x": 6, "y": 2}
    ]
  }
}
```

### B. Client Message Format (Grid State)

**Sent every tick during grid combat:**
```typescript
interface GridCombatStateMessage {
  type: 'grid_combat_state';
  encounterId: string;
  tick: number;
  gridWidth: number;
  gridHeight: number;
  entities: Array<{
    id: string;
    name: string;
    hp: number;
    maxHp: number;
    gridPosition: { x: number; y: number };
    position: PositionZone; // Derived zone for backward compat
  }>;
  obstacles: Array<{ x: number; y: number }>;
  events: CombatEvent[]; // Same as existing
}
```

### C. Pathfinding Pseudocode

```typescript
function findPath(
  grid: GridCombatState,
  start: GridPosition,
  goal: GridPosition,
  maxDepth = 10
): GridPosition[] | null {
  // A* pathfinding with Manhattan distance heuristic
  const openSet = [{ pos: start, f: heuristic(start, goal), g: 0, parent: null }];
  const closedSet = new Set<string>();
  
  while (openSet.length > 0) {
    const current = openSet.shift()!; // Pop lowest f-score
    
    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      return reconstructPath(current);
    }
    
    if (current.g >= maxDepth) continue; // Depth limit
    
    closedSet.add(posToKey(current.pos));
    
    for (const neighbor of getNeighbors(grid, current.pos)) {
      if (closedSet.has(posToKey(neighbor))) continue;
      
      const g = current.g + 1;
      const h = heuristic(neighbor, goal);
      const f = g + h;
      
      openSet.push({ pos: neighbor, f, g, parent: current });
    }
    
    openSet.sort((a, b) => a.f - b.f); // Keep sorted by f-score
  }
  
  return null; // No path found
}

function heuristic(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan distance
}
```

---

## 8. Conclusion

Grid-based combat is **feasible and mechanically sound** for Ellmud. The existing tick-based system, position zones, and creature AI provide a strong foundation. Grid combat would significantly increase tactical depth for boss fights and group content, at the cost of content design complexity and potential performance concerns.

**Recommendation:** Implement **Phase 1 (minimal grid)** as a **spike/prototype** in a feature branch. If it passes the go/no-go criteria, proceed to Phase 2. If not, shelf it until a graphical client is available.

The key risk is **text-mode rendering**. DCSS works because players see the grid visually. We need to validate that coordinate-based text (or ASCII grid) provides enough spatial awareness before committing to full grid combat.

**Next steps:**
1. Review this analysis with the team (Ralph, Khelben, Bruenor, Drizzt)
2. Prototype ASCII grid renderer in client (1-2 days)
3. If renderer looks good, implement Phase 1 grid system (3-4 weeks)
4. Playtest with 10-player boss fight
5. Go/no-go decision based on performance and UX

---

**End of document.**
