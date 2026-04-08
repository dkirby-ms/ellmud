/**
 * Zone types for hand-crafted, authored room graphs.
 * Zones are persistent, database-driven areas that coexist alongside
 * procedurally generated zones.
 */

import type {
  RoomType,
  Direction,
  RoomProperty,
  LootContainer,
  HazardPlaceholder,
  RoomFeature,
} from './room-graph.js';

// ─── Zone Definition ────────────────────────────────────────────────────────

/** Zone metadata from database. */
export interface ZoneDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  levelMin: number;
  levelMax: number;
  tier: number;
  theme: string;
  entryRoomSlugs: string[];
  lifecycle: 'persistent' | 'scheduled' | 'event';
  category: 'hub' | 'faction_hub' | 'dev' | 'dungeon' | 'wilderness' | 'social';
  maxPlayers: number; // 0 = unlimited
  pvpEnabled: boolean;
  repopIntervalSeconds: number; // e.g. 300 = 5 min respawn cycle
  /** Faction slug for faction_hub zones. Undefined for non-faction zones. */
  factionSlug?: string;
}

// ─── Zone Room Definition ───────────────────────────────────────────────────

/** Room definition within a zone. */
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
  /** Examinable features in this room (Issue #345). */
  features: RoomFeature[];
}

// ─── Zone Exit Definition ───────────────────────────────────────────────────

/** Exit definition — can be intra-zone or inter-zone. */
export interface ZoneExitDefinition {
  id: string;
  zoneId: string;
  fromRoomSlug: string;
  direction: Direction;
  toRoomSlug: string;
  /** Non-null for inter-zone exits; null/undefined for intra-zone. */
  targetZoneSlug?: string;
  /** Target room slug in the destination zone (inter-zone only). */
  targetRoomSlug?: string;
  locked: boolean;
  hidden: boolean;
  condition?: Record<string, unknown>;
}

// ─── Zone Data Bundle ───────────────────────────────────────────────────────

/** Complete zone data bundle as loaded from database. */
export interface ZoneData {
  zone: ZoneDefinition;
  rooms: ZoneRoomDefinition[];
  exits: ZoneExitDefinition[];
}

// ─── Inter-Zone Exit Convention ─────────────────────────────────────────────

/**
 * Prefix for inter-zone exit target room IDs in a RoomGraph.
 * Format: `zone:{zoneSlug}/{roomSlug}`
 *
 * Downstream code (e.g. ZoneRoom navigation) can detect inter-zone exits
 * by checking `roomId.startsWith(INTER_ZONE_PREFIX)`.
 */
export const INTER_ZONE_PREFIX = 'zone:';

/** Build an inter-zone room ID from zone slug and room slug. */
export function makeInterZoneId(zoneSlug: string, roomSlug: string): string {
  return `${INTER_ZONE_PREFIX}${zoneSlug}/${roomSlug}`;
}

/** Check whether a room ID represents an inter-zone exit target. */
export function isInterZoneId(roomId: string): boolean {
  return roomId.startsWith(INTER_ZONE_PREFIX);
}

/** Parse an inter-zone room ID into its zone slug and room slug. */
export function parseInterZoneId(roomId: string): { zoneSlug: string; roomSlug: string } | null {
  if (!isInterZoneId(roomId)) return null;
  const rest = roomId.slice(INTER_ZONE_PREFIX.length);
  const slashIdx = rest.indexOf('/');
  if (slashIdx < 0) return null;
  return {
    zoneSlug: rest.slice(0, slashIdx),
    roomSlug: rest.slice(slashIdx + 1),
  };
}
