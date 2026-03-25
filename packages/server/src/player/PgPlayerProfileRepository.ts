/**
 * PgPlayerProfileRepository — PostgreSQL-backed player profile persistence.
 *
 * Reads/writes the `player_skills` table (migration 003) for skill data.
 * Equipment and maxCarryWeight are not yet in the DB schema — they use
 * the skills table's xp/level fields and defaults until a dedicated
 * migration adds them.
 */

import { query, getClient } from '../db/index.js';
import type { PlayerProfileRepository, PlayerProfile } from './PlayerProfileRepository.js';
import { DEFAULT_PROFILE } from './PlayerProfileRepository.js';
import type { PlayerSkills } from '../state/PlayerState.js';

interface SkillRow {
  skill_name: string;
  category: string;
  level: number;
  xp: number;
}

/** Map skill names to the PlayerSkills fields we track. */
const SKILL_MAP: Record<string, keyof PlayerSkills> = {
  stealth: 'stealth',
  awareness: 'awareness',
  tracking: 'tracking',
};

export class PgPlayerProfileRepository implements PlayerProfileRepository {
  async load(playerId: string): Promise<PlayerProfile | null> {
    const result = await query<SkillRow>(
      `SELECT skill_name, category, level, xp
       FROM player_skills
       WHERE player_id = $1`,
      [playerId],
    );

    if (result.rows.length === 0) return null;

    const skills: PlayerSkills = { ...DEFAULT_PROFILE.skills };
    for (const row of result.rows) {
      const field = SKILL_MAP[row.skill_name];
      if (field) {
        skills[field] = row.level;
      }
    }

    return {
      skills,
      maxCarryWeight: DEFAULT_PROFILE.maxCarryWeight,
    };
  }

  async save(playerId: string, profile: PlayerProfile): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const [skillName, field] of Object.entries(SKILL_MAP)) {
        const value = profile.skills[field];
        if (value === undefined) continue;

        const category = skillName === 'stealth' ? 'subterfuge'
          : skillName === 'tracking' ? 'awareness'
          : 'awareness';

        await client.query(
          `INSERT INTO player_skills (player_id, skill_name, category, level, updated_at)
           VALUES ($1, $2, $3, $4, now())
           ON CONFLICT (player_id, skill_name)
           DO UPDATE SET level = $4, updated_at = now()`,
          [playerId, skillName, category, value],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
