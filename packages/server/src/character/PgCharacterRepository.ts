/**
 * PgCharacterRepository — Postgres implementation of CharacterRepository.
 */

import type { CharacterSummary } from '@ellmud/shared';
import type { CharacterRepository, CharacterRow, PlayerCombatStats } from './CharacterRepository.js';
import { DEFAULT_PLAYER_COMBAT_STATS } from './CharacterRepository.js';
import { query, getClient } from '../db/index.js';

interface DbCharacterRow {
  id: string;
  player_id: string;
  name: string;
  starting_zone_slug: string;
  faction_slug: string | null;
  is_active: boolean;
  created_at: Date;
  last_played_at: Date | null;
  deleted_at: Date | null;
  max_hp: number;
  unarmed: number;
  one_handed: number;
  two_handed: number;
  ranged: number;
  shield_block: number;
  dodge: number;
  armour: number;
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
    startingZoneSlug: row.starting_zone_slug,
    factionSlug: row.faction_slug,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastPlayedAt: row.last_played_at,
    deletedAt: row.deleted_at,
    combatStats: {
      maxHp: row.max_hp ?? DEFAULT_PLAYER_COMBAT_STATS.maxHp,
      unarmed: row.unarmed ?? DEFAULT_PLAYER_COMBAT_STATS.unarmed,
      oneHanded: row.one_handed ?? DEFAULT_PLAYER_COMBAT_STATS.oneHanded,
      twoHanded: row.two_handed ?? DEFAULT_PLAYER_COMBAT_STATS.twoHanded,
      ranged: row.ranged ?? DEFAULT_PLAYER_COMBAT_STATS.ranged,
      shieldBlock: row.shield_block ?? DEFAULT_PLAYER_COMBAT_STATS.shieldBlock,
      dodge: row.dodge ?? DEFAULT_PLAYER_COMBAT_STATS.dodge,
      armour: row.armour ?? DEFAULT_PLAYER_COMBAT_STATS.armour,
    },
  };
}

/** Shared column list for character SELECT queries. */
const CHARACTER_COLUMNS = `id, player_id, name, starting_zone_slug, faction_slug, is_active,
       created_at, last_played_at, deleted_at,
       max_hp, unarmed, one_handed, two_handed, ranged, shield_block, dodge, armour`;

