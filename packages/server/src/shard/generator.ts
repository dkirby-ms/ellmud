/**
 * Procedural shard graph generator.
 * Creates deterministic room graphs from a seed for shard instances.
 *
 * Algorithm:
 *  1. Determine room count from tier
 *  2. Place anchor rooms (entries, extractions, boss)
 *  3. Fill remaining slots with corridor/junction/dead_end rooms
 *  4. Build a spanning tree for connectivity, then add cycles
 *  5. Apply biome templates for names/descriptions
 *  6. Place loot containers
 */

import type {
  BiomeType,
  ShardTier,
  Room,
  RoomGraph,
  RoomType,
  LootContainer,
  HazardPlaceholder,
} from '@ellmud/shared';
import { ALL_DIRECTIONS, OPPOSITE_DIRECTION } from '@ellmud/shared';

import { createPRNG, type PRNG } from './prng.js';
import {
  ROOM_NAMES,
  ROOM_DESCRIPTIONS,
  LOOT_TABLE,
  HAZARD_TEMPLATES,
} from './biomes/flooded-crypt.js';

// ─── Room count ranges by tier (GDD §10.1) ─────────────────────────────────

const TIER_ROOM_COUNTS: Record<ShardTier, [min: number, max: number]> = {
  1: [15, 25],
  2: [25, 40],
  3: [40, 60],
};

// ─── Anchor room counts by tier ─────────────────────────────────────────────

const TIER_ANCHORS: Record<ShardTier, { entries: number; extractions: number; boss: number }> = {
  1: { entries: 2, extractions: 2, boss: 1 },
  2: { entries: 3, extractions: 3, boss: 1 },
  3: { entries: 4, extractions: 3, boss: 1 },
};

// Minimum hops from any entry to any extraction
const MIN_ENTRY_TO_EXTRACTION_HOPS = 5;

// ─── Public API ─────────────────────────────────────────────────────────────

export interface ShardGenConfig {
  tier: ShardTier;
  biome: BiomeType;
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

  // Step 3: Ensure minimum distance constraint from entries to extractions
  const entryIds = rooms.filter(r => r.type === 'entry').map(r => r.id);
  const extractionIds = rooms.filter(r => r.type === 'extraction').map(r => r.id);
  const bossId = rooms.find(r => r.type === 'boss')!.id;

  // Step 4: Apply biome templates
  applyBiomeTemplates(rooms, rng);

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
    extractionRoomIds: extractionIds,
    bossRoomId: bossId,
    seed: config.seed,
    biome: config.biome,
    tier: config.tier,
  };
}

// ─── Room Creation ──────────────────────────────────────────────────────────

function createRooms(
  total: number,
  anchors: { entries: number; extractions: number; boss: number },
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
  for (let i = 0; i < anchors.extractions; i++) rooms.push(makeRoom('extraction'));
  for (let i = 0; i < anchors.boss; i++) rooms.push(makeRoom('boss'));

  // Fill remaining with corridor, junction, dead_end
  const remaining = total - rooms.length;
  for (let i = 0; i < remaining; i++) {
    const roll = rng.next();
    let type: RoomType;
    if (roll < 0.15) {
      type = 'dead_end';
    } else if (roll < 0.40) {
      type = 'junction';
    } else {
      type = 'corridor';
    }
    rooms.push(makeRoom(type));
  }

  return rooms;
}

// ─── Graph Connectivity ─────────────────────────────────────────────────────

