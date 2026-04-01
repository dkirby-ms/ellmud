/**
 * Procedural shard graph generator.
 * Creates deterministic room graphs from a seed for shard instances.
 *
 * Algorithm:
 *  1. Determine room count from tier
 *  2. Place anchor rooms (entries, boss)
 *  3. Fill remaining slots with corridor/junction/dead_end rooms
 *  4. Build a spanning tree for connectivity, then add cycles
 *  5. Apply room templates for names/descriptions
 *  6. Place loot containers
 */

import type {
  ShardTier,
  Room,
  RoomGraph,
  RoomType,
  LootContainer,
  HazardPlaceholder,
} from '@ellmud/shared';
import { ALL_DIRECTIONS, OPPOSITE_DIRECTION } from '@ellmud/shared';

import { createPRNG, type PRNG } from './prng.js';

// ─── Room Templates (inlined from former flooded-crypt biome) ───────────────

export const ROOM_NAMES: Record<RoomType, readonly string[]> = {
  entry: ['Drowned Vestibule', 'Sunken Threshold', 'Waterlogged Gate', 'Flooded Antechamber'],
  boss: ['Sanctum of the Drowned', 'Revenants\' Throne', 'The Ossuary Heart'],
  corridor: ['Submerged Gallery', 'Waterlogged Passage', 'Dripping Corridor', 'Moss-Choked Tunnel', 'Brackish Channel', 'Sunken Walkway', 'Fungal-Lit Passage', 'Silted Hallway'],
  junction: ['Flooded Crossroads', 'Tidal Junction', 'Rotting Intersection', 'Branching Cistern', 'Cracked Atrium', 'Collapsed Forum'],
  dead_end: ['Waterlogged Alcove', 'Sealed Reliquary', 'Drowned Cell', 'Stagnant Niche', 'Bone-Strewn Recess'],
  feature_stash: ['Secure Alcove'],
  feature_expedition_board: ['Etched Vestibule'],
  feature_marketplace: ['Sunken Bazaar'],
  feature_crafting: ['Flooded Workshop'],
  feature_training: ['Drowned Sparring Hall'],
  feature_contracts: ['Waterlogged Notice Board'],
  feature_infirmary: ['Damp Infirmary'],
};

const ROOM_DESCRIPTIONS: Record<RoomType, readonly string[]> = {
  entry: [
    'Pale light seeps through cracked stone above. Ankle-deep water sloshes with each step. This is where the dungeon begins — and where retreat is still possible.',
    'A jagged opening in the earth leads down into darkness. Water drips steadily from the ceiling, pooling on worn flagstones.',
  ],
  boss: [
    'The water here is waist-deep and unnervingly still. Ancient pillars ring a raised stone platform. Something stirs beneath the surface — something that has waited a very long time.',
    'A vast chamber opens before you, its ceiling lost in shadow. The air is thick with the stench of brine and old death. The water pulses with a slow, rhythmic current, as if the crypt itself breathes.',
  ],
  corridor: [
    'Water seeps through cracks in the stone walls. The passage stretches ahead, slick and dark.',
    'Dripping echoes fill this narrow tunnel. The flagstones are uneven, some submerged entirely.',
    'Green algae clings to the walls. The water here is knee-deep and murky.',
    'A long gallery, its walls lined with empty niches. Water laps gently against eroded stone.',
  ],
  junction: [
    'Several passages branch from this flooded chamber. Water flows in conflicting directions, making it impossible to tell which path leads deeper.',
    'A wide room where corridors converge. The ceiling is higher here, and the sound of dripping echoes from every direction.',
  ],
  dead_end: [
    'The passage narrows to nothing. Water pools here, deeper than elsewhere — something may be hidden beneath.',
    'A collapsed wall blocks further progress. Among the rubble, you spot the glint of something half-buried.',
    'A small alcove, barely large enough to stand in. The walls are carved with worn symbols.',
  ],
  feature_stash: ['A recessed alcove sealed by a heavy iron grate. The air smells of rust and damp cloth.'],
  feature_expedition_board: ['Faded etchings cover a smooth stone slab set into the wall. Notices have been pinned with bone splints.'],
  feature_marketplace: ['A vaulted chamber where merchants once gathered. Waterlogged stalls line the perimeter.'],
  feature_crafting: ['Workbenches and scattered tools suggest this was once a place of making. The forge is cold.'],
  feature_training: ['A wide, low-ceilinged room with weapon racks and scarred practice dummies.'],
  feature_contracts: ['A sodden board mounted on the wall bears curled parchment — bounties and tasks, half-legible.'],
  feature_infirmary: ['Stone cots line the walls. A faint herbal scent lingers beneath the ever-present damp.'],
};

