/**
 * PgCharacterRepository — Postgres implementation of CharacterRepository.
 */

import type { CharacterSummary } from '@ellmud/shared';
import type { CharacterRepository, CharacterRow } from './CharacterRepository.js';
import { query, getClient } from '../db/index.js';

interface DbCharacterRow {
  id: string;
  player_id: string;
  name: string;
  faction_slug: string;
  is_active: boolean;
  created_at: Date;
  last_played_at: Date | null;
  deleted_at: Date | null;
}

interface FactionNameRow {
  slug: string;
  name: string;
}

interface SkillRow {
  skill_name: string;
  level: number;
}

interface RunCountRow {
  total_runs: number;
}

function mapRow(row: DbCharacterRow): CharacterRow {
  return {
    id: row.id,
    playerId: row.player_id,
    name: row.name,
    factionSlug: row.faction_slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastPlayedAt: row.last_played_at,
    deletedAt: row.deleted_at,
  };
}

export class PgCharacterRepository implements CharacterRepository {
  async list(playerId: string): Promise<CharacterSummary[]> {
    const result = await query<DbCharacterRow>(
      `SELECT id, player_id, name, faction_slug, is_active, created_at, last_played_at, deleted_at
       FROM characters
       WHERE player_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [playerId],
    );

    // Load faction names
    const factionResult = await query<FactionNameRow>(
      `SELECT slug, name FROM factions`,
    );
    const factionMap = new Map<string, string>();
    for (const f of factionResult.rows) {
      factionMap.set(f.slug, f.name);
    }

    const summaries: CharacterSummary[] = [];
    for (const row of result.rows) {
      // Top skills for this character
      const skillResult = await query<SkillRow>(
        `SELECT skill_name, level FROM player_skills
         WHERE character_id = $1
         ORDER BY level DESC LIMIT 3`,
        [row.id],
      );

      // Run count
      const runResult = await query<RunCountRow>(
        `SELECT COUNT(*)::int AS total_runs FROM run_history
         WHERE character_id = $1`,
        [row.id],
      );

      summaries.push({
        id: row.id,
        name: row.name,
        factionSlug: row.faction_slug,
        factionName: factionMap.get(row.faction_slug) ?? row.faction_slug,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        lastPlayedAt: row.last_played_at?.toISOString() ?? null,
        topSkills: skillResult.rows.map((s) => ({ name: s.skill_name, level: s.level })),
        totalRuns: runResult.rows[0]?.total_runs ?? 0,
      });
    }

    return summaries;
  }

  async create(playerId: string, name: string, factionSlug: string): Promise<CharacterRow> {
    const result = await query<DbCharacterRow>(
      `INSERT INTO characters (player_id, name, faction_slug)
       VALUES ($1, $2, $3)
       RETURNING id, player_id, name, faction_slug, is_active, created_at, last_played_at, deleted_at`,
      [playerId, name, factionSlug],
    );
    return mapRow(result.rows[0]);
  }

  async getById(id: string): Promise<CharacterRow | null> {
    const result = await query<DbCharacterRow>(
      `SELECT id, player_id, name, faction_slug, is_active, created_at, last_played_at, deleted_at
       FROM characters
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async setActive(playerId: string, characterId: string): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Deactivate all characters for this player
      await client.query(
        `UPDATE characters SET is_active = false
         WHERE player_id = $1 AND deleted_at IS NULL`,
        [playerId],
      );

      // Activate the target character
      const result = await client.query(
        `UPDATE characters SET is_active = true
         WHERE id = $1 AND player_id = $2 AND deleted_at IS NULL`,
        [characterId, playerId],
      );

      if (result.rowCount === 0) {
        throw new Error('Character not found');
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async softDelete(characterId: string): Promise<void> {
    const result = await query(
      `UPDATE characters SET deleted_at = now(), is_active = false
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    if (result.rowCount === 0) {
      throw new Error('Character not found');
    }
  }

  async getActive(playerId: string): Promise<CharacterRow | null> {
    const result = await query<DbCharacterRow>(
      `SELECT id, player_id, name, faction_slug, is_active, created_at, last_played_at, deleted_at
       FROM characters
       WHERE player_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [playerId],
    );
    if (result.rows.length === 0) return null;
    return mapRow(result.rows[0]);
  }

  async saveLastInn(characterId: string, zoneSlug: string, roomSlug: string): Promise<void> {
    await query(
      `UPDATE characters SET last_inn_zone_slug = $1, last_inn_room_slug = $2
       WHERE id = $3 AND deleted_at IS NULL`,
      [zoneSlug, roomSlug, characterId],
    );
  }

  async getLastInn(characterId: string): Promise<{ zoneSlug: string; roomSlug: string } | null> {
    const result = await query<{ last_inn_zone_slug: string | null; last_inn_room_slug: string | null }>(
      `SELECT last_inn_zone_slug, last_inn_room_slug FROM characters
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    const row = result.rows[0];
    if (!row?.last_inn_zone_slug || !row?.last_inn_room_slug) return null;
    return { zoneSlug: row.last_inn_zone_slug, roomSlug: row.last_inn_room_slug };
  }
}
