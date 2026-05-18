/**
 * PgPlayerProfileRepository — PostgreSQL-backed player profile persistence.
 *
 * Reads/writes:
 *   - `player_skills`  (migration 003) — skill levels
 *   - `player_profile` (migration 014) — maxCarryWeight & equipment
 */

import { query, getClient } from '../db/index.js';
import type { PlayerProfileRepository, PlayerProfile } from './PlayerProfileRepository.js';
import { DEFAULT_PROFILE } from './PlayerProfileRepository.js';
import type { PlayerSkills } from '../state/PlayerState.js';
import type { VisibleEquipment } from '@ellmud/shared';

interface SkillRow {
  skill_name: string;
  category: string;
  level: number;
  xp: number;
}

interface ProfileRow {
  max_carry_weight: number;
  equipment: VisibleEquipment;
}

/** Map skill names to the PlayerSkills fields we track. */
const SKILL_MAP: Record<string, keyof PlayerSkills> = {
  stealth: 'stealth',
  awareness: 'awareness',
  tracking: 'tracking',
};

export class PgPlayerProfileRepository implements PlayerProfileRepository {
  async load(playerId: string, characterId: string): Promise<PlayerProfile | null> {
    const skillResult = await query<SkillRow>(
      `SELECT skill_name, category, level, xp
       FROM player_skills
       WHERE character_id = $1`,
      [characterId],
    );

    if (skillResult.rows.length === 0) return null;

    const skills: PlayerSkills = { ...DEFAULT_PROFILE.skills };
    for (const row of skillResult.rows) {
      const field = SKILL_MAP[row.skill_name];
      if (field) {
        skills[field] = row.level;
      }
    }

    // Load extended profile (maxCarryWeight, equipment) from migration 014 table.
    const profileResult = await query<ProfileRow>(
      `SELECT max_carry_weight, equipment
       FROM player_profile
       WHERE player_id = $1`,
      [playerId],
    );

    const profileRow = profileResult.rows[0];
    const maxCarryWeight = profileRow?.max_carry_weight ?? DEFAULT_PROFILE.maxCarryWeight;
    const equipment: VisibleEquipment | undefined =
      profileRow && Object.keys(profileRow.equipment).length > 0
        ? profileRow.equipment
        : undefined;

    return { skills, maxCarryWeight, ...(equipment ? { equipment } : {}) };
  }

  async save(playerId: string, characterId: string, profile: PlayerProfile): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // ── Skills (player_skills) ──────────────────────────────────────────
      for (const [skillName, field] of Object.entries(SKILL_MAP)) {
        const value = profile.skills[field];
        if (value === undefined) continue;

        const category = skillName === 'stealth' ? 'subterfuge'
          : skillName === 'tracking' ? 'awareness'
          : 'awareness';

        await client.query(
          `INSERT INTO player_skills (player_id, character_id, skill_name, category, level, updated_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (character_id, skill_name)
           DO UPDATE SET level = $5, updated_at = now()`,
          [playerId, characterId, skillName, category, value],
        );
      }

      // ── Extended profile (player_profile) ───────────────────────────────
      await client.query(
        `INSERT INTO player_profile (player_id, max_carry_weight, equipment, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (player_id)
         DO UPDATE SET max_carry_weight = $2, equipment = $3, updated_at = now()`,
        [
          playerId,
          profile.maxCarryWeight,
          JSON.stringify(profile.equipment ?? {}),
        ],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
