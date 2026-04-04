/**
 * PgExplorationRepository — PostgreSQL-backed exploration persistence.
 *
 * Uses the character_explored_rooms table from migration 032.
 * Follows the same lazy-pool pattern as PgStashRepository.
 */

import { query } from '../db/index.js';
import type {
  ExplorationRepository,
  ExplorationVisit,
  ExploredRoom,
  ExplorationStats,
} from './ExplorationRepository.js';

export class PgExplorationRepository implements ExplorationRepository {
  async recordVisit(visit: ExplorationVisit): Promise<void> {
    await query(
      `INSERT INTO character_explored_rooms
         (character_id, zone_slug, room_id, room_type, room_name, zone_tier)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (character_id, COALESCE(zone_slug, '__instance__'), room_id)
       DO UPDATE SET
         last_visited = NOW(),
         visit_count  = character_explored_rooms.visit_count + 1`,
      [
        visit.characterId,
        visit.zoneSlug,
        visit.roomId,
        visit.roomType,
        visit.roomName,
        visit.zoneTier ?? null,
      ],
    );
  }

  async getExploredRooms(characterId: string): Promise<ExploredRoom[]> {
    const result = await query<ExploredRoomRow>(
      `SELECT character_id, zone_slug, room_id, room_type, room_name,
              zone_tier, first_visited, last_visited, visit_count
       FROM character_explored_rooms
       WHERE character_id = $1
       ORDER BY first_visited`,
      [characterId],
    );
    return result.rows.map(toExploredRoom);
  }

  async getExploredRoomsInZone(characterId: string, zoneSlug: string): Promise<ExploredRoom[]> {
    const result = await query<ExploredRoomRow>(
      `SELECT character_id, zone_slug, room_id, room_type, room_name,
              zone_tier, first_visited, last_visited, visit_count
       FROM character_explored_rooms
       WHERE character_id = $1 AND zone_slug = $2
       ORDER BY first_visited`,
      [characterId, zoneSlug],
    );
    return result.rows.map(toExploredRoom);
  }

  async hasVisited(characterId: string, zoneSlug: string | null, roomId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM character_explored_rooms
         WHERE character_id = $1
           AND COALESCE(zone_slug, '__instance__') = COALESCE($2, '__instance__')
           AND room_id = $3
       ) AS exists`,
      [characterId, zoneSlug, roomId],
    );
    return result.rows[0]?.exists ?? false;
  }

  async getExplorationStats(characterId: string): Promise<ExplorationStats> {
    const result = await query<{
      total_rooms: string;
      total_visits: string;
      zones: string;
    }>(
      `SELECT
         COUNT(*)::TEXT                                    AS total_rooms,
         COALESCE(SUM(visit_count), 0)::TEXT              AS total_visits,
         COUNT(DISTINCT COALESCE(zone_slug, '__instance__'))::TEXT AS zones
       FROM character_explored_rooms
       WHERE character_id = $1`,
      [characterId],
    );

    const row = result.rows[0];
    return {
      totalRooms: parseInt(row?.total_rooms ?? '0', 10),
      totalVisits: parseInt(row?.total_visits ?? '0', 10),
      zones: parseInt(row?.zones ?? '0', 10),
    };
  }
}

// ─── Row Mapping ────────────────────────────────────────────────────────────

interface ExploredRoomRow {
  character_id: string;
  zone_slug: string | null;
  room_id: string;
  room_type: string;
  room_name: string;
  zone_tier: number | null;
  first_visited: Date;
  last_visited: Date;
  visit_count: number;
}

function toExploredRoom(row: ExploredRoomRow): ExploredRoom {
  return {
    characterId: row.character_id,
    zoneSlug: row.zone_slug,
    roomId: row.room_id,
    roomType: row.room_type,
    roomName: row.room_name,
    zoneTier: row.zone_tier,
    firstVisited: row.first_visited,
    lastVisited: row.last_visited,
    visitCount: row.visit_count,
  };
}