interface LootEntry {
  itemId: string;
  weight: number;
  type: 'crate' | 'chest' | 'altar' | 'corpse';
}

const LOOT_TABLE: readonly LootEntry[] = [
  { itemId: 'rusty_blade', weight: 20, type: 'crate' },
  { itemId: 'waterlogged_potion', weight: 25, type: 'crate' },
  { itemId: 'corroded_shield', weight: 10, type: 'crate' },
  { itemId: 'crypt_key_fragment', weight: 5, type: 'chest' },
  { itemId: 'revenant_bone', weight: 15, type: 'corpse' },
  { itemId: 'sodden_scroll', weight: 12, type: 'crate' },
  { itemId: 'tarnished_amulet', weight: 8, type: 'chest' },
  { itemId: 'drowned_offering', weight: 5, type: 'altar' },
];

interface HazardTemplate {
  type: string;
  baseSeverity: number;
}

const HAZARD_TEMPLATES: readonly HazardTemplate[] = [
  { type: 'rising_water', baseSeverity: 0.3 },
  { type: 'slippery_floor', baseSeverity: 0.1 },
  { type: 'crumbling_ceiling', baseSeverity: 0.2 },
  { type: 'submerged_trap', baseSeverity: 0.4 },
];

// ─── Room count ranges by tier (GDD §10.1) ─────────────────────────────────

const TIER_ROOM_COUNTS: Record<ShardTier, [min: number, max: number]> = {
  1: [15, 25],
  2: [25, 40],
  3: [40, 60],
};

// ─── Anchor room counts by tier ─────────────────────────────────────────────

const TIER_ANCHORS: Record<ShardTier, { entries: number; boss: number }> = {
  1: { entries: 2, boss: 1 },
  2: { entries: 3, boss: 1 },
  3: { entries: 4, boss: 1 },
};

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ShardGenConfig {
  tier: ShardTier;
  seed: number;
}

export function generateShardGraph(config: ShardGenConfig): RoomGraph {
  const rng = createPRNG(config.seed);
  const [minRooms, maxRooms] = TIER_ROOM_COUNTS[config.tier];
  const totalRooms = rng.nextInt(minRooms, maxRooms);
  const anchors = TIER_ANCHORS[config.tier];

  // Step 1: Create all rooms with types assigned
  const rooms = createRooms(totalRooms, anchors, rng);

  // Step 2: Build connectivity — spanning tree + cycles
  connectRooms(rooms, rng);

  // Step 3: Verify connectivity
  const entryIds = rooms.filter(r => r.type === 'entry').map(r => r.id);
  const bossId = rooms.find(r => r.type === 'boss')!.id;

  // Step 4: Apply room templates
  applyRoomTemplates(rooms, rng);

  // Step 5: Place loot in non-anchor rooms
  placeLoot(rooms, rng);

  // Step 6: Place hazards sparsely
  placeHazards(rooms, rng);

  const roomMap = new Map<string, Room>();
  for (const room of rooms) {
    roomMap.set(room.id, room);
  }

  return {
    rooms: roomMap,
    entryRoomIds: entryIds,
    bossRoomId: bossId,
    seed: config.seed,
    tier: config.tier,
  };
}

// ─── Room Creation ──────────────────────────────────────────────────────────

