/**
 * PgZoneRepository — PostgreSQL implementation of ZoneRepository.
 *
 * Uses the shared connection pool from db/index.ts. Follows the same patterns
 * as PgBiomeDefinitionsStore and PgItemDefinitionsStore: query helper,
 * row-to-entity mapping, proper camelCase ↔ snake_case conversion.
 *
 * JSONB fields (loot_containers, hazards, npcs, condition) are serialized
 * with JSON.stringify on write and parsed on read (pg driver auto-parses JSONB).
 */

import { query, getPool } from '../db/index.js';
import type {
  ZoneRepository,
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
  ZoneData,
} from './ZoneRepository.js';

// ─── Row types (snake_case from Postgres) ────────────────────────────────────

interface ZoneRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  level_min: number;
  level_max: number;
  tier: number;
  biome: string;
  entry_room_slugs: string[];
  lifecycle: string;
  category: string;
  max_players: number;
  pvp_enabled: boolean;
  repop_interval_seconds: number;
  created_at: Date;
  updated_at: Date;
}

interface ZoneRoomRow {
  id: string;
  zone_id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  loot_containers: unknown[];
  hazards: unknown[];
  npcs: unknown[];
  created_at: Date;
  updated_at: Date;
}

interface ZoneExitRow {
  id: string;
  zone_id: string;
  from_room_slug: string;
  direction: string;
  to_room_slug: string;
  target_zone_slug: string | null;
  target_room_slug: string | null;
  locked: boolean;
  hidden: boolean;
  condition: unknown | null;
  created_at: Date;
}

// ─── Row → Entity mappers ────────────────────────────────────────────────────

