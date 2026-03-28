import { describe, it, expect } from 'vitest';
import { computeLayout, type RoomPosition } from '../computeLayout.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ExitDef = [direction: string, target: string];

/** Build a rooms Map from a simple definition object. */
function makeRooms(
  defs: Record<string, ExitDef[]>,
): Map<string, { exits: Map<string, string> }> {
  const rooms = new Map<string, { exits: Map<string, string> }>();
  for (const [id, exits] of Object.entries(defs)) {
    rooms.set(id, { exits: new Map(exits) });
  }
  return rooms;
}

/** Convenience to get a position and assert it exists. */
function pos(layout: Map<string, RoomPosition>, id: string): RoomPosition {
  const p = layout.get(id);
  if (!p) throw new Error(`expected room "${id}" to be in layout`);
  return p;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('computeLayout', () => {
  // ── 1. Single room ───────────────────────────────────────────────────────
  it('places a single room at (0, 0, 0)', () => {
    const rooms = makeRooms({ entry: [] });
    const layout = computeLayout(rooms, 'entry');

    expect(layout.size).toBe(1);
    expect(pos(layout, 'entry')).toEqual({ x: 0, y: 0, z: 0 });
  });

  // ── 2. Entry room is always at (0,0,0) ──────────────────────────────────
  it('always places the entry room at (0, 0, 0)', () => {
    const rooms = makeRooms({
      hub: [['north', 'a'], ['south', 'b']],
      a: [['south', 'hub']],
      b: [['north', 'hub']],
    });
    const layout = computeLayout(rooms, 'hub');
    expect(pos(layout, 'hub')).toEqual({ x: 0, y: 0, z: 0 });
  });

  // ── 3. Linear corridor (north-south) ────────────────────────────────────
  it('lays out a north-south corridor in a vertical line', () => {
    const rooms = makeRooms({
      r1: [['south', 'r2']],
      r2: [['north', 'r1'], ['south', 'r3']],
      r3: [['north', 'r2']],
    });
    const layout = computeLayout(rooms, 'r1');

    expect(layout.size).toBe(3);
    expect(pos(layout, 'r1')).toEqual({ x: 0, y: 0, z: 0 });
    expect(pos(layout, 'r2')).toEqual({ x: 0, y: 1, z: 0 });
    expect(pos(layout, 'r3')).toEqual({ x: 0, y: 2, z: 0 });
  });

  // ── 4. Hub-spoke (4 cardinal exits) ─────────────────────────────────────
  it('places hub-spoke rooms in correct cardinal directions', () => {
    const rooms = makeRooms({
      hub: [['north', 'n'], ['south', 's'], ['east', 'e'], ['west', 'w']],
      n: [['south', 'hub']],
      s: [['north', 'hub']],
      e: [['west', 'hub']],
      w: [['east', 'hub']],
    });
    const layout = computeLayout(rooms, 'hub');

    expect(layout.size).toBe(5);
    expect(pos(layout, 'hub')).toEqual({ x: 0, y: 0, z: 0 });
    expect(pos(layout, 'n')).toEqual({ x: 0, y: -1, z: 0 });
    expect(pos(layout, 's')).toEqual({ x: 0, y: 1, z: 0 });
    expect(pos(layout, 'e')).toEqual({ x: 1, y: 0, z: 0 });
    expect(pos(layout, 'w')).toEqual({ x: -1, y: 0, z: 0 });
  });

  // ── 5. 2×2 Grid ─────────────────────────────────────────────────────────
  it('lays out a 2×2 grid correctly', () => {
    // NW — NE
    //  |     |
    // SW — SE
    const rooms = makeRooms({
      nw: [['east', 'ne'], ['south', 'sw']],
      ne: [['west', 'nw'], ['south', 'se']],
      sw: [['north', 'nw'], ['east', 'se']],
      se: [['north', 'ne'], ['west', 'sw']],
    });
    const layout = computeLayout(rooms, 'nw');

    expect(layout.size).toBe(4);
    const nw = pos(layout, 'nw');
    const ne = pos(layout, 'ne');
    const sw = pos(layout, 'sw');
    const se = pos(layout, 'se');

    // nw is origin
    expect(nw).toEqual({ x: 0, y: 0, z: 0 });
    // ne is east of nw
    expect(ne).toEqual({ x: 1, y: 0, z: 0 });
    // sw is south of nw
    expect(sw).toEqual({ x: 0, y: 1, z: 0 });
    // se is south of ne (or east of sw) — should be (1,1)
    expect(se).toEqual({ x: 1, y: 1, z: 0 });
  });

  // ── 6. Loop (cycle) — should not infinite loop ──────────────────────────
  it('handles cycles without infinite looping', () => {
    const rooms = makeRooms({
      a: [['east', 'b']],
      b: [['south', 'c']],
      c: [['west', 'd']],
      d: [['north', 'a']],
    });
    const layout = computeLayout(rooms, 'a');

    expect(layout.size).toBe(4);
    // All rooms should be placed, no duplicates
    expect(layout.has('a')).toBe(true);
    expect(layout.has('b')).toBe(true);
    expect(layout.has('c')).toBe(true);
    expect(layout.has('d')).toBe(true);
  });

  // ── 7. Up/down — z-layer, same (x,y) ────────────────────────────────────
  it('places up/down connections on different z-layers at same (x,y)', () => {
    const rooms = makeRooms({
      ground: [['up', 'upper'], ['down', 'lower']],
      upper: [['down', 'ground']],
      lower: [['up', 'ground']],
    });
    const layout = computeLayout(rooms, 'ground');

    expect(layout.size).toBe(3);
    const ground = pos(layout, 'ground');
    const upper = pos(layout, 'upper');
    const lower = pos(layout, 'lower');

    expect(ground).toEqual({ x: 0, y: 0, z: 0 });
    expect(upper.x).toBe(0);
    expect(upper.y).toBe(0);
    expect(upper.z).toBe(1);
    expect(lower.x).toBe(0);
    expect(lower.y).toBe(0);
    expect(lower.z).toBe(-1);
  });

  // ── 8. Collision handling ────────────────────────────────────────────────
  it('resolves collisions when two exits point to the same cell', () => {
    const rooms2 = makeRooms({
      hub: [['north', 'a'], ['east', 'mid']],
      a: [],
      mid: [['north', 'b']],
      b: [],
    });
    // 'a' is at (0,-1), 'mid' at (1,0), 'b' wants (1,-1) which should be free
    const layout = computeLayout(rooms2, 'hub');
    expect(layout.size).toBe(4);

    // Now test real collision: two rooms competing for the same cell
    const rooms3 = makeRooms({
      hub: [['north', 'a'], ['west', 'side']],
      a: [['west', 'b']],
      side: [['north', 'c']],
      b: [],
      c: [],
    });
    // hub at (0,0), a at (0,-1), side at (-1,0)
    // b wants (-1,-1) from a going west
    // c wants (-1,-1) from side going north
    // One should get (-1,-1), the other should be displaced nearby
    const layout3 = computeLayout(rooms3, 'hub');
    expect(layout3.size).toBe(5);

    const bPos = pos(layout3, 'b');
    const cPos = pos(layout3, 'c');
    // They should NOT be at the same position
    expect(bPos.x === cPos.x && bPos.y === cPos.y).toBe(false);
  });

  // ── 9. Disconnected rooms ───────────────────────────────────────────────
  it('places disconnected rooms that are not reachable from entry', () => {
    const rooms = makeRooms({
      entry: [['east', 'connected']],
      connected: [['west', 'entry']],
      island1: [['east', 'island2']],
      island2: [['west', 'island1']],
    });
    const layout = computeLayout(rooms, 'entry');

    expect(layout.size).toBe(4);
    expect(layout.has('island1')).toBe(true);
    expect(layout.has('island2')).toBe(true);

    // Disconnected rooms should not overlap with the main component
    const mainXs = [pos(layout, 'entry').x, pos(layout, 'connected').x];
    const mainMaxX = Math.max(...mainXs);
    const island1Pos = pos(layout, 'island1');
    // Island should be placed to the right of the main component
    expect(island1Pos.x).toBeGreaterThan(mainMaxX);
  });

  // ── 10. No rooms in graph ───────────────────────────────────────────────
  it('returns empty layout for unknown entry room', () => {
    const rooms = makeRooms({});
    const layout = computeLayout(rooms, 'nonexistent');
    expect(layout.size).toBe(0);
  });

  // ── 11. All positions are unique (x,y) per z-layer ──────────────────────
  it('never places two rooms at the same (x,y) cell on the same z-level', () => {
    // Create a complex graph that stresses collision resolution
    const rooms = makeRooms({
      center: [['north', 'n'], ['south', 's'], ['east', 'e'], ['west', 'w']],
      n: [['east', 'ne'], ['west', 'nw']],
      s: [['east', 'se'], ['west', 'sw']],
      e: [['north', 'ne2']],
      w: [['south', 'sw2']],
      ne: [],
      nw: [],
      se: [],
      sw: [],
      ne2: [],
      sw2: [],
    });
    const layout = computeLayout(rooms, 'center');

    // Collect all (x,y,z) triples and assert uniqueness per z-level
    const cells = new Set<string>();
    for (const [, p] of layout) {
      const key = `${p.x},${p.y},${p.z}`;
      expect(cells.has(key), `duplicate cell at (${p.x}, ${p.y}, z=${p.z})`).toBe(false);
      cells.add(key);
    }
  });

  // ── 12. 3×3 grid ────────────────────────────────────────────────────────
  it('lays out a 3×3 grid with correct positions', () => {
    // Build a 3×3 grid: rows top to bottom (y=0,1,2), cols left to right (x=0,1,2)
    //   r00 — r10 — r20
    //    |      |      |
    //   r01 — r11 — r21
    //    |      |      |
    //   r02 — r12 — r22
    const rooms = makeRooms({
      r00: [['east', 'r10'], ['south', 'r01']],
      r10: [['west', 'r00'], ['east', 'r20'], ['south', 'r11']],
      r20: [['west', 'r10'], ['south', 'r21']],
      r01: [['north', 'r00'], ['east', 'r11'], ['south', 'r02']],
      r11: [['north', 'r10'], ['west', 'r01'], ['east', 'r21'], ['south', 'r12']],
      r21: [['north', 'r20'], ['west', 'r11'], ['south', 'r22']],
      r02: [['north', 'r01'], ['east', 'r12']],
      r12: [['north', 'r11'], ['west', 'r02'], ['east', 'r22']],
      r22: [['north', 'r21'], ['west', 'r12']],
    });

    const layout = computeLayout(rooms, 'r00');

    expect(layout.size).toBe(9);
    expect(pos(layout, 'r00')).toEqual({ x: 0, y: 0, z: 0 });
    expect(pos(layout, 'r10')).toEqual({ x: 1, y: 0, z: 0 });
    expect(pos(layout, 'r20')).toEqual({ x: 2, y: 0, z: 0 });
    expect(pos(layout, 'r01')).toEqual({ x: 0, y: 1, z: 0 });
    expect(pos(layout, 'r11')).toEqual({ x: 1, y: 1, z: 0 });
    expect(pos(layout, 'r21')).toEqual({ x: 2, y: 1, z: 0 });
    expect(pos(layout, 'r02')).toEqual({ x: 0, y: 2, z: 0 });
    expect(pos(layout, 'r12')).toEqual({ x: 1, y: 2, z: 0 });
    expect(pos(layout, 'r22')).toEqual({ x: 2, y: 2, z: 0 });
  });

  // ── 13. Mixed up/down with cardinal exits ────────────────────────────────
  it('handles mixed cardinal and vertical exits', () => {
    const rooms = makeRooms({
      ground: [['north', 'hall'], ['up', 'tower']],
      hall: [['south', 'ground']],
      tower: [['down', 'ground'], ['east', 'balcony']],
      balcony: [['west', 'tower']],
    });
    const layout = computeLayout(rooms, 'ground');

    expect(layout.size).toBe(4);
    const ground = pos(layout, 'ground');
    const hall = pos(layout, 'hall');
    const tower = pos(layout, 'tower');
    const balcony = pos(layout, 'balcony');

    expect(ground).toEqual({ x: 0, y: 0, z: 0 });
    expect(hall).toEqual({ x: 0, y: -1, z: 0 });
    expect(tower.z).toBe(1);
    // Balcony is east of tower, same z-level
    expect(balcony.x).toBe(tower.x + 1);
    expect(balcony.y).toBe(tower.y);
    expect(balcony.z).toBe(tower.z);
  });

  // ── 14. Exits to rooms not in graph are ignored ──────────────────────────
  it('ignores exits pointing to rooms not in the graph', () => {
    const rooms = makeRooms({
      a: [['north', 'b'], ['east', 'ghost']],
      b: [['south', 'a']],
      // 'ghost' is not in the rooms map
    });
    const layout = computeLayout(rooms, 'a');

    expect(layout.size).toBe(2);
    expect(layout.has('ghost')).toBe(false);
  });

  // ── 15. Sewer topology: sub-level cardinal layout is independent ────────
  it('lays out sub-level rooms using their own cardinal topology, not surface positions', () => {
    // Surface: three entry points scattered across the grid
    //   sluice-gate (hub) → east → sunken-square → east → cistern-access
    //
    // Each surface room has a "down" exit to the sewer level.
    // Sewer level has its OWN cardinal connections:
    //   sewer-main-junction → west → the-ratways
    //   sewer-main-junction → east → sewer-east-conduit
    //   sewer-east-conduit → east → sewer-cistern
    //
    // Without z-level isolation, the sewer rooms inherit scattered surface
    // positions, producing diagonal lines. With isolation, the sewer
    // respects its own cardinal exits.
    const rooms = makeRooms({
      'sluice-gate': [['east', 'sunken-square'], ['down', 'sewer-main-junction']],
      'sunken-square': [['west', 'sluice-gate'], ['east', 'cistern-access'], ['down', 'the-ratways']],
      'cistern-access': [['west', 'sunken-square'], ['down', 'sewer-cistern']],

      'sewer-main-junction': [['up', 'sluice-gate'], ['west', 'the-ratways'], ['east', 'sewer-east-conduit'], ['north', 'sewer-north-tunnel'], ['south', 'sewer-south-tunnel']],
      'the-ratways': [['up', 'sunken-square'], ['east', 'sewer-main-junction']],
      'sewer-east-conduit': [['west', 'sewer-main-junction'], ['east', 'sewer-cistern']],
      'sewer-cistern': [['up', 'cistern-access'], ['west', 'sewer-east-conduit']],
      'sewer-north-tunnel': [['south', 'sewer-main-junction']],
      'sewer-south-tunnel': [['north', 'sewer-main-junction']],
    });
    const layout = computeLayout(rooms, 'sluice-gate');

    expect(layout.size).toBe(9);

    // All surface rooms are at z=0
    expect(pos(layout, 'sluice-gate').z).toBe(0);
    expect(pos(layout, 'sunken-square').z).toBe(0);
    expect(pos(layout, 'cistern-access').z).toBe(0);

    // All sewer rooms are at z=-1
    expect(pos(layout, 'sewer-main-junction').z).toBe(-1);
    expect(pos(layout, 'the-ratways').z).toBe(-1);
    expect(pos(layout, 'sewer-east-conduit').z).toBe(-1);
    expect(pos(layout, 'sewer-cistern').z).toBe(-1);
    expect(pos(layout, 'sewer-north-tunnel').z).toBe(-1);
    expect(pos(layout, 'sewer-south-tunnel').z).toBe(-1);

    // Sewer cardinal topology: ratways is directly west of junction,
    // east-conduit is directly east, etc.
    const junc = pos(layout, 'sewer-main-junction');
    const ratways = pos(layout, 'the-ratways');
    const eastCon = pos(layout, 'sewer-east-conduit');
    const cistern = pos(layout, 'sewer-cistern');
    const northT = pos(layout, 'sewer-north-tunnel');
    const southT = pos(layout, 'sewer-south-tunnel');

    // the-ratways is directly west of junction (same y, x = junc.x - 1)
    expect(ratways.x).toBe(junc.x - 1);
    expect(ratways.y).toBe(junc.y);

    // sewer-east-conduit is directly east of junction
    expect(eastCon.x).toBe(junc.x + 1);
    expect(eastCon.y).toBe(junc.y);

    // sewer-cistern is directly east of east-conduit
    expect(cistern.x).toBe(eastCon.x + 1);
    expect(cistern.y).toBe(eastCon.y);

    // sewer-north-tunnel is directly north of junction
    expect(northT.x).toBe(junc.x);
    expect(northT.y).toBe(junc.y - 1);

    // sewer-south-tunnel is directly south of junction
    expect(southT.x).toBe(junc.x);
    expect(southT.y).toBe(junc.y + 1);
  });

  // ── 16. Rooms on different z-levels can share (x,y) ────────────────────
  it('allows rooms on different z-levels to share the same (x,y)', () => {
    const rooms = makeRooms({
      surface: [['down', 'basement']],
      basement: [['up', 'surface']],
    });
    const layout = computeLayout(rooms, 'surface');

    const s = pos(layout, 'surface');
    const b = pos(layout, 'basement');

    // Both at (0,0) but different z
    expect(s).toEqual({ x: 0, y: 0, z: 0 });
    expect(b.x).toBe(0);
    expect(b.y).toBe(0);
    expect(b.z).toBe(-1);
  });

  // ── 17. Multi-level z-transitions (z=0 → z=-1 → z=-2) ─────────────────
  it('handles cascading z-transitions across three levels', () => {
    const rooms = makeRooms({
      'surface': [['east', 'surface-e'], ['down', 'basement']],
      'surface-e': [['west', 'surface']],
      'basement': [['up', 'surface'], ['east', 'basement-e'], ['down', 'sub-basement']],
      'basement-e': [['west', 'basement']],
      'sub-basement': [['up', 'basement'], ['east', 'sub-e']],
      'sub-e': [['west', 'sub-basement']],
    });
    const layout = computeLayout(rooms, 'surface');

    expect(layout.size).toBe(6);

    expect(pos(layout, 'surface').z).toBe(0);
    expect(pos(layout, 'surface-e').z).toBe(0);
    expect(pos(layout, 'basement').z).toBe(-1);
    expect(pos(layout, 'basement-e').z).toBe(-1);
    expect(pos(layout, 'sub-basement').z).toBe(-2);
    expect(pos(layout, 'sub-e').z).toBe(-2);

    // Each level's cardinal layout is coherent
    const base = pos(layout, 'basement');
    const baseE = pos(layout, 'basement-e');
    expect(baseE.x).toBe(base.x + 1);
    expect(baseE.y).toBe(base.y);

    const sub = pos(layout, 'sub-basement');
    const subE = pos(layout, 'sub-e');
    expect(subE.x).toBe(sub.x + 1);
    expect(subE.y).toBe(sub.y);
  });

  // ── 18. Diagonal optimization ─────────────────────────────────────────────
  it('eliminates diagonal cardinal exits via post-BFS optimization', () => {
    // Topology where BFS order causes a diagonal:
    //   hub → east → east-room → east → far-east → south → target
    //   hub → south → south-room → east → target
    // BFS reaches target via far-east (south) before south-room (east),
    // placing target directly south of far-east. But south-room's east
    // exit to target then becomes diagonal.
    const rooms = makeRooms({
      hub:        [['east', 'east-room'], ['south', 'south-room']],
      'east-room': [['west', 'hub'], ['east', 'far-east']],
      'far-east': [['west', 'east-room'], ['south', 'target']],
      'south-room': [['north', 'hub'], ['east', 'target']],
      target:     [['north', 'far-east'], ['west', 'south-room']],
    });

    const layout = computeLayout(rooms, 'hub');

    const sr = pos(layout, 'south-room');
    const t = pos(layout, 'target');
    const fe = pos(layout, 'far-east');

    // Target must not be diagonal from south-room (east exit: same y)
    // AND must not be diagonal from far-east (south exit: same x)
    // At least one of these should be non-diagonal after optimization
    const srDiagonal = sr.x !== t.x && sr.y !== t.y;
    const feDiagonal = fe.x !== t.x && fe.y !== t.y;

    // The optimization should eliminate at least one diagonal
    expect(srDiagonal && feDiagonal).toBe(false);
  });

  // ── 19. Diagonal optimization with sewer-like topology ────────────────────
  it('fixes diagonals in a sewer-like hub-and-spoke with convergent paths', () => {
    // Mimics the real sewer topology that causes deep-channel ↔ effluent-pool diagonal:
    //   junction → east → conduit → east → pipe-maze → south → pool
    //   junction → south → s-tunnel → east → crossing → south → channel → east → pool
    const rooms = makeRooms({
      junction:  [['east', 'conduit'], ['south', 's-tunnel'], ['north', 'n-tunnel'], ['west', 'ratways']],
      conduit:   [['west', 'junction'], ['east', 'pipe-maze'], ['north', 'overflow']],
      'pipe-maze': [['west', 'conduit'], ['south', 'pool'], ['east', 'gas']],
      overflow:  [['south', 'conduit'], ['west', 'drain']],
      drain:     [['east', 'overflow'], ['west', 'n-tunnel']],
      'n-tunnel': [['south', 'junction'], ['east', 'drain'], ['north', 'rat-nest']],
      'rat-nest': [['south', 'n-tunnel']],
      's-tunnel': [['north', 'junction'], ['east', 'crossing'], ['west', 'w-conduit'], ['south', 'vault']],
      crossing:  [['west', 's-tunnel'], ['south', 'channel']],
      channel:   [['north', 'crossing'], ['east', 'pool'], ['west', 'silt']],
      pool:      [['west', 'channel'], ['north', 'pipe-maze']],
      gas:       [['west', 'pipe-maze']],
      silt:      [['east', 'channel']],
      vault:     [['north', 's-tunnel']],
      ratways:   [['east', 'junction']],
      'w-conduit': [['east', 's-tunnel']],
    });

    const layout = computeLayout(rooms, 'junction');

    const ch = pos(layout, 'channel');
    const pl = pos(layout, 'pool');

    // channel → east → pool: must not be diagonal
    const isDiagonal = ch.x !== pl.x && ch.y !== pl.y;
    expect(isDiagonal).toBe(false);

    // pool should be east of channel (same y, x = channel.x + 1 or more)
    expect(pl.y).toBe(ch.y);
    expect(pl.x).toBeGreaterThan(ch.x);
  });

  // ── 20. Force-directed relaxation improves adjacency ─────────────────────
  it('force-relaxation pulls connected rooms adjacent in convergent topology', () => {
    // Topology with two paths from junction to pool that converge:
    //   junction→east→conduit→east→pipe→south→pool
    //   junction→south→s-tunnel→east→crossing→south→channel→east→pool
    const rooms = makeRooms({
      junction:  [['east', 'conduit'], ['south', 's-tunnel'], ['north', 'n-tunnel'], ['west', 'ratways']],
      conduit:   [['west', 'junction'], ['east', 'pipe'], ['north', 'overflow']],
      pipe:      [['west', 'conduit'], ['south', 'pool'], ['east', 'gas']],
      overflow:  [['south', 'conduit'], ['west', 'drain']],
      drain:     [['east', 'overflow'], ['west', 'n-tunnel']],
      'n-tunnel': [['south', 'junction'], ['east', 'drain'], ['north', 'rat-nest']],
      'rat-nest': [['south', 'n-tunnel']],
      's-tunnel': [['north', 'junction'], ['east', 'crossing'], ['west', 'w-conduit'], ['south', 'vault']],
      crossing:  [['west', 's-tunnel'], ['south', 'channel']],
      channel:   [['north', 'crossing'], ['east', 'pool'], ['west', 'silt']],
      pool:      [['west', 'channel'], ['north', 'pipe']],
      gas:       [['west', 'pipe']],
      silt:      [['east', 'channel']],
      vault:     [['north', 's-tunnel']],
      ratways:   [['east', 'junction']],
      'w-conduit': [['east', 's-tunnel']],
    });

    const layout = computeLayout(rooms, 'junction');

    // Count non-adjacent cardinal exits (distance > 1)
    let nonAdjacent = 0;
    let diagonals = 0;
    const CARDINALS = ['north', 'south', 'east', 'west'];
    for (const [id, room] of rooms) {
      const p = layout.get(id)!;
      for (const [dir, targetId] of room.exits) {
        if (!CARDINALS.includes(dir)) continue;
        const tp = layout.get(targetId)!;
        const dist = Math.abs(tp.x - p.x) + Math.abs(tp.y - p.y);
        if (dist > 1) nonAdjacent++;
        if (p.x !== tp.x && p.y !== tp.y) diagonals++;
      }
    }

    // After relaxation, most exits should be adjacent
    // Allow at most 4 non-adjacent exits (convergent topology constraint)
    expect(nonAdjacent).toBeLessThanOrEqual(4);
    // No diagonals
    expect(diagonals).toBe(0);
  });
});