function createRooms(
  total: number,
  anchors: { entries: number; boss: number },
  rng: PRNG,
): Room[] {
  const rooms: Room[] = [];
  let idx = 0;

  const makeRoom = (type: RoomType): Room => ({
    id: `room_${idx++}`,
    name: '',
    description: '',
    type,
    exits: new Map(),
    items: [],
    hazards: [],
  });

  // Anchor rooms first
  for (let i = 0; i < anchors.entries; i++) rooms.push(makeRoom('entry'));
  for (let i = 0; i < anchors.boss; i++) rooms.push(makeRoom('boss'));

  // Fill remaining with corridor, junction, dead_end
  const remaining = total - rooms.length;
  let hasDeadEnd = false;
  for (let i = 0; i < remaining; i++) {
    const roll = rng.next();
    let type: RoomType;
    if (roll < 0.15) {
      type = 'dead_end';
      hasDeadEnd = true;
    } else if (roll < 0.40) {
      type = 'junction';
    } else {
      type = 'corridor';
    }
    rooms.push(makeRoom(type));
  }

  // Guarantee at least one dead-end room for interesting topology
  if (!hasDeadEnd && remaining > 0) {
    const lastFill = rooms[rooms.length - 1];
    lastFill.type = 'dead_end';
  }

  return rooms;
}

// ─── Graph Connectivity ─────────────────────────────────────────────────────

function connectRooms(rooms: Room[], rng: PRNG): void {
  const entryRooms = rooms.filter(r => r.type === 'entry');
  const bossRoom = rooms.find(r => r.type === 'boss')!;
  const deadEndRooms = rooms.filter(r => r.type === 'dead_end');
  const backbonePool = rooms.filter(
    r => r.type !== 'entry' && r.type !== 'boss' && r.type !== 'dead_end',
  );
  rng.shuffle(backbonePool);

  // Phase 1: Build a backbone chain through corridor/junction rooms.
  // Dead-end rooms are excluded — they attach as branches to preserve single-exit topology.
  // Entries at the start, boss deeper in.
  const backbone = [...backbonePool];

  // Connect backbone as a chain
  for (let i = 1; i < backbone.length; i++) {
    linkRooms(backbone[i - 1], backbone[i], rng);
  }

  // Attach entries to the first few backbone nodes
  for (let i = 0; i < entryRooms.length; i++) {
    const attachIdx = Math.min(i, Math.floor(backbone.length * 0.15));
    linkRooms(entryRooms[i], backbone[attachIdx], rng);
  }

  // Attach boss to the middle of the backbone
  const midIdx = Math.floor(backbone.length * 0.6);
  linkRooms(bossRoom, backbone[midIdx], rng);

  // Attach dead-end rooms as single branches off the backbone
  for (const deadEnd of deadEndRooms) {
    linkRooms(deadEnd, rng.pick(backbone), rng);
  }

  // Phase 2: Add extra edges to create cycles (graph is NOT a tree)
  // Exclude dead-end rooms to preserve their single-exit branch topology
  const cyclePool = rooms.filter(r => r.type !== 'dead_end');
  const extraEdges = Math.max(3, Math.floor(rooms.length * 0.25));
  let added = 0;
  let attempts = 0;
  const maxAttempts = extraEdges * 15;

  while (added < extraEdges && attempts < maxAttempts) {
    attempts++;
    const a = rng.pick(cyclePool);
    const b = rng.pick(cyclePool);
    if (a.id === b.id) continue;

    // Don't shortcut between rooms in different halves of the backbone
    const idxA = backbone.indexOf(a);
    const idxB = backbone.indexOf(b);
    if (idxA >= 0 && idxB >= 0 && Math.abs(idxA - idxB) > Math.floor(backbone.length * 0.35)) {
      continue;
    }

    // Check if already connected
    const alreadyConnected = Array.from(a.exits.values()).includes(b.id);
    if (alreadyConnected) continue;

    if (a.exits.size >= ALL_DIRECTIONS.length || b.exits.size >= ALL_DIRECTIONS.length) continue;

    linkRooms(a, b, rng);
    added++;
  }

  // Phase 3: Ensure connectivity
  ensureConnectivity(rooms, rng);

  // Phase 4: Ensure junction rooms have ≥ 3 exits (their defining characteristic)
  ensureJunctionExits(rooms, rng);
}

function linkRooms(a: Room, b: Room, rng: PRNG): void {
  // Find a free direction pair
  const freeA = ALL_DIRECTIONS.filter(d => !a.exits.has(d));
  const usable = freeA.filter(d => !b.exits.has(OPPOSITE_DIRECTION[d]));

  if (usable.length === 0) return; // no compatible free directions

  const dir = rng.pick(usable);
  const opposite = OPPOSITE_DIRECTION[dir];

  a.exits.set(dir, b.id);
  b.exits.set(opposite, a.id);
}