function zoneRowToEntity(row: ZoneRow): ZoneDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    levelMin: row.level_min,
    levelMax: row.level_max,
    tier: row.tier,
    biome: row.biome as ZoneDefinition['biome'],
    entryRoomSlugs: row.entry_room_slugs,
    lifecycle: row.lifecycle as ZoneDefinition['lifecycle'],
    category: row.category as ZoneDefinition['category'],
    maxPlayers: row.max_players,
    pvpEnabled: row.pvp_enabled,
    repopIntervalSeconds: row.repop_interval_seconds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function roomRowToEntity(row: ZoneRoomRow): ZoneRoomDefinition {
  return {
    id: row.id,
    zoneId: row.zone_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type as ZoneRoomDefinition['type'],
    properties: row.properties as ZoneRoomDefinition['properties'],
    lootContainers: row.loot_containers as ZoneRoomDefinition['lootContainers'],
    hazards: row.hazards as ZoneRoomDefinition['hazards'],
    npcs: row.npcs as ZoneRoomDefinition['npcs'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function exitRowToEntity(row: ZoneExitRow): ZoneExitDefinition {
  return {
    id: row.id,
    zoneId: row.zone_id,
    fromRoomSlug: row.from_room_slug,
    direction: row.direction as ZoneExitDefinition['direction'],
    toRoomSlug: row.to_room_slug,
    targetZoneSlug: row.target_zone_slug ?? undefined,
    targetRoomSlug: row.target_room_slug ?? undefined,
    locked: row.locked,
    hidden: row.hidden,
    condition: (row.condition as ZoneExitDefinition['condition']) ?? undefined,
    createdAt: row.created_at,
  };
}

// ─── Implementation ──────────────────────────────────────────────────────────

export class PgZoneRepository implements ZoneRepository {

  // ── Zone CRUD ────────────────────────────────────────────────────────────

  async getAllZones(): Promise<ZoneDefinition[]> {
    const result = await query<ZoneRow>(
      `SELECT * FROM zones ORDER BY name`,
    );
    return result.rows.map(zoneRowToEntity);
  }

  async getZoneBySlug(slug: string): Promise<ZoneData | null> {
    const zoneResult = await query<ZoneRow>(
      `SELECT * FROM zones WHERE slug = $1`,
      [slug],
    );
    if (zoneResult.rows.length === 0) return null;

    const zone = zoneRowToEntity(zoneResult.rows[0]);
    return this.fetchZoneBundle(zone);
  }

  async getZoneById(id: string): Promise<ZoneData | null> {
    const zoneResult = await query<ZoneRow>(
      `SELECT * FROM zones WHERE id = $1`,
      [id],
    );
    if (zoneResult.rows.length === 0) return null;

    const zone = zoneRowToEntity(zoneResult.rows[0]);
    return this.fetchZoneBundle(zone);
  }

  async createZone(
    zone: Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ZoneDefinition> {
    const result = await query<ZoneRow>(
      `INSERT INTO zones (
        slug, name, description, level_min, level_max, tier, biome,
        entry_room_slugs, lifecycle, category, max_players,
        pvp_enabled, repop_interval_seconds
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        zone.slug,
        zone.name,
        zone.description,
        zone.levelMin,
        zone.levelMax,
        zone.tier,
        zone.biome,
        zone.entryRoomSlugs,
        zone.lifecycle,
        zone.category,
        zone.maxPlayers,
        zone.pvpEnabled,
        zone.repopIntervalSeconds,
      ],
    );
    return zoneRowToEntity(result.rows[0]);
  }

  async updateZone(
    id: string,
    partial: Partial<Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ZoneDefinition> {
    const existing = await query<ZoneRow>(
      `SELECT * FROM zones WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      throw new Error(`Zone with id '${id}' not found`);
    }

    const current = zoneRowToEntity(existing.rows[0]);
    const merged = { ...current, ...partial };

    const result = await query<ZoneRow>(
      `UPDATE zones SET
        slug = $1, name = $2, description = $3, level_min = $4, level_max = $5,
        tier = $6, biome = $7, entry_room_slugs = $8, lifecycle = $9, category = $10,
        max_players = $11, pvp_enabled = $12, repop_interval_seconds = $13,
        updated_at = now()
      WHERE id = $14
      RETURNING *`,
      [
        merged.slug,
        merged.name,
        merged.description,
        merged.levelMin,
        merged.levelMax,
        merged.tier,
        merged.biome,
        merged.entryRoomSlugs,
        merged.lifecycle,
        merged.category,
        merged.maxPlayers,
        merged.pvpEnabled,
        merged.repopIntervalSeconds,
        id,
      ],
    );
    return zoneRowToEntity(result.rows[0]);
  }

  async deleteZone(id: string): Promise<void> {
    await query(`DELETE FROM zones WHERE id = $1`, [id]);
  }

  // ── Room CRUD ────────────────────────────────────────────────────────────

  async createRoom(
    room: Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<ZoneRoomDefinition> {
    const result = await query<ZoneRoomRow>(
      `INSERT INTO zone_rooms (
        zone_id, slug, name, description, type, properties,
        loot_containers, hazards, npcs
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        room.zoneId,
        room.slug,
        room.name,
        room.description,
        room.type,
        room.properties ?? JSON.stringify([]),
        JSON.stringify(room.lootContainers ?? []),
        JSON.stringify(room.hazards ?? []),
        JSON.stringify(room.npcs ?? []),
      ],
    );
    return roomRowToEntity(result.rows[0]);
  }

  async updateRoom(
    id: string,
    partial: Partial<Omit<ZoneRoomDefinition, 'id' | 'zoneId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<ZoneRoomDefinition> {
    const existing = await query<ZoneRoomRow>(
      `SELECT * FROM zone_rooms WHERE id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      throw new Error(`Zone room with id '${id}' not found`);
    }

    const current = roomRowToEntity(existing.rows[0]);
    const merged = { ...current, ...partial };

    const result = await query<ZoneRoomRow>(
      `UPDATE zone_rooms SET
        slug = $1, name = $2, description = $3, type = $4, properties = $5,
        loot_containers = $6, hazards = $7, npcs = $8, updated_at = now()
      WHERE id = $9
      RETURNING *`,
      [
        merged.slug,
        merged.name,
        merged.description,
        merged.type,
        merged.properties,
        JSON.stringify(merged.lootContainers),
        JSON.stringify(merged.hazards),
        JSON.stringify(merged.npcs),
        id,
      ],
    );
    return roomRowToEntity(result.rows[0]);
  }

  async deleteRoom(id: string): Promise<void> {
    await query(`DELETE FROM zone_rooms WHERE id = $1`, [id]);
  }

  // ── Exit CRUD ────────────────────────────────────────────────────────────

  async createExit(
    exit: Omit<ZoneExitDefinition, 'id' | 'createdAt'>,
  ): Promise<ZoneExitDefinition> {
    const result = await query<ZoneExitRow>(
      `INSERT INTO zone_exits (
        zone_id, from_room_slug, direction, to_room_slug,
        target_zone_slug, target_room_slug, locked, hidden, condition
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        exit.zoneId,
        exit.fromRoomSlug,
        exit.direction,
        exit.toRoomSlug,
        exit.targetZoneSlug,
        exit.targetRoomSlug,
        exit.locked,
        exit.hidden,
        exit.condition ? JSON.stringify(exit.condition) : null,
      ],
    );
    return exitRowToEntity(result.rows[0]);
  }

  async deleteExit(id: string): Promise<void> {
    await query(`DELETE FROM zone_exits WHERE id = $1`, [id]);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Fetch rooms + exits for a zone in parallel. */
  private async fetchZoneBundle(zone: ZoneDefinition): Promise<ZoneData> {
    const pool = getPool();
    const [roomsResult, exitsResult] = await Promise.all([
      pool.query<ZoneRoomRow>(
        `SELECT * FROM zone_rooms WHERE zone_id = $1 ORDER BY slug`,
        [zone.id],
      ),
      pool.query<ZoneExitRow>(
        `SELECT * FROM zone_exits WHERE zone_id = $1 ORDER BY from_room_slug, direction`,
        [zone.id],
      ),
    ]);

    return {
      zone,
      rooms: roomsResult.rows.map(roomRowToEntity),
      exits: exitsResult.rows.map(exitRowToEntity),
    };
  }
}