function connectRooms(rooms: Room[], rng: PRNG): void {
  const entryRooms = rooms.filter(r => r.type === 'entry');
  const extractionRooms = rooms.filter(r => r.type === 'extraction');
  const bossRoom = rooms.find(r => r.type === 'boss')!;
  const fillRooms = rooms.filter(
    r => r.type !== 'entry' && r.type !== 'extraction' && r.type !== 'boss',
  );
  rng.shuffle(fillRooms);

  // Phase 1: Build a backbone chain through the fill rooms.
  // Entries attach to the start, boss in the middle, extractions at the end.
  // This guarantees structural distance between entries and extractions.
  const backbone = [...fillRooms];

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

  // Attach extractions to the last few backbone nodes
  for (let i = 0; i < extractionRooms.length; i++) {
    const attachIdx = Math.max(
      backbone.length - 1 - i,
      Math.floor(backbone.length * 0.85),
    );
    linkRooms(extractionRooms[i], backbone[attachIdx], rng);
  }

  // Phase 2: Add extra edges to create cycles (graph is NOT a tree)
  // Only add edges between rooms that are close in backbone index to avoid shortcutting
  const extraEdges = Math.max(3, Math.floor(rooms.length * 0.25));
  let added = 0;
  let attempts = 0;
  const maxAttempts = extraEdges * 15;

  while (added < extraEdges && attempts < maxAttempts) {
    attempts++;
    const a = rng.pick(rooms);
    const b = rng.pick(rooms);
    if (a.id === b.id) continue;

    // Never directly connect entry ↔ extraction
    if (
      (a.type === 'entry' && b.type === 'extraction') ||
      (a.type === 'extraction' && b.type === 'entry')
    ) continue;

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

  // Phase 3: Verify and enforce minimum distance constraint
  ensureMinDistance(rooms, rng);
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

// ─── Minimum Distance Enforcement ───────────────────────────────────────────

function ensureMinDistance(rooms: Room[], rng: PRNG): void {
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const entryIds = rooms.filter(r => r.type === 'entry').map(r => r.id);
  const extractionIds = rooms.filter(r => r.type === 'extraction').map(r => r.id);

  // Iteratively find and break shortest paths that are too short
  for (let iteration = 0; iteration < 30; iteration++) {
    let worstDist = Infinity;
    let worstPath: string[] | null = null;

    for (const entryId of entryIds) {
      const parent = bfsParent(entryId, roomMap);
      const dist = bfsDist(entryId, roomMap);
      for (const extId of extractionIds) {
        const d = dist.get(extId);
        if (d !== undefined && d < MIN_ENTRY_TO_EXTRACTION_HOPS && d < worstDist) {
          worstDist = d;
          worstPath = reconstructPath(extId, parent);
        }
      }
    }

    if (worstPath === null || worstDist >= MIN_ENTRY_TO_EXTRACTION_HOPS) break;

    // Remove an edge in the middle of the shortest offending path
    if (worstPath.length >= 3) {
      const cutIdx = Math.floor(worstPath.length / 2);
      unlinkRooms(roomMap.get(worstPath[cutIdx - 1])!, roomMap.get(worstPath[cutIdx])!);
    }

    // Repair connectivity without introducing short entry→extraction paths
    repairConnectivitySafe(rooms, rng, entryIds, extractionIds);
  }
}

/** Remove the bidirectional link between two rooms. */
function unlinkRooms(a: Room, b: Room): void {
  for (const [dir, targetId] of a.exits) {
    if (targetId === b.id) { a.exits.delete(dir); break; }
  }
  for (const [dir, targetId] of b.exits) {
    if (targetId === a.id) { b.exits.delete(dir); break; }
  }
}

function bfsParent(startId: string, roomMap: Map<string, Room>): Map<string, string | null> {
  const parent = new Map<string, string | null>();
  parent.set(startId, null);
  const queue = [startId];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const room = roomMap.get(current)!;

    for (const neighborId of room.exits.values()) {
      if (!parent.has(neighborId)) {
        parent.set(neighborId, current);
        queue.push(neighborId);
      }
    }
  }

  return parent;
}

function bfsDist(startId: string, roomMap: Map<string, Room>): Map<string, number> {
  return bfs(startId, roomMap);
}

function reconstructPath(targetId: string, parent: Map<string, string | null>): string[] {
  const path: string[] = [];
  let current: string | null = targetId;
  while (current !== null) {
    path.unshift(current);
    current = parent.get(current) ?? null;
  }
  return path;
}

/** Check whether all entry→extraction distances meet the minimum. */
function distanceOk(
  roomMap: Map<string, Room>,
  entryIds: string[],
  extractionIds: string[],
): boolean {
  for (const entryId of entryIds) {
    const dist = bfs(entryId, roomMap);
    for (const extId of extractionIds) {
      const d = dist.get(extId);
      if (d !== undefined && d < MIN_ENTRY_TO_EXTRACTION_HOPS) return false;
    }
  }
  return true;
}

/** Repair connectivity while respecting distance constraints. */
function repairConnectivitySafe(
  rooms: Room[],
  rng: PRNG,
  entryIds: string[],
  extractionIds: string[],
): void {
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const entrySet = new Set(entryIds);
  const extractionSet = new Set(extractionIds);

  for (let iter = 0; iter < rooms.length; iter++) {
    const visited = bfs(rooms[0].id, roomMap);
    if (visited.size === rooms.length) return;

    const disconnected = rooms.filter(r => !visited.has(r.id));
    for (const room of disconnected) {
      const isEntry = entrySet.has(room.id);
      const isExtraction = extractionSet.has(room.id);

      // Collect candidates: rooms in the main component with free directions
      const candidates = rooms.filter(
        r =>
          visited.has(r.id) &&
          r.exits.size < ALL_DIRECTIONS.length &&
          !(isEntry && extractionSet.has(r.id)) &&
          !(isExtraction && entrySet.has(r.id)),
      );
      rng.shuffle(candidates);

      for (const target of candidates) {
        linkRooms(room, target, rng);
        // Check if this reconnection violates the distance constraint
        if (distanceOk(roomMap, entryIds, extractionIds)) {
          visited.set(room.id, (visited.get(target.id) ?? 0) + 1);
          break;
        }
        // Undo — this reconnection creates a short path
        unlinkRooms(room, target);
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

// ─── Biome Template Application ─────────────────────────────────────────────

function applyBiomeTemplates(rooms: Room[], rng: PRNG): void {
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
  const anchorTypes: RoomType[] = ['entry', 'extraction'];

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
    if (room.type === 'entry' || room.type === 'extraction') continue;

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
