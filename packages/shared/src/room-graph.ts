/**
 * Room graph types for procedural shard generation.
 * Defines the data structures for rooms, connections, and shard layouts.
 */

import type { BiomeType, ShardTier } from './index.js';

// ─── Directions ──────────────────────────────────────────────────────────────

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
};

export const ALL_DIRECTIONS: readonly Direction[] = [
  'north', 'south', 'east', 'west', 'up', 'down',
] as const;

// ─── Room Types ──────────────────────────────────────────────────────────────

export type RoomType =
  | 'entry'
  | 'extraction'
  | 'boss'
  | 'corridor'
  | 'junction'
  | 'dead_end';

// ─── Hazard Placeholder ──────────────────────────────────────────────────────

export interface HazardPlaceholder {
  type: string;
  severity: number; // 0–1
}

// ─── Loot Container ─────────────────────────────────────────────────────────

export interface LootContainer {
  id: string;
  type: 'crate' | 'chest' | 'altar' | 'corpse';
  items: string[]; // item IDs (populated at generation time)
}

// ─── Room ────────────────────────────────────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  description: string;
  type: RoomType;
  exits: Map<Direction, string>; // direction → roomId
  items: LootContainer[];
  hazards: HazardPlaceholder[];
}

// ─── Room Graph ──────────────────────────────────────────────────────────────

export interface RoomGraph {
  rooms: Map<string, Room>;
  entryRoomIds: string[];
  extractionRoomIds: string[];
  bossRoomId: string;
  seed: number;
  biome: BiomeType;
  tier: ShardTier;
}

// ─── Serialization ───────────────────────────────────────────────────────────

export interface SerializedRoom {
  id: string;
  name: string;
  description: string;
  type: RoomType;
  exits: Record<string, string>;
  items: LootContainer[];
  hazards: HazardPlaceholder[];
}

export interface SerializedRoomGraph {
  rooms: SerializedRoom[];
  entryRoomIds: string[];
  extractionRoomIds: string[];
  bossRoomId: string;
  seed: number;
  biome: BiomeType;
  tier: ShardTier;
}

/** Serialize a RoomGraph to a plain JSON-safe object. */
export function serializeRoomGraph(graph: RoomGraph): SerializedRoomGraph {
  const rooms: SerializedRoom[] = [];
  for (const room of graph.rooms.values()) {
    rooms.push({
      id: room.id,
      name: room.name,
      description: room.description,
      type: room.type,
      exits: Object.fromEntries(room.exits),
      items: room.items,
      hazards: room.hazards,
    });
  }
  return {
    rooms,
    entryRoomIds: graph.entryRoomIds,
    extractionRoomIds: graph.extractionRoomIds,
    bossRoomId: graph.bossRoomId,
    seed: graph.seed,
    biome: graph.biome,
    tier: graph.tier,
  };
}

/** Deserialize a plain object back into a RoomGraph with proper Maps. */
export function deserializeRoomGraph(data: SerializedRoomGraph): RoomGraph {
  const rooms = new Map<string, Room>();
  for (const sr of data.rooms) {
    rooms.set(sr.id, {
      id: sr.id,
      name: sr.name,
      description: sr.description,
      type: sr.type,
      exits: new Map(Object.entries(sr.exits)) as Map<Direction, string>,
      items: sr.items,
      hazards: sr.hazards,
    });
  }
  return {
    rooms,
    entryRoomIds: data.entryRoomIds,
    extractionRoomIds: data.extractionRoomIds,
    bossRoomId: data.bossRoomId,
    seed: data.seed,
    biome: data.biome,
    tier: data.tier,
  };
}
