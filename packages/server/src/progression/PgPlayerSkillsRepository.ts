/**
 * PgPlayerSkillsRepository — Postgres implementation of PlayerSkillsRepository.
 */

import { query } from '../db/index.js';
import type { PlayerSkillsRepository, PlayerSkillRecord } from './PlayerSkillsRepository.js';
import type { CombatSkillSlug } from './SkillProgression.js';

/** Skill category for combat skills in the DB. */
const COMBAT_CATEGORY = 'combat';
const DEFENCE_CATEGORY = 'defence';

/** Map skill slug → DB category. */
const SKILL_CATEGORY_MAP: Record<CombatSkillSlug, string> = {
  unarmed: COMBAT_CATEGORY,
  one_handed: COMBAT_CATEGORY,
  two_handed: COMBAT_CATEGORY,
  ranged: COMBAT_CATEGORY,
  shield_block: DEFENCE_CATEGORY,
  dodge: DEFENCE_CATEGORY,
  armour: DEFENCE_CATEGORY,
};

export function getSkillCategory(skill: CombatSkillSlug): string {
  return SKILL_CATEGORY_MAP[skill];
}

export class PgPlayerSkillsRepository implements PlayerSkillsRepository {
  async getSkill(characterId: string, skillName: CombatSkillSlug): Promise<PlayerSkillRecord | null> {
    const result = await query<{
      skill_name: string;
      category: string;
      level: number;
      xp: number;
    }>(
      `SELECT skill_name, category, level, xp
       FROM player_skills
       WHERE character_id = $1 AND skill_name = $2`,
      [characterId, skillName],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      skillName: row.skill_name as CombatSkillSlug,
      category: row.category,
      level: row.level,
      xp: row.xp,
    };
  }

  async getAllSkills(characterId: string): Promise<PlayerSkillRecord[]> {
    const result = await query<{
      skill_name: string;
      category: string;
      level: number;
      xp: number;
    }>(
      `SELECT skill_name, category, level, xp
       FROM player_skills
       WHERE character_id = $1
       ORDER BY skill_name`,
      [characterId],
    );
    return result.rows.map((row) => ({
      skillName: row.skill_name as CombatSkillSlug,
      category: row.category,
      level: row.level,
      xp: row.xp,
    }));
  }

  async upsertSkill(characterId: string, playerId: string, record: PlayerSkillRecord): Promise<void> {
    await query(
      `INSERT INTO player_skills (player_id, character_id, skill_name, category, level, xp, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (player_id, skill_name)
       DO UPDATE SET level = $5, xp = $6, updated_at = now()`,
      [playerId, characterId, record.skillName, record.category, record.level, record.xp],
    );
  }

  async getStatPoints(characterId: string): Promise<number> {
    const result = await query<{ stat_points_available: number }>(
      `SELECT stat_points_available FROM characters WHERE id = $1`,
      [characterId],
    );
    return result.rows[0]?.stat_points_available ?? 0;
  }

  async addStatPoints(characterId: string, points: number): Promise<void> {
    await query(
      `UPDATE characters SET stat_points_available = stat_points_available + $1 WHERE id = $2`,
      [points, characterId],
    );
  }
}
