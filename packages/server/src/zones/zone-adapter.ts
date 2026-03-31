/**
 * Zone-to-RoomGraph adapter.
 *
 * Converts database-shaped ZoneData into the shared RoomGraph structure
 * used by procedural shards, enabling zones to flow through the same
 * ShardRoom infrastructure.
 */

import type {
  ZoneData,
  Room,
  RoomGraph,
  Direction,
  ShardTier,
} from '@ellmud/shared';
import { makeInterZoneId } from '@ellmud/shared';

// ─── Seed Hashing ───────────────────────────────────────────────────────────

/** DJB2 string hash — deterministic, fast, good distribution. */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // force unsigned 32-bit
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert a ZoneData bundle (database-shaped) into a shared RoomGraph.
 *
 * Produces output compatible with the procedural shard generator,
 * allowing zone rooms to be processed by ShardRoom and command handlers
 * through the same graph-adapter pipeline.
 */
export function convertZoneToRoomGraph(zoneData: ZoneData): RoomGraph {
  const { zone, rooms: zoneRooms, exits: zoneExits } = zoneData;

  // Build room map keyed by slug
  const rooms = new Map<string, Room>();
  const slugToRoom = new Map<string, Room>();

  for (const zr of zoneRooms) {
    const room: Room = {
      id: zr.slug,
      name: zr.name,
      description: zr.description,
      type: zr.type,
      exits: new Map<Direction, string>(),
      items: [...zr.lootContainers],
      hazards: [...zr.hazards],
      ...(zr.properties.length > 0 ? { properties: [...zr.properties] } : {}),
    };
    rooms.set(zr.slug, room);
    slugToRoom.set(zr.slug, room);
  }

  // Wire exits
  for (const exit of zoneExits) {
    const sourceRoom = slugToRoom.get(exit.fromRoomSlug);
    if (!sourceRoom) continue;

    let targetId: string;
    if (exit.targetZoneSlug) {
      // Inter-zone exit: encode destination as zone:{slug}/{roomSlug}
      targetId = makeInterZoneId(
        exit.targetZoneSlug,
        exit.targetRoomSlug ?? exit.toRoomSlug,
      );
    } else {
      // Intra-zone exit: target is a room slug within this zone
      targetId = exit.toRoomSlug;
    }

    sourceRoom.exits.set(exit.direction, targetId);
  }

  // Identify anchor rooms
  const entryRoomIds = zone.entryRoomSlugs.filter(slug => rooms.has(slug));

  let bossRoomId = '';

  for (const [, room] of rooms) {
    if (room.type === 'boss' && bossRoomId === '') bossRoomId = room.id;
  }

  // Clamp tier to valid ShardTier range
  const tier = Math.max(1, Math.min(3, zone.tier)) as ShardTier;

  return {
    rooms,
    entryRoomIds,
    bossRoomId,
    seed: hashString(zone.slug),
    biome: zone.biome,
    tier,
  };
}