/** Ensure junction rooms have at least 3 exits (their defining characteristic). */
function ensureJunctionExits(rooms: Room[], rng: PRNG): void {
  const junctions = rooms.filter(r => r.type === 'junction');
  const targets = rooms.filter(r => r.type !== 'dead_end');

  for (const junction of junctions) {
    let attempts = 0;
    while (junction.exits.size < 3 && attempts < 30) {
      attempts++;
      const target = rng.pick(targets);
      if (target.id === junction.id) continue;
      if (Array.from(junction.exits.values()).includes(target.id)) continue;
      if (target.exits.size >= ALL_DIRECTIONS.length) continue;
      linkRooms(junction, target, rng);
    }
  }
}

// ─── Connectivity Enforcement ───────────────────────────────────────────────

function ensureConnectivity(rooms: Room[], rng: PRNG): void {
  const roomMap = new Map(rooms.map(r => [r.id, r]));

  for (let iter = 0; iter < rooms.length; iter++) {
    const visited = bfs(rooms[0].id, roomMap);
    if (visited.size === rooms.length) return;

    const disconnected = rooms.filter(r => !visited.has(r.id));
    for (const room of disconnected) {
      // Dead-end rooms with an exit are reachable once their parent is reconnected.
      if (room.type === 'dead_end' && room.exits.size >= 1) continue;

      // Collect candidates: rooms in the main component with free directions
      // Exclude dead-end rooms as targets to preserve their single-exit topology
      const candidates = rooms.filter(
        r =>
          visited.has(r.id) &&
          r.exits.size < ALL_DIRECTIONS.length &&
          r.type !== 'dead_end',
      );
      rng.shuffle(candidates);

      for (const target of candidates) {
        linkRooms(room, target, rng);
        visited.set(room.id, (visited.get(target.id) ?? 0) + 1);
        break;
      }
    }
  }
}

function bfs(startId: string, roomMap: Map<string, Room>): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(startId, 0);
  const queue = [startId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const room = roomMap.get(current)!;
    const d = dist.get(current)!;

    for (const neighborId of room.exits.values()) {
      if (!dist.has(neighborId)) {
        dist.set(neighborId, d + 1);
        queue.push(neighborId);
      }
    }
  }

  return dist;
}

// ─── Room Template Application ──────────────────────────────────────────────

function applyRoomTemplates(rooms: Room[], rng: PRNG): void {
  // Track used names to avoid duplicates where possible
  const usedNames = new Set<string>();

  for (const room of rooms) {
    const namePool = ROOM_NAMES[room.type];
    const descPool = ROOM_DESCRIPTIONS[room.type];

    // Pick a name, preferring unused ones
    let name = rng.pick(namePool);
    const unused = namePool.filter(n => !usedNames.has(n));
    if (unused.length > 0) {
      name = rng.pick(unused);
    }
    usedNames.add(name);

    room.name = name;
    room.description = rng.pick(descPool);
  }
}

// ─── Loot Placement ─────────────────────────────────────────────────────────

function placeLoot(rooms: Room[], rng: PRNG): void {
  const anchorTypes: RoomType[] = ['entry'];

  for (const room of rooms) {
    if (anchorTypes.includes(room.type)) continue;

    // 60% chance of loot in non-anchor rooms
    if (rng.next() > 0.6) continue;

    const entry = rng.pick(LOOT_TABLE);
    const container: LootContainer = {
      id: `loot_${room.id}`,
      type: entry.type,
      items: [entry.itemId],
    };

    // Boss rooms get extra loot
    if (room.type === 'boss') {
      const bonus = rng.pick(LOOT_TABLE);
      container.items.push(bonus.itemId);
    }

    room.items.push(container);
  }
}

// ─── Hazard Placement ───────────────────────────────────────────────────────

function placeHazards(rooms: Room[], rng: PRNG): void {
  for (const room of rooms) {
    if (room.type === 'entry') continue;

    // 25% chance of hazard
    if (rng.next() > 0.25) continue;

    const template = rng.pick(HAZARD_TEMPLATES);
    const hazard: HazardPlaceholder = {
      type: template.type,
      severity: template.baseSeverity + rng.next() * 0.2,
    };
    room.hazards.push(hazard);
  }
}