export class PgCharacterRepository implements CharacterRepository {
  async list(playerId: string): Promise<CharacterSummary[]> {
    const result = await query<DbCharacterRow>(
      `SELECT ${CHARACTER_COLUMNS}
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

    const zoneDisplayNames: Record<string, string> = {
      'the-reliquary': 'The Reliquary',
      'the-bloom-observatory': 'The Bloom Observatory',
      'the-carrion-court': 'The Carrion Court',
    };

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
        startingZoneSlug: row.starting_zone_slug,
        startingZoneName: zoneDisplayNames[row.starting_zone_slug] ?? row.starting_zone_slug,
        factionSlug: row.faction_slug,
        factionName: row.faction_slug ? (factionMap.get(row.faction_slug) ?? row.faction_slug) : null,
        isActive: row.is_active,
        createdAt: row.created_at.toISOString(),
        lastPlayedAt: row.last_played_at?.toISOString() ?? null,
        topSkills: skillResult.rows.map((s) => ({ name: s.skill_name, level: s.level })),
        totalRuns: runResult.rows[0]?.total_runs ?? 0,
      });
    }

    return summaries;
  }

  async create(playerId: string, name: string, startingZoneSlug: string): Promise<CharacterRow> {
    const result = await query<DbCharacterRow>(
      `INSERT INTO characters (player_id, name, starting_zone_slug)
       VALUES ($1, $2, $3)
       RETURNING ${CHARACTER_COLUMNS}`,
      [playerId, name, startingZoneSlug],
    );
    return mapRow(result.rows[0]);
  }

  async getById(id: string): Promise<CharacterRow | null> {
    const result = await query<DbCharacterRow>(
      `SELECT ${CHARACTER_COLUMNS}
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
      `SELECT ${CHARACTER_COLUMNS}
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

  async savePosture(characterId: string, posture: string): Promise<void> {
    await query(
      `UPDATE characters SET posture = $1
       WHERE id = $2 AND deleted_at IS NULL`,
      [posture, characterId],
    );
  }

  async loadPosture(characterId: string): Promise<string> {
    const result = await query<{ posture: string }>(
      `SELECT posture FROM characters
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    return result.rows[0]?.posture ?? 'standing';
  }

  async isStarterKitGranted(characterId: string): Promise<boolean> {
    const result = await query<{ starter_kit_granted: boolean }>(
      `SELECT starter_kit_granted FROM characters
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    return result.rows[0]?.starter_kit_granted ?? false;
  }

  async markStarterKitGranted(characterId: string): Promise<void> {
    await query(
      `UPDATE characters SET starter_kit_granted = true
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
  }

  async resetStarterKitFlag(characterId: string): Promise<void> {
    await query(
      `UPDATE characters SET starter_kit_granted = false
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
  }

  async getBaseStats(characterId: string): Promise<PlayerCombatStats> {
    const result = await query<{
      max_hp: number; unarmed: number; one_handed: number; two_handed: number;
      ranged: number; shield_block: number; dodge: number; armour: number;
    }>(
      `SELECT max_hp, unarmed, one_handed, two_handed, ranged, shield_block, dodge, armour
       FROM characters
       WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    const row = result.rows[0];
    if (!row) return { ...DEFAULT_PLAYER_COMBAT_STATS };
    return {
      maxHp: row.max_hp,
      unarmed: row.unarmed,
      oneHanded: row.one_handed,
      twoHanded: row.two_handed,
      ranged: row.ranged,
      shieldBlock: row.shield_block,
      dodge: row.dodge,
      armour: row.armour,
    };
  }

  async saveBaseStats(characterId: string, stats: PlayerCombatStats): Promise<void> {
    await query(
      `UPDATE characters
       SET max_hp = $1, unarmed = $2, one_handed = $3, two_handed = $4,
           ranged = $5, shield_block = $6, dodge = $7, armour = $8
       WHERE id = $9 AND deleted_at IS NULL`,
      [stats.maxHp, stats.unarmed, stats.oneHanded, stats.twoHanded,
       stats.ranged, stats.shieldBlock, stats.dodge, stats.armour, characterId],
    );
  }

  async getStatPointsAvailable(characterId: string): Promise<number> {
    const result = await query<{ stat_points_available: number }>(
      `SELECT stat_points_available FROM characters WHERE id = $1 AND deleted_at IS NULL`,
      [characterId],
    );
    return result.rows[0]?.stat_points_available ?? 0;
  }

  async saveStatPointsAvailable(characterId: string, points: number): Promise<void> {
    await query(
      `UPDATE characters SET stat_points_available = $1 WHERE id = $2 AND deleted_at IS NULL`,
      [points, characterId],
    );
  }

  /** Map PlayerCombatStats keys → DB column names. */
  private static readonly STAT_COLUMN_MAP: Record<keyof PlayerCombatStats, string> = {
    maxHp: 'max_hp',
    unarmed: 'unarmed',
    oneHanded: 'one_handed',
    twoHanded: 'two_handed',
    ranged: 'ranged',
    shieldBlock: 'shield_block',
    dodge: 'dodge',
    armour: 'armour',
  };

  async trainStat(
    characterId: string,
    statKey: keyof PlayerCombatStats,
    increment: number,
  ): Promise<{ newStatValue: number; newPointsAvailable: number } | null> {
    const col = PgCharacterRepository.STAT_COLUMN_MAP[statKey];
    const result = await query<{ new_stat: number; stat_points_available: number }>(
      `UPDATE characters
       SET ${col} = ${col} + $1, stat_points_available = stat_points_available - 1
       WHERE id = $2 AND deleted_at IS NULL AND stat_points_available > 0
       RETURNING ${col} AS new_stat, stat_points_available`,
      [increment, characterId],
    );
    if (result.rows.length === 0) return null;
    return {
      newStatValue: result.rows[0].new_stat,
      newPointsAvailable: result.rows[0].stat_points_available,
    };
  }

  async addStatPoints(characterId: string, points: number): Promise<void> {
    await query(
      `UPDATE characters SET stat_points_available = stat_points_available + $1 WHERE id = $2 AND deleted_at IS NULL`,
      [points, characterId],
    );
  }
}
