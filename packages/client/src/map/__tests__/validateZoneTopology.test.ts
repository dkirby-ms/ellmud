import { describe, it, expect } from 'vitest';
import {
  validateZoneTopology,
  type TopologyValidationResult,
} from '../validateZoneTopology.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ExitDef = [direction: string, target: string];

/** Build a rooms Map<roomId, Map<direction, targetId>> from a definition object. */
function makeExitMap(
  defs: Record<string, ExitDef[]>,
): Map<string, Map<string, string>> {
  const rooms = new Map<string, Map<string, string>>();
  for (const [id, exits] of Object.entries(defs)) {
    rooms.set(id, new Map(exits));
  }
  return rooms;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('validateZoneTopology', () => {
  // ── 1. Simple tree (no cycles) → valid ──────────────────────────────────
  it('reports valid for a simple tree with no cycles', () => {
    const rooms = makeExitMap({
      hub: [['north', 'a'], ['east', 'b'], ['south', 'c']],
      a: [['south', 'hub']],
      b: [['west', 'hub'], ['east', 'd']],
      c: [['north', 'hub']],
      d: [['west', 'b']],
    });

    const result = validateZoneTopology(rooms, 'hub');

    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.collisions).toHaveLength(0);
    expect(result.summary).toContain('valid');
    expect(result.summary).toContain('5 rooms');
  });

  // ── 2. Simple rectangle (offsets sum to 0) → valid ──────────────────────
  it('reports valid for a rectangular cycle where offsets sum to zero', () => {
    //  NW ──east──> NE
    //  │             │
    // south        south
    //  │             │
    //  v             v
    //  SW ──east──> SE
    const rooms = makeExitMap({
      nw: [['east', 'ne'], ['south', 'sw']],
      ne: [['west', 'nw'], ['south', 'se']],
      sw: [['north', 'nw'], ['east', 'se']],
      se: [['north', 'ne'], ['west', 'sw']],
    });

    const result = validateZoneTopology(rooms, 'nw');

    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.collisions).toHaveLength(0);
  });

  // ── 3. Rectangle with mismatched path lengths → conflict ────────────────
  it('detects a conflict when a rectangle has unequal side lengths', () => {
    //  A ──east──> B ──east──> C
    //  │                       │
    // south                  south
    //  │                       │
    //  v                       v
    //  D ────────east────────> E
    //
    // Path to E via top: east+east+south = (2,1)
    // Path to E via bottom: south+east = (1,1)
    // Conflict for E with delta 1.
    const rooms = makeExitMap({
      a: [['east', 'b'], ['south', 'd']],
      b: [['west', 'a'], ['east', 'c']],
      c: [['west', 'b'], ['south', 'e']],
      d: [['north', 'a'], ['east', 'e']],
      e: [['north', 'c']],
    });

    const result = validateZoneTopology(rooms, 'a');

    expect(result.valid).toBe(false);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);

    // Room E should be flagged — reachable at (1,1) via D and (2,1) via C
    const eConflict = result.conflicts.find((c) => c.roomId === 'e');
    expect(eConflict).toBeDefined();
    expect(eConflict!.delta).toBeGreaterThanOrEqual(1);
    expect(eConflict!.paths.length).toBeGreaterThanOrEqual(2);
    expect(result.summary).toContain('conflict');
  });

  // ── 4. Cross-neighborhood shortcut → conflict with large delta ──────────
  it('detects a large-delta conflict from a cross-neighborhood shortcut', () => {
    // start ──south──> p1 ──south──> p2 ──south──> p3 ──south──> p4 ──south──> far
    // start ──east──> shortcut ──south──> far
    //
    // Path to far via south chain: (0,5)
    // Path to far via shortcut: (1,1)
    // Conflict with delta = |0-1| + |5-1| = 5
    const rooms = makeExitMap({
      start: [['south', 'p1'], ['east', 'shortcut']],
      p1: [['north', 'start'], ['south', 'p2']],
      p2: [['north', 'p1'], ['south', 'p3']],
      p3: [['north', 'p2'], ['south', 'p4']],
      p4: [['north', 'p3'], ['south', 'far']],
      shortcut: [['west', 'start'], ['south', 'far']],
      far: [['north', 'shortcut']],
    });

    const result = validateZoneTopology(rooms, 'start');

    expect(result.valid).toBe(false);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);

    const farConflict = result.conflicts.find((c) => c.roomId === 'far');
    expect(farConflict).toBeDefined();
    expect(farConflict!.delta).toBeGreaterThanOrEqual(4);
    expect(result.summary).toContain('conflict');
  });

  // ── 5. Position collision detection ─────────────────────────────────────
  it('detects position collisions when two rooms claim the same cell', () => {
    // A ──east──> B
    // A ──south──> C ──north──> D
    //
    // B is at (1,0). D = C(0,1) + north(0,-1) = (0,0) = same as A.
    // Collision at (0,0): A and D.
    const rooms = makeExitMap({
      a: [['east', 'b'], ['south', 'c']],
      b: [['west', 'a']],
      c: [['north', 'd']],
      d: [['south', 'c']],
    });

    const result = validateZoneTopology(rooms, 'a');

    expect(result.collisions.length).toBeGreaterThanOrEqual(1);
    const collision = result.collisions.find(
      (col) => col.rooms.includes('a') && col.rooms.includes('d'),
    );
    expect(collision).toBeDefined();
    expect(collision!.position).toEqual({ x: 0, y: 0 });
  });

  // ── 6. Up/down with zero displacement ───────────────────────────────────
  it('treats up/down as zero displacement (no spatial offset)', () => {
    // surface ──down──> underground ──up──> surface2
    // surface ──east──> surface2
    //
    // If surface is at (0,0), underground = (0,0), surface2 via up = (0,0).
    // But surface2 via east = (1,0). Conflict for surface2, delta 1.
    const rooms = makeExitMap({
      surface: [['down', 'underground'], ['east', 'surface2']],
      underground: [['up', 'surface2']],
      surface2: [['west', 'surface']],
    });

    const result = validateZoneTopology(rooms, 'surface');

    expect(result.valid).toBe(false);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(1);
  });

  // ── 7. Siltgate zone (136 rooms) → should detect multiple conflicts ─────
  it('detects topological conflicts in the Siltgate zone', () => {
    const rooms = makeExitMap({
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
      'collapsed-building-1': [['north', 'rubble-street-1']],
      'collapsed-building-2': [['south', 'rubble-street-3']],
      'collapsed-building-3': [['west', 'carrion-field']],
      'collapsed-sewer': [['west', 'drain-grate-2']],
      'courtyard-fountain': [['east', 'library-entrance'], ['north', 'noble-residence-1'], ['south', 'promenade-walk-1'], ['west', 'servants-passage']],
      'crumbling-wall-1': [['east', 'bone-pit'], ['north', 'scorched-plaza'], ['south', 'crumbling-wall-2']],
      'crumbling-wall-2': [['north', 'crumbling-wall-1'], ['south', 'plague-house']],
      'dock-street-1': [['east', 'fish-market'], ['north', 'tavern-row'], ['south', 'dock-street-2']],
      'dock-street-2': [['east', 'warehouse-1'], ['north', 'dock-street-1'], ['south', 'dock-street-3']],
      'dock-street-3': [['north', 'dock-street-2'], ['south', 'dock-street-4'], ['west', 'chandlers-shop']],
      'dock-street-4': [['east', 'warehouse-2'], ['north', 'dock-street-3'], ['south', 'dock-street-5']],
      'dock-street-5': [['east', 'narrow-alley-3'], ['north', 'dock-street-4'], ['south', 'tide-gate'], ['west', 'warehouse-3']],
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
      'garden-terrace': [['east', 'observatory'], ['north', 'noble-residence-2'], ['south', 'promenade-walk-3'], ['west', 'iron-balcony-2']],
      'glassblowers-workshop': [['north', 'cobblestone-street-1']],
      'guild-hall': [['down', 'undercity-gate'], ['east', 'cloth-merchants-hall'], ['north', 'jewelers-lane'], ['south', 'silver-arcade-3']],
      'gutter-drain': [['down', 'sewer-junction-1'], ['north', 'narrow-alley-6'], ['south', 'beggar-kings-court']],
      'harbourmasters-office': [['south', 'barnacled-quay']],
      'highwind-bridge': [['north', 'belvedere'], ['south', 'promenade-walk-4']],
      'iron-balcony-1': [['east', 'iron-balcony-2'], ['north', 'promenade-walk-2']],
      'iron-balcony-2': [['east', 'garden-terrace'], ['west', 'iron-balcony-1']],
      'jewelers-lane': [['south', 'guild-hall']],
      'lean-to-camp': [['west', 'narrow-alley-4']],
      'library-entrance': [['west', 'courtyard-fountain']],
      'market-square': [['east', 'bazaar-row-1'], ['north', 'fountain-plaza'], ['south', 'tavern-row'], ['west', 'city-gate']],
      'merchant-inn': [['west', 'cobblestone-street-3']],
      'money-changers-row': [['north', 'bazaar-row-3']],
      'mud-flat': [['north', 'narrow-alley-7'], ['south', 'broken-bridge']],
      'narrow-alley-1': [['north', 'silver-arcade-1'], ['south', 'apothecary']],
      'narrow-alley-2': [['north', 'cobblestone-street-2'], ['south', 'wine-merchants-cellar']],
      'narrow-alley-3': [['north', 'beggars-lane-1'], ['south', 'narrow-alley-4'], ['west', 'dock-street-5']],
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
      'promenade-walk-3': [['east', 'promenade-walk-4'], ['north', 'garden-terrace'], ['west', 'promenade-walk-2']],
      'promenade-walk-4': [['north', 'highwind-bridge'], ['west', 'promenade-walk-3']],
      'rat-run-1': [['east', 'flophouse'], ['north', 'beggars-lane-2'], ['south', 'rat-run-2']],
      'rat-run-2': [['east', 'thieves-den'], ['north', 'rat-run-1']],
      'rope-walk': [['east', 'tar-pit'], ['north', 'sailmakers-loft'], ['south', 'pier-2'], ['west', 'barnacled-quay']],
      'rubble-street-1': [['east', 'rubble-street-2'], ['south', 'collapsed-building-1'], ['west', 'beggars-lane-3']],
      'rubble-street-2': [['east', 'rubble-street-3'], ['south', 'scorched-plaza'], ['west', 'rubble-street-1']],
      'rubble-street-3': [['east', 'rubble-street-4'], ['north', 'collapsed-building-2'], ['west', 'rubble-street-2']],
      'rubble-street-4': [['east', 'rubble-street-5'], ['south', 'dust-bowl'], ['west', 'rubble-street-3']],
      'rubble-street-5': [['east', 'ashgate'], ['south', 'wrecked-barricade'], ['west', 'rubble-street-4']],
      'ruined-tenement-1': [['north', 'pawn-alley']],
      'ruined-tenement-2': [['west', 'beggar-kings-court']],
      'sailmakers-loft': [['south', 'rope-walk']],
      'scavengers-market': [['east', 'blast-crater'], ['north', 'carrion-field'], ['south', 'ash-garden']],
      'scorched-plaza': [['east', 'carrion-field'], ['north', 'rubble-street-2'], ['south', 'crumbling-wall-1'], ['west', 'tar-pit']],
      'scribe-corner': [['west', 'tavern-row']],
      'serpent-den': [['west', 'sewer-tunnel-3']],
      'servants-passage': [['east', 'courtyard-fountain']],
      'sewer-cistern-1': [['north', 'sewer-tunnel-5']],
      'sewer-junction-1': [['east', 'sewer-tunnel-1'], ['north', 'undercity-gate'], ['south', 'sewer-tunnel-3'], ['up', 'gutter-drain'], ['west', 'sewer-tunnel-7']],
      'sewer-junction-2': [['east', 'sewer-tunnel-4'], ['north', 'drain-grate-1'], ['south', 'bone-canal'], ['west', 'sewer-tunnel-2']],
      'sewer-junction-3': [['east', 'sewer-tunnel-6'], ['south', 'drain-grate-2'], ['up', 'tide-gate'], ['west', 'sewer-tunnel-5']],
      'sewer-tunnel-1': [['east', 'sewer-tunnel-2'], ['west', 'sewer-junction-1']],
      'sewer-tunnel-2': [['east', 'sewer-junction-2'], ['west', 'sewer-tunnel-1']],
      'sewer-tunnel-3': [['east', 'serpent-den'], ['north', 'sewer-junction-1'], ['south', 'silt-pool']],
      'sewer-tunnel-4': [['east', 'sewer-tunnel-5'], ['west', 'sewer-junction-2']],
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

    const result = validateZoneTopology(rooms, 'market-square');

    // The Siltgate has known topological issues:
    // - dock-street-5 ↔ narrow-alley-3 cross-neighborhood shortcut
    // - sewer system vertical shortcuts (guild-hall/undercity-gate, gutter-drain, tide-gate)
    // - ring topologies in the sewer network
    expect(result.valid).toBe(false);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(4);
    expect(result.conflicts.length).toBeLessThanOrEqual(10);

    // At least one conflict should have a large delta (cross-neighborhood)
    const maxDelta = Math.max(...result.conflicts.map((c) => c.delta));
    expect(maxDelta).toBeGreaterThanOrEqual(3);

    // Summary should be human-readable
    expect(result.summary).toContain('conflict');
    expect(result.summary).toMatch(/\d+ rooms analyzed/);

    // Log diagnostics for zone designers
    console.log(`\n=== Siltgate Topology Validation ===`);
    console.log(result.summary);
    for (const c of result.conflicts) {
      const positions = c.paths
        .map((p) => `via ${p.via}: (${p.idealPos.x},${p.idealPos.y})`)
        .join(' vs ');
      console.log(`  CONFLICT: ${c.roomId} — delta ${c.delta} — ${positions}`);
    }
    if (result.collisions.length > 0) {
      console.log(`  ${result.collisions.length} position collisions`);
    }
  });

  // ── 8. Warrens zone (109 rooms, fixed topology) → valid ─────────────────
  it('validates the-warrens zone topology (fixed)', () => {
    const rooms = makeExitMap({
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

    const result = validateZoneTopology(rooms, 'shattered-gate');

    // Fixed topology: 0 BFS conflicts, all 109 rooms reachable
    expect(result.conflicts).toHaveLength(0);
    expect(result.summary).toContain('109 rooms');

    // Position collisions are expected (up/down overlaps between surface and sewer
    // levels share the same x,y). The key metric is 0 topological conflicts.
    // Collisions ≤ 22 per Laeral's spec (expected sewer-under-grid overlaps).
    expect(result.collisions.length).toBeLessThanOrEqual(22);

    // Log diagnostics
    console.log(`\n=== Warrens Topology Validation (Fixed) ===`);
    console.log(result.summary);
    if (result.collisions.length > 0) {
      console.log(`  ${result.collisions.length} position collisions (expected up/down overlaps)`);
    }
  });

  // ── 9. Handles empty/missing start room gracefully ──────────────────────
  it('returns valid with 1 room for a single-room zone', () => {
    const rooms = makeExitMap({ solo: [] });
    const result = validateZoneTopology(rooms, 'solo');

    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
    expect(result.collisions).toHaveLength(0);
    expect(result.summary).toContain('1 rooms');
  });

  // ── 10. Up/down pairs at same column → valid ────────────────────────────
  it('reports valid when up/down pairs connect rooms at the same column', () => {
    const rooms = makeExitMap({
      surface: [['down', 'cellar'], ['east', 'yard']],
      cellar: [['up', 'surface']],
      yard: [['west', 'surface']],
    });

    const result = validateZoneTopology(rooms, 'surface');

    expect(result.valid).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });
});
