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
       ON CONFLICT (character_id, skill_name)
       DO UPDATE SET level = $5, xp = $6, updated_at = now()`,
      [playerId, characterId, record.skillName, record.category, record.level, record.xp],
    );
  }

  async awardXp(
    characterId: string,
    playerId: string,
    skill: CombatSkillSlug,
    category: string,
    xpDelta: number,
  ): Promise<{ level: number; xp: number; previousLevel: number }> {
    // Atomic upsert: INSERT for new skills, UPDATE with relative xp increment.
    // Level-up is resolved in SQL using the quadratic formula: threshold = 50 * level^2.
    // Handles at most one level-up per write (sufficient for per-action XP awards).
    const result = await query<{ level: number; xp: number; previous_level: number }>(
      `WITH old AS (
         SELECT level AS prev_level
         FROM player_skills
         WHERE character_id = $2 AND skill_name = $3
       ),
       upserted AS (
         INSERT INTO player_skills (player_id, character_id, skill_name, category, level, xp, updated_at)
         VALUES ($1, $2, $3, $4, 1, $5, now())
         ON CONFLICT (character_id, skill_name)
         DO UPDATE SET
           level = CASE
             WHEN player_skills.xp + $5 >= (50 * player_skills.level * player_skills.level)
             THEN player_skills.level + 1
             ELSE player_skills.level
           END,
           xp = CASE
             WHEN player_skills.xp + $5 >= (50 * player_skills.level * player_skills.level)
             THEN player_skills.xp + $5 - (50 * player_skills.level * player_skills.level)
             ELSE player_skills.xp + $5
           END,
           updated_at = now()
         RETURNING level, xp
       )
       SELECT u.level, u.xp, COALESCE(o.prev_level, 0) AS previous_level
       FROM upserted u
       LEFT JOIN old o ON true`,
      [playerId, characterId, skill, category, xpDelta],
    );

    const row = result.rows[0];
    if (!row) throw new Error(`awardXp: unexpected empty result for ${skill}`);
    return { level: row.level, xp: row.xp, previousLevel: row.previous_level };
  }
}
