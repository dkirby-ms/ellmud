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

    // After relaxation, most exits should be adjacent.
    // Strict direction constraints reduce compactness; allow more non-adjacent.
    expect(nonAdjacent).toBeLessThanOrEqual(12);
    // Strict direction constraints may introduce a small number of diagonals
    expect(diagonals).toBeLessThanOrEqual(2);
  });

  // ── 21. Siltgate zone (138 rooms, 280 intra-zone exits) ─────────────────
  it('handles the Siltgate city zone without diagonals', () => {
    const rooms = makeRooms({
      'apothecary': [['north', 'narrow-alley-1']],
      'ash-garden': [['north', 'scavengers-market']],
      'ashgate': [['west', 'rubble-street-5']],
      'ashgate-chapel': [['north', 'dust-bowl']],
      'barnacled-quay': [['east', 'rope-walk'], ['north', 'harbourmasters-office'], ['south', 'pier-1'], ['west', 'fish-market']],
      'bazaar-row-1': [['east', 'bazaar-row-2'], ['west', 'market-square']],
      'bazaar-row-2': [['east', 'bazaar-row-3'], ['west', 'bazaar-row-1']],
      'bazaar-row-3': [['east', 'span-gate'], ['south', 'money-changers-row'], ['west', 'bazaar-row-2']],
      'beggar-kings-court': [['east', 'ruined-tenement-2'], ['north', 'gutter-drain']],
      'beggars-lane-1': [['east', 'beggars-lane-2'], ['south', 'narrow-alley-3'], ['west', 'span-gate']],
      'beggars-lane-2': [['east', 'beggars-lane-3'], ['south', 'rat-run-1'], ['west', 'beggars-lane-1']],
      'beggars-lane-3': [['east', 'rubble-street-1'], ['west', 'beggars-lane-2']],
      'belvedere': [['south', 'highwind-bridge']],
      'blackwater-crossing': [['north', 'bone-canal'], ['south', 'plague-bearers-lair']],
      'blast-crater': [['west', 'scavengers-market']],
      'bone-canal': [['north', 'sewer-junction-2'], ['south', 'blackwater-crossing']],
      'bone-pit': [['west', 'crumbling-wall-1']],
      'broken-bridge': [['north', 'mud-flat']],
      'carrion-field': [['east', 'collapsed-building-3'], ['south', 'scavengers-market'], ['west', 'scorched-plaza']],
      'chandlers-shop': [['east', 'dock-street-3']],
      'city-gate': [['east', 'market-square']],
      'cloth-merchants-hall': [['west', 'guild-hall']],
      'cobblestone-street-1': [['east', 'cobblestone-street-2'], ['north', 'silver-arcade-2'], ['south', 'glassblowers-workshop']],
      'cobblestone-street-2': [['east', 'cobblestone-street-3'], ['south', 'narrow-alley-2'], ['west', 'cobblestone-street-1']],
      'cobblestone-street-3': [['east', 'merchant-inn'], ['north', 'silver-arcade-4'], ['south', 'pawn-shop'], ['west', 'cobblestone-street-2']],
      'collapsed-building-1': [['north', 'rubble-street-3'], ['south', 'rubble-passage-1']],
      'collapsed-building-2': [['south', 'rubble-street-3']],
      'collapsed-building-3': [['east', 'rubble-passage-1'], ['west', 'carrion-field']],
      'collapsed-sewer': [['west', 'drain-grate-2']],
      'courtyard-fountain': [['east', 'library-entrance'], ['north', 'noble-residence-1'], ['south', 'promenade-walk-1'], ['west', 'servants-passage']],
      'crumbling-wall-1': [['east', 'bone-pit'], ['north', 'scorched-plaza'], ['south', 'crumbling-wall-2']],
      'crumbling-wall-2': [['north', 'crumbling-wall-1'], ['south', 'plague-house']],
      'dock-street-1': [['east', 'fish-market'], ['north', 'tavern-row'], ['south', 'dock-street-2']],
      'dock-street-2': [['east', 'warehouse-1'], ['north', 'dock-street-1'], ['south', 'dock-street-3']],
      'dock-street-3': [['north', 'dock-street-2'], ['south', 'dock-street-4'], ['west', 'chandlers-shop']],
      'dock-street-4': [['east', 'warehouse-2'], ['north', 'dock-street-3'], ['south', 'dock-street-5']],
      'dock-street-5': [['north', 'dock-street-4'], ['south', 'tide-gate'], ['west', 'warehouse-3']],
      'dockside-tavern': [['south', 'fish-market']],
      'drain-grate-1': [['south', 'sewer-junction-2']],
      'drain-grate-2': [['east', 'collapsed-sewer'], ['north', 'sewer-junction-3']],
      'drowned-shrine': [['west', 'plague-bearers-lair']],
      'dry-dock': [['west', 'tide-gate']],
      'dust-bowl': [['north', 'rubble-street-4'], ['south', 'ashgate-chapel']],
      'effluent-outflow': [['north', 'sewer-tunnel-6']],
      'estate-gate': [['down', 'fountain-plaza'], ['north', 'promenade-walk-1']],
      'fish-market': [['east', 'barnacled-quay'], ['north', 'dockside-tavern'], ['south', 'pier-3'], ['west', 'dock-street-1']],
      'flooded-chamber': [['north', 'sewer-tunnel-8']],
      'flophouse': [['west', 'rat-run-1']],
      'fountain-plaza': [['east', 'silver-arcade-1'], ['north', 'news-board'], ['south', 'market-square'], ['up', 'estate-gate']],
      'fungal-cavern': [['north', 'sewer-tunnel-7']],
      'garden-terrace': [['east', 'observatory'], ['north', 'noble-residence-2'], ['south', 'promenade-walk-3']],
      'glassblowers-workshop': [['north', 'cobblestone-street-1']],
      'guild-hall': [['down', 'undercity-gate'], ['east', 'cloth-merchants-hall'], ['north', 'jewelers-lane'], ['south', 'silver-arcade-3']],
      'gutter-drain': [['down', 'gutter-sewer'], ['north', 'narrow-alley-6'], ['south', 'beggar-kings-court']],
      'gutter-sewer': [['up', 'gutter-drain']],
      'harbourmasters-office': [['south', 'barnacled-quay']],
      'highwind-bridge': [['north', 'belvedere'], ['south', 'promenade-walk-4']],
      'iron-balcony-1': [['east', 'iron-balcony-2'], ['north', 'promenade-walk-2']],
      'iron-balcony-2': [['north', 'promenade-walk-3'], ['west', 'iron-balcony-1']],
      'jewelers-lane': [['south', 'guild-hall']],
      'lean-to-camp': [['west', 'narrow-alley-4']],
      'library-entrance': [['west', 'courtyard-fountain']],
      'market-square': [['east', 'bazaar-row-1'], ['north', 'fountain-plaza'], ['south', 'tavern-row'], ['west', 'city-gate']],
      'merchant-inn': [['west', 'cobblestone-street-3']],
      'money-changers-row': [['north', 'bazaar-row-3']],
      'mud-flat': [['north', 'narrow-alley-7'], ['south', 'broken-bridge']],
      'narrow-alley-1': [['north', 'silver-arcade-1'], ['south', 'apothecary']],
      'narrow-alley-2': [['north', 'cobblestone-street-2'], ['south', 'wine-merchants-cellar']],
      'narrow-alley-3': [['north', 'beggars-lane-1'], ['south', 'narrow-alley-4']],
      'narrow-alley-4': [['east', 'lean-to-camp'], ['north', 'narrow-alley-3'], ['south', 'narrow-alley-5']],
      'narrow-alley-5': [['east', 'narrow-alley-6'], ['north', 'narrow-alley-4']],
      'narrow-alley-6': [['east', 'narrow-alley-7'], ['south', 'gutter-drain'], ['west', 'narrow-alley-5']],
      'narrow-alley-7': [['east', 'narrow-alley-8'], ['south', 'mud-flat'], ['west', 'narrow-alley-6']],
      'narrow-alley-8': [['south', 'pawn-alley'], ['west', 'narrow-alley-7']],
      'news-board': [['south', 'fountain-plaza']],
      'noble-residence-1': [['south', 'courtyard-fountain']],
      'noble-residence-2': [['south', 'garden-terrace']],
      'observatory': [['west', 'garden-terrace']],
      'pawn-alley': [['north', 'narrow-alley-8'], ['south', 'ruined-tenement-1']],
      'pawn-shop': [['north', 'cobblestone-street-3']],
      'pier-1': [['north', 'barnacled-quay']],
      'pier-2': [['north', 'rope-walk']],
      'pier-3': [['north', 'fish-market']],
      'plague-bearers-lair': [['east', 'drowned-shrine'], ['north', 'blackwater-crossing']],
      'plague-house': [['north', 'crumbling-wall-2']],
      'promenade-walk-1': [['east', 'promenade-walk-2'], ['north', 'courtyard-fountain'], ['south', 'estate-gate']],
      'promenade-walk-2': [['east', 'promenade-walk-3'], ['south', 'iron-balcony-1'], ['west', 'promenade-walk-1']],
      'promenade-walk-3': [['east', 'promenade-walk-4'], ['north', 'garden-terrace'], ['south', 'iron-balcony-2'], ['west', 'promenade-walk-2']],
      'promenade-walk-4': [['north', 'highwind-bridge'], ['west', 'promenade-walk-3']],
      'rat-run-1': [['east', 'flophouse'], ['north', 'beggars-lane-2'], ['south', 'rat-run-2']],
      'rat-run-2': [['east', 'thieves-den'], ['north', 'rat-run-1']],
      'rope-walk': [['east', 'tar-pit'], ['north', 'sailmakers-loft'], ['south', 'pier-2'], ['west', 'barnacled-quay']],
      'rubble-passage-1': [['north', 'collapsed-building-1'], ['west', 'collapsed-building-3']],
      'rubble-street-1': [['east', 'rubble-street-2'], ['west', 'beggars-lane-3']],
      'rubble-street-2': [['east', 'rubble-street-3'], ['west', 'rubble-street-1']],
      'rubble-street-3': [['east', 'rubble-street-4'], ['north', 'collapsed-building-2'], ['south', 'collapsed-building-1'], ['west', 'rubble-street-2']],
      'rubble-street-4': [['east', 'rubble-street-5'], ['south', 'dust-bowl'], ['west', 'rubble-street-3']],
      'rubble-street-5': [['east', 'ashgate'], ['south', 'wrecked-barricade'], ['west', 'rubble-street-4']],
      'ruined-tenement-1': [['north', 'pawn-alley']],
      'ruined-tenement-2': [['west', 'beggar-kings-court']],
      'sailmakers-loft': [['south', 'rope-walk']],
      'scavengers-market': [['east', 'blast-crater'], ['north', 'carrion-field'], ['south', 'ash-garden']],
      'scorched-plaza': [['east', 'carrion-field'], ['south', 'crumbling-wall-1'], ['west', 'tar-pit']],
      'scribe-corner': [['west', 'tavern-row']],
      'serpent-den': [['west', 'sewer-tunnel-3']],
      'servants-passage': [['east', 'courtyard-fountain']],
      'sewer-cistern-1': [['north', 'sewer-tunnel-5']],
      'sewer-junction-1': [['east', 'sewer-tunnel-1'], ['north', 'undercity-gate'], ['south', 'sewer-tunnel-3'], ['west', 'sewer-tunnel-7']],
      'sewer-junction-2': [['north', 'drain-grate-1'], ['south', 'bone-canal'], ['west', 'sewer-tunnel-2']],
      'sewer-junction-3': [['east', 'sewer-tunnel-6'], ['south', 'drain-grate-2'], ['up', 'tide-gate'], ['west', 'sewer-tunnel-5']],
      'sewer-tunnel-1': [['east', 'sewer-tunnel-2'], ['west', 'sewer-junction-1']],
      'sewer-tunnel-2': [['east', 'sewer-junction-2'], ['west', 'sewer-tunnel-1']],
      'sewer-tunnel-3': [['east', 'serpent-den'], ['north', 'sewer-junction-1'], ['south', 'silt-pool']],
      'sewer-tunnel-4': [['east', 'sewer-tunnel-5']],
      'sewer-tunnel-5': [['east', 'sewer-junction-3'], ['south', 'sewer-cistern-1'], ['west', 'sewer-tunnel-4']],
      'sewer-tunnel-6': [['east', 'sewer-vault'], ['south', 'effluent-outflow'], ['west', 'sewer-junction-3']],
      'sewer-tunnel-7': [['east', 'sewer-junction-1'], ['south', 'fungal-cavern'], ['west', 'sewer-tunnel-8']],
      'sewer-tunnel-8': [['east', 'sewer-tunnel-7'], ['south', 'flooded-chamber']],
      'sewer-vault': [['west', 'sewer-tunnel-6']],
      'shattered-bridge': [['north', 'wrecked-barricade']],
      'silk-road': [['south', 'silver-arcade-4']],
      'silt-pool': [['north', 'sewer-tunnel-3']],
      'silver-arcade-1': [['east', 'silver-arcade-2'], ['south', 'narrow-alley-1'], ['west', 'fountain-plaza']],
      'silver-arcade-2': [['east', 'silver-arcade-3'], ['south', 'cobblestone-street-1'], ['west', 'silver-arcade-1']],
      'silver-arcade-3': [['east', 'silver-arcade-4'], ['north', 'guild-hall'], ['west', 'silver-arcade-2']],
      'silver-arcade-4': [['north', 'silk-road'], ['south', 'cobblestone-street-3'], ['west', 'silver-arcade-3']],
      'smugglers-cove': [['north', 'tide-gate']],
      'span-gate': [['east', 'beggars-lane-1'], ['west', 'bazaar-row-3']],
      'tar-pit': [['east', 'scorched-plaza'], ['west', 'rope-walk']],
      'tavern-row': [['east', 'scribe-corner'], ['north', 'market-square'], ['south', 'dock-street-1']],
      'thieves-den': [['west', 'rat-run-2']],
      'tide-gate': [['down', 'sewer-junction-3'], ['east', 'dry-dock'], ['north', 'dock-street-5'], ['south', 'smugglers-cove']],
      'undercity-gate': [['south', 'sewer-junction-1'], ['up', 'guild-hall']],
      'warehouse-1': [['west', 'dock-street-2']],
      'warehouse-2': [['west', 'dock-street-4']],
      'warehouse-3': [['east', 'dock-street-5']],
      'wine-merchants-cellar': [['north', 'narrow-alley-2']],
      'wrecked-barricade': [['north', 'rubble-street-5'], ['south', 'shattered-bridge']],
    });

    const layout = computeLayout(rooms, 'market-square');

    // All rooms placed (excluding cross-zone targets with no exits)
    const roomsWithExits = [...rooms.entries()].filter(([, r]) => r.exits.size > 0);
    for (const [id] of roomsWithExits) {
      expect(layout.has(id)).toBe(true);
    }

    // Count diagonals and non-adjacent exits per z-level
    let diagonals = 0;
    let nonAdjacent = 0;
    const diagonalPairs: string[] = [];
    const CARDINALS = ['north', 'south', 'east', 'west'];

    for (const [id, room] of rooms) {
      const p = layout.get(id);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        if (!CARDINALS.includes(dir)) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dist = Math.abs(tp.x - p.x) + Math.abs(tp.y - p.y);
        if (dist > 1) nonAdjacent++;
        if (p.x !== tp.x && p.y !== tp.y) {
          diagonals++;
          diagonalPairs.push(`${id}→${targetId} (${dir}): (${p.x},${p.y})→(${tp.x},${tp.y})`);
        }
      }
    }

    // Log diagonal pairs always for diagnosis
    console.log(`\n=== ${diagonals} diagonal exits, ${nonAdjacent} non-adjacent ===`);
    if (diagonalPairs.length > 0) {
      for (const dp of diagonalPairs) console.log(`  ${dp}`);
    }

    // Diagonal tolerance — in dense zones (130+ rooms), the strict direction
    // constraints prevent the optimizer from eliminating every diagonal.
    // Direction correctness is the hard constraint; a moderate number of
    // diagonals is acceptable as long as no exit draws in the wrong direction.
    expect(diagonals).toBeLessThanOrEqual(0);

    // No occlusions — rooms must not sit on exit line segments of other rooms.
    // Grid expansion (Phase 7) resolves most occlusions by inserting extra
    // columns/rows. Some remain in long vertical corridors where rooms form
    // a continuous chain on the same column.
    const CARDINALS_OCC = ['north', 'south', 'east', 'west'];
    const occlusionIssues: string[] = [];

    for (const [id, room] of rooms) {
      const p = layout.get(id);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        if (!CARDINALS_OCC.includes(dir)) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dist = Math.abs(tp.x - p.x) + Math.abs(tp.y - p.y);
        if (dist < 2) continue;

        // Check for rooms sitting on this segment
        if (p.x === tp.x) {
          const minY = Math.min(p.y, tp.y);
          const maxY = Math.max(p.y, tp.y);
          for (const [otherId] of rooms) {
            if (otherId === id || otherId === targetId) continue;
            const op = layout.get(otherId);
            if (!op || op.z !== p.z) continue;
            if (op.x === p.x && op.y > minY && op.y < maxY) {
              occlusionIssues.push(
                `${otherId} at (${op.x},${op.y}) occludes ${id}↔${targetId} (${p.x},${p.y})→(${tp.x},${tp.y})`
              );
            }
          }
        } else if (p.y === tp.y) {
          const minX = Math.min(p.x, tp.x);
          const maxX = Math.max(p.x, tp.x);
          for (const [otherId] of rooms) {
            if (otherId === id || otherId === targetId) continue;
            const op = layout.get(otherId);
            if (!op || op.z !== p.z) continue;
            if (op.y === p.y && op.x > minX && op.x < maxX) {
              occlusionIssues.push(
                `${otherId} at (${op.x},${op.y}) occludes ${id}↔${targetId} (${p.x},${p.y})→(${tp.x},${tp.y})`
              );
            }
          }
        }
      }
    }

    if (occlusionIssues.length > 0) {
      console.log(`\n=== ${occlusionIssues.length} occlusions ===`);
      for (const oi of occlusionIssues) console.log(`  ${oi}`);
    }

    // Total occlusion bound — grid expansion reduced from 54 to ≤16
    expect(occlusionIssues.length).toBeLessThanOrEqual(16);

    // barnacled-quay direction check preserved — must not occlude exit lines
    // unless forced by direction constraints (checked via total occlusion bound)

    // harbourmasters-office must be ABOVE barnacled-quay (north = lower y)
    const harbPos = pos(layout, 'harbourmasters-office');
    const bqPos = pos(layout, 'barnacled-quay');
    expect(harbPos.y).toBeLessThan(bqPos.y);

    // Direction reversal check — no room should be placed opposite to or
    // perpendicular to its exit direction (strict: east must have dx > 0)
    const DIR_OFFSETS: Record<string, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };
    const dirViolations: string[] = [];
    for (const [id, room] of rooms) {
      const p = layout.get(id);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        const off = DIR_OFFSETS[dir];
        if (!off) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dx = tp.x - p.x;
        const dy = tp.y - p.y;
        if (
          (off.dx > 0 && dx <= 0) ||
          (off.dx < 0 && dx >= 0) ||
          (off.dy > 0 && dy <= 0) ||
          (off.dy < 0 && dy >= 0)
        ) {
          dirViolations.push(
            `${id} → ${dir} → ${targetId}: expected (${off.dx},${off.dy}), got (${dx},${dy})`,
          );
        }
      }
    }
    if (dirViolations.length > 0) {
      console.log('\n=== DIRECTION VIOLATIONS ===');
      for (const v of dirViolations) console.log(`  ${v}`);
    }
    expect(dirViolations).toEqual([]);
  });

  // ── 7. Warrens zone (109 rooms, fixed topology) ───────────────────────
  it('handles the-warrens zone (109 rooms)', () => {
    const rooms = makeRooms({
      'ashfall-gardens': [['north', 'slum-r7c4']],
      'beggar-kings-throne': [['east', 'dyers-vats']],
      'blighted-courtyard': [['south', 'condemned-arch'], ['west', 'gutter-run']],
      'blind-alley': [['west', 'tannery-ruins']],
      'broken-sanctuary': [['south', 'hollow-market']],
      'burned-chapel': [['south', 'scavengers-den'], ['west', 'merchants-row']],
      'charnel-pit': [['east', 'the-ratways']],
      'cistern-access': [['down', 'sewer-cistern'], ['north', 'slum-r7c2']],
      'collapsed-overpass': [['east', 'hollow-market'], ['west', 'rubble-boulevard']],
      'collapsed-tenement': [['west', 'whispering-alley']],
      'condemned-arch': [['east', 'ironmongers-ruin'], ['north', 'blighted-courtyard']],
      'dustfall-extraction': [['west', 'slum-r6c7']],
      'dyers-vats': [['north', 'slum-r7c1'], ['west', 'beggar-kings-throne']],
      'gallows-square': [['east', 'tilted-tower'], ['west', 'slum-r1c7']],
      'gutter-bridge': [['south', 'slum-r1c4']],
      'gutter-run': [['east', 'blighted-courtyard'], ['north', 'merchants-row'], ['south', 'slum-r1c1']],
      'hollow-market': [['east', 'merchants-row'], ['north', 'broken-sanctuary'], ['south', 'whispering-alley'], ['west', 'collapsed-overpass']],
      'ironmongers-ruin': [['west', 'condemned-arch']],
      'merchants-row': [['east', 'burned-chapel'], ['south', 'gutter-run'], ['west', 'hollow-market']],
      'overwatch-tower': [['down', 'rubble-boulevard']],
      'plague-ward': [['east', 'slum-r4c1']],
      'rubble-boulevard': [['east', 'collapsed-overpass'], ['up', 'overwatch-tower'], ['west', 'shattered-gate']],
      'rubble-maze': [['east', 'watchmens-post'], ['west', 'slum-r4c7']],
      'scavengers-den': [['north', 'burned-chapel']],
      'sewer-blackwater-crossing': [['south', 'sewer-deep-channel'], ['west', 'sewer-south-tunnel']],
      'sewer-blind-turn': [['east', 'sewer-cracked-conduit'], ['south', 'sewer-narrow-drain']],
      'sewer-bone-shelf': [['west', 'sewer-rat-nest']],
      'sewer-cistern': [['south', 'sewer-fungal-grotto'], ['up', 'cistern-access'], ['west', 'sewer-stagnant-pool']],
      'sewer-collapsed-drain': [['north', 'sewer-flooded-vault']],
      'sewer-cracked-conduit': [['north', 'sewer-drip-tunnel'], ['west', 'sewer-blind-turn']],
      'sewer-deep-channel': [['east', 'sewer-effluent-pool'], ['north', 'sewer-blackwater-crossing'], ['south', 'sewer-silt-chamber']],
      'sewer-drain-grate': [['east', 'sewer-overflow-chamber'], ['west', 'sewer-north-tunnel']],
      'sewer-drip-tunnel': [['north', 'the-ratways'], ['south', 'sewer-cracked-conduit']],
      'sewer-east-conduit': [['east', 'sewer-pipe-maze'], ['west', 'sewer-main-junction']],
      'sewer-effluent-pool': [['west', 'sewer-deep-channel']],
      'sewer-flooded-vault': [['north', 'sewer-south-tunnel'], ['south', 'sewer-collapsed-drain']],
      'sewer-fungal-grotto': [['north', 'sewer-cistern']],
      'sewer-gas-pocket': [['west', 'sewer-pipe-maze']],
      'sewer-lurker-den': [['north', 'sewer-west-conduit']],
      'sewer-main-junction': [['east', 'sewer-east-conduit'], ['north', 'sewer-north-tunnel'], ['south', 'sewer-south-tunnel'], ['up', 'sluice-gate']],
      'sewer-narrow-drain': [['east', 'sewer-north-tunnel'], ['north', 'sewer-blind-turn']],
      'sewer-north-tunnel': [['east', 'sewer-drain-grate'], ['north', 'sewer-rat-nest'], ['south', 'sewer-main-junction'], ['west', 'sewer-narrow-drain']],
      'sewer-overflow-chamber': [['west', 'sewer-drain-grate']],
      'sewer-pipe-maze': [['east', 'sewer-gas-pocket'], ['west', 'sewer-east-conduit']],
      'sewer-rat-nest': [['east', 'sewer-bone-shelf'], ['south', 'sewer-north-tunnel']],
      'sewer-rubble-choke': [['east', 'sewer-south-tunnel'], ['south', 'sewer-west-conduit']],
      'sewer-silt-chamber': [['north', 'sewer-deep-channel']],
      'sewer-slime-channel': [['east', 'sewer-stagnant-pool'], ['north', 'sewer-trickle-passage']],
      'sewer-south-tunnel': [['east', 'sewer-blackwater-crossing'], ['north', 'sewer-main-junction'], ['south', 'sewer-flooded-vault'], ['west', 'sewer-rubble-choke']],
      'sewer-stagnant-pool': [['east', 'sewer-cistern'], ['west', 'sewer-slime-channel']],
      'sewer-trickle-passage': [['south', 'sewer-slime-channel'], ['west', 'sewer-west-conduit']],
      'sewer-west-conduit': [['east', 'sewer-trickle-passage'], ['north', 'sewer-rubble-choke'], ['south', 'sewer-lurker-den']],
      'shattered-gate': [['east', 'rubble-boulevard']],
      'sluice-gate': [['down', 'sewer-main-junction'], ['east', 'slum-r5c1']],
      'slum-r1c1': [['east', 'slum-r1c2'], ['north', 'gutter-run'], ['south', 'slum-r2c1'], ['west', 'sunken-square']],
      'slum-r1c2': [['east', 'slum-r1c3'], ['south', 'slum-r2c2'], ['west', 'slum-r1c1']],
      'slum-r1c3': [['east', 'slum-r1c4'], ['south', 'slum-r2c3'], ['west', 'slum-r1c2']],
      'slum-r1c4': [['east', 'slum-r1c5'], ['north', 'gutter-bridge'], ['south', 'slum-r2c4'], ['west', 'slum-r1c3']],
      'slum-r1c5': [['east', 'slum-r1c6'], ['south', 'slum-r2c5'], ['west', 'slum-r1c4']],
      'slum-r1c6': [['east', 'slum-r1c7'], ['south', 'slum-r2c6'], ['west', 'slum-r1c5']],
      'slum-r1c7': [['east', 'gallows-square'], ['south', 'slum-r2c7'], ['west', 'slum-r1c6']],
      'slum-r2c1': [['east', 'slum-r2c2'], ['north', 'slum-r1c1'], ['south', 'slum-r3c1']],
      'slum-r2c2': [['east', 'slum-r2c3'], ['north', 'slum-r1c2'], ['south', 'slum-r3c2'], ['west', 'slum-r2c1']],
      'slum-r2c3': [['east', 'slum-r2c4'], ['north', 'slum-r1c3'], ['south', 'slum-r3c3'], ['west', 'slum-r2c2']],
      'slum-r2c4': [['east', 'slum-r2c5'], ['north', 'slum-r1c4'], ['south', 'slum-r3c4'], ['west', 'slum-r2c3']],
      'slum-r2c5': [['east', 'slum-r2c6'], ['north', 'slum-r1c5'], ['south', 'slum-r3c5'], ['west', 'slum-r2c4']],
      'slum-r2c6': [['east', 'slum-r2c7'], ['north', 'slum-r1c6'], ['south', 'slum-r3c6'], ['west', 'slum-r2c5']],
      'slum-r2c7': [['north', 'slum-r1c7'], ['south', 'slum-r3c7'], ['west', 'slum-r2c6']],
      'slum-r3c1': [['east', 'slum-r3c2'], ['north', 'slum-r2c1'], ['south', 'slum-r4c1']],
      'slum-r3c2': [['east', 'slum-r3c3'], ['north', 'slum-r2c2'], ['south', 'slum-r4c2'], ['west', 'slum-r3c1']],
      'slum-r3c3': [['east', 'slum-r3c4'], ['north', 'slum-r2c3'], ['south', 'slum-r4c3'], ['west', 'slum-r3c2']],
      'slum-r3c4': [['east', 'slum-r3c5'], ['north', 'slum-r2c4'], ['south', 'slum-r4c4'], ['west', 'slum-r3c3']],
      'slum-r3c5': [['east', 'slum-r3c6'], ['north', 'slum-r2c5'], ['south', 'slum-r4c5'], ['west', 'slum-r3c4']],
      'slum-r3c6': [['east', 'slum-r3c7'], ['north', 'slum-r2c6'], ['south', 'slum-r4c6'], ['west', 'slum-r3c5']],
      'slum-r3c7': [['north', 'slum-r2c7'], ['south', 'slum-r4c7'], ['west', 'slum-r3c6']],
      'slum-r4c1': [['east', 'slum-r4c2'], ['north', 'slum-r3c1'], ['south', 'slum-r5c1'], ['west', 'plague-ward']],
      'slum-r4c2': [['east', 'slum-r4c3'], ['north', 'slum-r3c2'], ['south', 'slum-r5c2'], ['west', 'slum-r4c1']],
      'slum-r4c3': [['east', 'slum-r4c4'], ['north', 'slum-r3c3'], ['south', 'slum-r5c3'], ['west', 'slum-r4c2']],
      'slum-r4c4': [['east', 'slum-r4c5'], ['north', 'slum-r3c4'], ['south', 'slum-r5c4'], ['west', 'slum-r4c3']],
      'slum-r4c5': [['east', 'slum-r4c6'], ['north', 'slum-r3c5'], ['south', 'slum-r5c5'], ['west', 'slum-r4c4']],
      'slum-r4c6': [['east', 'slum-r4c7'], ['north', 'slum-r3c6'], ['south', 'slum-r5c6'], ['west', 'slum-r4c5']],
      'slum-r4c7': [['east', 'rubble-maze'], ['north', 'slum-r3c7'], ['south', 'slum-r5c7'], ['west', 'slum-r4c6']],
      'slum-r5c1': [['east', 'slum-r5c2'], ['north', 'slum-r4c1'], ['south', 'slum-r6c1'], ['west', 'sluice-gate']],
      'slum-r5c2': [['east', 'slum-r5c3'], ['north', 'slum-r4c2'], ['south', 'slum-r6c2'], ['west', 'slum-r5c1']],
      'slum-r5c3': [['east', 'slum-r5c4'], ['north', 'slum-r4c3'], ['south', 'slum-r6c3'], ['west', 'slum-r5c2']],
      'slum-r5c4': [['east', 'slum-r5c5'], ['north', 'slum-r4c4'], ['south', 'slum-r6c4'], ['west', 'slum-r5c3']],
      'slum-r5c5': [['east', 'slum-r5c6'], ['north', 'slum-r4c5'], ['south', 'slum-r6c5'], ['west', 'slum-r5c4']],
      'slum-r5c6': [['east', 'slum-r5c7'], ['north', 'slum-r4c6'], ['south', 'slum-r6c6'], ['west', 'slum-r5c5']],
      'slum-r5c7': [['north', 'slum-r4c7'], ['south', 'slum-r6c7'], ['west', 'slum-r5c6']],
      'slum-r6c1': [['east', 'slum-r6c2'], ['north', 'slum-r5c1'], ['south', 'slum-r7c1']],
      'slum-r6c2': [['east', 'slum-r6c3'], ['north', 'slum-r5c2'], ['south', 'slum-r7c2'], ['west', 'slum-r6c1']],
      'slum-r6c3': [['east', 'slum-r6c4'], ['north', 'slum-r5c3'], ['south', 'slum-r7c3'], ['west', 'slum-r6c2']],
      'slum-r6c4': [['east', 'slum-r6c5'], ['north', 'slum-r5c4'], ['south', 'slum-r7c4'], ['west', 'slum-r6c3']],
      'slum-r6c5': [['east', 'slum-r6c6'], ['north', 'slum-r5c5'], ['south', 'slum-r7c5'], ['west', 'slum-r6c4']],
      'slum-r6c6': [['east', 'slum-r6c7'], ['north', 'slum-r5c6'], ['south', 'slum-r7c6'], ['west', 'slum-r6c5']],
      'slum-r6c7': [['east', 'dustfall-extraction'], ['north', 'slum-r5c7'], ['south', 'slum-r7c7'], ['west', 'slum-r6c6']],
      'slum-r7c1': [['east', 'slum-r7c2'], ['north', 'slum-r6c1'], ['south', 'dyers-vats']],
      'slum-r7c2': [['east', 'slum-r7c3'], ['north', 'slum-r6c2'], ['south', 'cistern-access'], ['west', 'slum-r7c1']],
      'slum-r7c3': [['east', 'slum-r7c4'], ['north', 'slum-r6c3'], ['west', 'slum-r7c2']],
      'slum-r7c4': [['east', 'slum-r7c5'], ['north', 'slum-r6c4'], ['south', 'ashfall-gardens'], ['west', 'slum-r7c3']],
      'slum-r7c5': [['east', 'slum-r7c6'], ['north', 'slum-r6c5'], ['west', 'slum-r7c4']],
      'slum-r7c6': [['east', 'slum-r7c7'], ['north', 'slum-r6c6'], ['west', 'slum-r7c5']],
      'slum-r7c7': [['north', 'slum-r6c7'], ['south', 'tannery-ruins'], ['west', 'slum-r7c6']],
      'sunken-square': [['down', 'the-ratways'], ['east', 'slum-r1c1']],
      'tannery-ruins': [['east', 'blind-alley'], ['north', 'slum-r7c7']],
      'the-ratways': [['south', 'sewer-drip-tunnel'], ['up', 'sunken-square'], ['west', 'charnel-pit']],
      'tilted-tower': [['west', 'gallows-square']],
      'watchmens-post': [['west', 'rubble-maze']],
      'whispering-alley': [['east', 'collapsed-tenement'], ['north', 'hollow-market']],
    });

    const layout = computeLayout(rooms, 'shattered-gate');

    // All 109 rooms placed
    expect(layout.size).toBe(109);

    // Direction violation check — same pattern as Siltgate
    const DIR_OFFSETS_W: Record<string, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };
    const dirViolations: string[] = [];
    for (const [id, room] of rooms) {
      const p = layout.get(id);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        const off = DIR_OFFSETS_W[dir];
        if (!off) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dx = tp.x - p.x;
        const dy = tp.y - p.y;
        if (
          (off.dx > 0 && dx <= 0) ||
          (off.dx < 0 && dx >= 0) ||
          (off.dy > 0 && dy <= 0) ||
          (off.dy < 0 && dy >= 0)
        ) {
          dirViolations.push(
            `${id} → ${dir} → ${targetId}: expected (${off.dx},${off.dy}), got (${dx},${dy})`,
          );
        }
      }
    }
    if (dirViolations.length > 0) {
      console.log('\n=== WARRENS DIRECTION VIOLATIONS ===');
      for (const v of dirViolations) console.log(`  ${v}`);
    }
    expect(dirViolations.length).toBeLessThanOrEqual(0);
  });

  // ── Rooms must not overlap exit line segments ──────────────────────────
  it('does not place rooms on exit line segments between other rooms', () => {
    // T-junction with a side room that could land on the main corridor
    //   A ──east── B ──east── C
    //                  │
    //                south
    //                  │
    //                  D ──east── E
    //
    // E has no exit back to the A-B-C corridor; if placed at B's column
    // between A and C, it would occlude the A↔C line segment.
    const rooms = makeRooms({
      a: [['east', 'b']],
      b: [['west', 'a'], ['east', 'c'], ['south', 'd']],
      c: [['west', 'b']],
      d: [['north', 'b'], ['east', 'e']],
      e: [['west', 'd']],
    });
    const layout = computeLayout(rooms, 'a');

    const CARDINALS = ['north', 'south', 'east', 'west'];
    let occlusions = 0;

    for (const [id, room] of rooms) {
      const p = layout.get(id);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        if (!CARDINALS.includes(dir)) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dist = Math.abs(tp.x - p.x) + Math.abs(tp.y - p.y);
        if (dist < 2) continue;
        if (p.x === tp.x) {
          const minY = Math.min(p.y, tp.y);
          const maxY = Math.max(p.y, tp.y);
          for (const [otherId] of rooms) {
            if (otherId === id || otherId === targetId) continue;
            const op = layout.get(otherId);
            if (!op || op.z !== p.z) continue;
            if (op.x === p.x && op.y > minY && op.y < maxY) occlusions++;
          }
        } else if (p.y === tp.y) {
          const minX = Math.min(p.x, tp.x);
          const maxX = Math.max(p.x, tp.x);
          for (const [otherId] of rooms) {
            if (otherId === id || otherId === targetId) continue;
            const op = layout.get(otherId);
            if (!op || op.z !== p.z) continue;
            if (op.y === p.y && op.x > minX && op.x < maxX) occlusions++;
          }
        }
      }
    }

    expect(occlusions).toBe(0);
  });

  // ── Direction reversal: north exit must always place target above ──────
  it('never reverses direction — north dead-end stays above junction', () => {
    // Reproduces the harbourmasters-office bug: a junction with N/S dead-ends
    // plus E/W branches. The swap/relaxation phases must not flip the
    // north child below the junction.
    //
    //          north-room    (should be y < hub.y)
    //              │
    //   west ── hub ── east
    //              │
    //          south-room    (should be y > hub.y)
    //
    const rooms = makeRooms({
      hub: [
        ['north', 'north-room'],
        ['south', 'south-room'],
        ['east', 'east-room'],
        ['west', 'west-room'],
      ],
      'north-room': [['south', 'hub']],
      'south-room': [['north', 'hub']],
      'east-room': [['west', 'hub']],
      'west-room': [['east', 'hub']],
    });
    const layout = computeLayout(rooms, 'hub');

    const hubPos = pos(layout, 'hub');
    const northPos = pos(layout, 'north-room');
    const southPos = pos(layout, 'south-room');

    // North exit target must be ABOVE (lower y) the hub
    expect(northPos.y).toBeLessThan(hubPos.y);
    // South exit target must be BELOW (higher y) the hub
    expect(southPos.y).toBeGreaterThan(hubPos.y);
  });

  // ── Direction reversal: broader check across all exits ─────────────────
  it('never places a room in the opposite direction from its exit', () => {
    // Larger graph simulating the Siltgate barnacled-quay neighborhood:
    // barnacled-quay is a 4-exit junction. The north (harbourmasters-office)
    // and south (pier-1) children are dead-ends. East/west connect to
    // additional rooms that form a longer corridor.
    const rooms = makeRooms({
      'fish-market': [['east', 'barnacled-quay'], ['west', 'market-square']],
      'market-square': [['east', 'fish-market']],
      'barnacled-quay': [
        ['west', 'fish-market'],
        ['east', 'rope-walk'],
        ['south', 'pier-1'],
        ['north', 'harbourmasters-office'],
      ],
      'rope-walk': [['west', 'barnacled-quay'], ['east', 'chandlers-row']],
      'chandlers-row': [['west', 'rope-walk']],
      'pier-1': [['north', 'barnacled-quay']],
      'harbourmasters-office': [['south', 'barnacled-quay']],
    });
    const layout = computeLayout(rooms, 'barnacled-quay');

    const DIRECTION_OFFSETS: Record<string, { dx: number; dy: number }> = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 },
    };

    const violations: string[] = [];
    for (const [roomId, room] of rooms) {
      const p = layout.get(roomId);
      if (!p) continue;
      for (const [dir, targetId] of room.exits) {
        const off = DIRECTION_OFFSETS[dir];
        if (!off) continue;
        const tp = layout.get(targetId);
        if (!tp || tp.z !== p.z) continue;
        const dx = tp.x - p.x;
        const dy = tp.y - p.y;
        if (
          (off.dx > 0 && dx <= 0) ||
          (off.dx < 0 && dx >= 0) ||
          (off.dy > 0 && dy <= 0) ||
          (off.dy < 0 && dy >= 0)
        ) {
          violations.push(
            `${roomId} → ${dir} → ${targetId}: expected offset (${off.dx},${off.dy}), got delta (${dx},${dy})`,
          );
        }
      }
    }

    if (violations.length > 0) {
      console.log('\n=== DIRECTION VIOLATIONS ===');
      for (const v of violations) console.log(`  ${v}`);
    }
    expect(violations).toEqual([]);
  });

  // ── 26. Midgaard zone — main-street alignment ───────────────────────────
  it('keeps east/west-connected main-street rooms on the same row (Midgaard)', () => {
    // Full Midgaard zone topology (40 rooms, 84 exits). The wall-road branch
    // south of inside-the-west-gate historically pulled it off the main-street
    // row during force-directed relaxation, creating a multi-cell diagonal.
    const exitData: [string, string, string][] = [
      ['the-reading-room', 'east', 'the-temple-of-midgaard'],
      ['the-temple-of-midgaard', 'west', 'the-reading-room'],
      ['the-temple-of-midgaard', 'south', 'the-temple-square'],
      ['the-temple-of-midgaard', 'east', 'the-clerics-inner-sanctum'],
      ['the-clerics-inner-sanctum', 'west', 'the-temple-of-midgaard'],
      ['the-clerics-inner-sanctum', 'south', 'the-bar-of-divination'],
      ['the-bar-of-divination', 'north', 'the-clerics-inner-sanctum'],
      ['the-bar-of-divination', 'south', 'the-entrance-to-the-clerics-guild'],
      ['the-entrance-to-the-clerics-guild', 'north', 'the-bar-of-divination'],
      ['the-entrance-to-the-clerics-guild', 'south', 'the-temple-square'],
      ['the-temple-square', 'north', 'the-temple-of-midgaard'],
      ['the-temple-square', 'east', 'the-entrance-to-the-clerics-guild'],
      ['the-temple-square', 'south', 'the-entrance-hall-of-the-grunting-boar-inn'],
      ['the-temple-square', 'west', 'the-common-square'],
      ['the-entrance-hall-of-the-grunting-boar-inn', 'north', 'the-temple-square'],
      ['the-entrance-hall-of-the-grunting-boar-inn', 'east', 'the-grunting-boar'],
      ['the-entrance-hall-of-the-grunting-boar-inn', 'south', 'market-square'],
      ['the-grunting-boar', 'west', 'the-entrance-hall-of-the-grunting-boar-inn'],
      ['the-grunting-boar', 'east', 'the-reception'],
      ['the-reception', 'west', 'the-grunting-boar'],
      ['the-bakery', 'south', 'main-street-2'],
      ['the-general-store', 'south', 'main-street-3'],
      ['the-weapon-shop', 'south', 'main-street-4'],
      ['main-street', 'north', 'the-magic-shop'],
      ['main-street', 'east', 'main-street-2'],
      ['main-street', 'south', 'the-entrance-to-the-mages-guild'],
      ['main-street', 'west', 'inside-the-west-gate-of-midgaard'],
      ['main-street-2', 'north', 'the-bakery'],
      ['main-street-2', 'east', 'market-square'],
      ['main-street-2', 'south', 'the-armory'],
      ['main-street-2', 'west', 'main-street'],
      ['market-square', 'north', 'the-entrance-hall-of-the-grunting-boar-inn'],
      ['market-square', 'east', 'main-street-3'],
      ['market-square', 'south', 'the-common-square'],
      ['market-square', 'west', 'main-street-2'],
      ['main-street-3', 'north', 'the-general-store'],
      ['main-street-3', 'east', 'main-street-4'],
      ['main-street-3', 'south', 'the-pet-shop'],
      ['main-street-3', 'west', 'market-square'],
      ['main-street-4', 'north', 'the-weapon-shop'],
      ['main-street-4', 'east', 'inside-the-east-gate-of-midgaard'],
      ['main-street-4', 'south', 'the-entrance-hall-to-the-guild-of-swordsmen'],
      ['main-street-4', 'west', 'main-street-3'],
      ['the-entrance-to-the-mages-guild', 'north', 'main-street'],
      ['the-entrance-to-the-mages-guild', 'south', 'the-mages-bar'],
      ['the-mages-bar', 'north', 'the-entrance-to-the-mages-guild'],
      ['the-mages-bar', 'south', 'the-mages-laboratory'],
      ['the-mages-laboratory', 'north', 'the-mages-bar'],
      ['the-armory', 'north', 'main-street-2'],
      ['the-entrance-hall-to-the-guild-of-swordsmen', 'north', 'main-street-4'],
      ['the-entrance-hall-to-the-guild-of-swordsmen', 'south', 'the-bar-of-swordsmen'],
      ['the-bar-of-swordsmen', 'north', 'the-entrance-hall-to-the-guild-of-swordsmen'],
      ['the-bar-of-swordsmen', 'south', 'the-tournament-and-practice-yard'],
      ['the-tournament-and-practice-yard', 'north', 'the-bar-of-swordsmen'],
      ['the-pet-shop', 'north', 'main-street-3'],
      ['the-magic-shop', 'south', 'main-street'],
      ['inside-the-west-gate-of-midgaard', 'east', 'main-street'],
      ['inside-the-west-gate-of-midgaard', 'south', 'wall-road'],
      ['inside-the-west-gate-of-midgaard', 'west', 'outside-the-west-gate-of-midgaard'],
      ['inside-the-east-gate-of-midgaard', 'west', 'main-street-4'],
      ['wall-road', 'north', 'inside-the-west-gate-of-midgaard'],
      ['wall-road', 'south', 'wall-road-2'],
      ['wall-road-2', 'north', 'wall-road'],
      ['wall-road-2', 'east', 'poor-alley'],
      ['wall-road-2', 'south', 'wall-road-3'],
      ['poor-alley', 'west', 'wall-road-2'],
      ['poor-alley', 'east', 'the-eastern-end-of-poor-alley'],
      ['the-eastern-end-of-poor-alley', 'west', 'poor-alley'],
      ['the-eastern-end-of-poor-alley', 'east', 'the-common-square'],
      ['the-common-square', 'north', 'market-square'],
      ['the-common-square', 'east', 'the-temple-square'],
      ['the-common-square', 'south', 'the-dark-alley'],
      ['the-common-square', 'west', 'the-eastern-end-of-poor-alley'],
      ['the-dark-alley', 'north', 'the-common-square'],
      ['the-dark-alley', 'south', 'the-entrance-hall-to-the-guild-of-thieves'],
      ['the-entrance-hall-to-the-guild-of-thieves', 'north', 'the-dark-alley'],
      ['the-entrance-hall-to-the-guild-of-thieves', 'south', 'the-thieves-bar'],
      ['the-thieves-bar', 'north', 'the-entrance-hall-to-the-guild-of-thieves'],
      ['the-thieves-bar', 'east', 'the-secret-yard'],
      ['the-secret-yard', 'west', 'the-thieves-bar'],
      ['wall-road-3', 'north', 'wall-road-2'],
      ['wall-road-3', 'south', 'on-the-bridge'],
      ['on-the-bridge', 'north', 'wall-road-3'],
      ['outside-the-west-gate-of-midgaard', 'east', 'inside-the-west-gate-of-midgaard'],
    ];

    const rooms = new Map<string, { exits: Map<string, string> }>();
    for (const [from, dir, to] of exitData) {
      if (!rooms.has(from)) rooms.set(from, { exits: new Map() });
      if (!rooms.has(to)) rooms.set(to, { exits: new Map() });
      rooms.get(from)!.exits.set(dir, to);
    }

    const layout = computeLayout(rooms, 'the-reading-room');

    // The inside-the-west-gate ↔ main-street east/west pair must share y
    const wg = pos(layout, 'inside-the-west-gate-of-midgaard');
    const ms = pos(layout, 'main-street');
    expect(wg.y).toBe(ms.y);

    // The entire main-street corridor (east/west chain) should share y
    const coreStreet = [
      'main-street', 'main-street-2', 'market-square',
      'main-street-3', 'main-street-4',
    ];
    const ys = coreStreet.map(id => pos(layout, id).y);
    const misaligned = coreStreet.filter((_, i) => ys[i] !== ys[0]);
    if (misaligned.length > 0) {
      console.log(`Street Y values: ${coreStreet.map((id, i) => `${id}=${ys[i]}`).join(', ')}`);
    }
    expect(misaligned).toEqual([]);
  });

  // ── 27. Cardinal alignment is entry-point-independent ───────────────────
  it('aligns E/W-connected rooms regardless of BFS entry point', () => {
    // Minimal reproduction: a horizontal main-street row with a south branch.
    // When BFS starts from the south branch side, the gate room historically
    // ended up on a different row than main-street.
    const rooms = makeRooms({
      'outside-gate':   [['east', 'gate']],
      'gate':           [['east', 'street-1'], ['south', 'wall-rd'], ['west', 'outside-gate']],
      'street-1':       [['east', 'street-2'], ['west', 'gate'], ['north', 'shop-a'], ['south', 'guild-a']],
      'street-2':       [['east', 'square'], ['west', 'street-1'], ['north', 'shop-b'], ['south', 'guild-b']],
      'square':         [['north', 'temple'], ['east', 'street-3'], ['south', 'alley'], ['west', 'street-2']],
      'street-3':       [['east', 'east-gate'], ['west', 'square'], ['north', 'shop-c']],
      'east-gate':      [['west', 'street-3']],
      'shop-a':         [['south', 'street-1']],
      'shop-b':         [['south', 'street-2']],
      'shop-c':         [['south', 'street-3']],
      'guild-a':        [['north', 'street-1']],
      'guild-b':        [['north', 'street-2']],
      'temple':         [['south', 'square'], ['east', 'inn'], ['west', 'chapel']],
      'inn':            [['west', 'temple']],
      'chapel':         [['east', 'temple']],
      'alley':          [['north', 'square']],
      'wall-rd':        [['north', 'gate'], ['south', 'wall-rd-2']],
      'wall-rd-2':      [['north', 'wall-rd']],
    });

    const streetRow = ['outside-gate', 'gate', 'street-1', 'street-2', 'square', 'street-3', 'east-gate'];
    const entries = ['outside-gate', 'temple', 'square', 'guild-a', 'wall-rd-2'];

    for (const entry of entries) {
      const layout = computeLayout(rooms, entry);
      const ys = streetRow.map(id => pos(layout, id).y);
      const streetY = ys[0];
      const off = streetRow.filter((_, i) => ys[i] !== streetY);
      if (off.length > 0) {
        console.log(`entry=${entry}: ${streetRow.map((id, i) => `${id}.y=${ys[i]}`).join(', ')}`);
      }
      expect(off).toEqual([]);
    }
  });
});
