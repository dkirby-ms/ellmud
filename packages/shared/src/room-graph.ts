/**
 * Room graph types for procedural zone generation.
 * Defines the data structures for rooms, connections, and zone layouts.
 */

import type { ZoneTier } from './index.js';

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
  | 'boss'
  | 'corridor'
  | 'junction'
  | 'dead_end'
  | 'feature_stash'
  | 'feature_expedition_board'
  | 'feature_marketplace'
  | 'feature_crafting'
  | 'feature_training'
  | 'feature_contracts'
  | 'feature_infirmary'
  | 'feature_armoury'
  | 'feature_war_room'
  | 'feature_inn'
  | 'feature_sandbox'
  | 'feature_sandbox_arena'
  | 'feature_sandbox_stats';

/** Union of all feature room types (those prefixed with `feature_`). */
export type FeatureRoomType = Extract<RoomType, `feature_${string}`>;

const FEATURE_PREFIX = 'feature_';

/** Returns true if the given type string is a feature room type. */
export function isFeatureRoomType(type: string): type is FeatureRoomType {
  return type.startsWith(FEATURE_PREFIX) && type.length > FEATURE_PREFIX.length;
}

/** Returns the key portion after `feature_`, or null for non-feature types. */
export function getFeatureKey(type: string): string | null {
  if (!isFeatureRoomType(type)) return null;
  return type.slice(FEATURE_PREFIX.length);
}

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

// ─── Room Properties (GDD §12 — Sound Propagation Modifiers) ─────────────────

/** Properties that affect sound propagation through a room. */
export type RoomProperty = 'heavy_door' | 'cavern' | 'water';

// ─── Room Features (Issue #345) ──────────────────────────────────────────────

/** An examinable feature within a room (e.g., a note on the wall, an inscription). */
export interface RoomFeature {
  /** Unique ID within the room (e.g., 'wall-note', 'altar-inscription'). */
  id: string;
  /** Keywords players can use to target this feature (e.g., ['note', 'parchment']). */
  keywords: string[];
  /** Display name shown when listing features. */
  name: string;
  /** Full narration when the player examines the feature. */
  description: string;
  /** Feature type (e.g., 'readable', 'examinable'). */
  type: string;
  /** Optional: quest/contract ID to initiate when examined (future). */
  questId?: string | null;
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
  /** Optional properties affecting sound propagation (GDD §12). */
  properties?: RoomProperty[];
  /** Examinable features in this room (Issue #345). */
  features?: RoomFeature[];
}

// ─── Room Graph ──────────────────────────────────────────────────────────────

export interface RoomGraph {
  rooms: Map<string, Room>;
  entryRoomIds: string[];
  bossRoomId: string;
  seed: number;
  tier: ZoneTier;
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
  properties?: RoomProperty[];
  features?: RoomFeature[];
}

export interface SerializedRoomGraph {
  rooms: SerializedRoom[];
  entryRoomIds: string[];
  bossRoomId: string;
  seed: number;
  tier: ZoneTier;
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
      ...(room.properties?.length ? { properties: room.properties } : {}),
      ...(room.features?.length ? { features: room.features } : {}),
    });
  }
  return {
    rooms,
    entryRoomIds: graph.entryRoomIds,
    bossRoomId: graph.bossRoomId,
    seed: graph.seed,
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
      ...(sr.properties?.length ? { properties: sr.properties } : {}),
      ...(sr.features?.length ? { features: sr.features } : {}),
    });
  }
  return {
    rooms,
    entryRoomIds: data.entryRoomIds,
    bossRoomId: data.bossRoomId,
    seed: data.seed,
    tier: data.tier,
  };
}
