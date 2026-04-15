/**
 * PlayerSkillsRepository — Interface for player skill persistence.
 *
 * Reads and writes the player_skills table (per-character skill levels and XP).
 * Also manages stat_points_available on the characters table.
 */

import type { CombatSkillSlug } from './SkillProgression.js';

/** Skill record as stored in the database. */
export interface PlayerSkillRecord {
  skillName: CombatSkillSlug;
  category: string;
  level: number;
  xp: number;
}

export interface PlayerSkillsRepository {
  /**
   * Get a single skill record for a character.
   * Returns null if the character has no record for this skill (defaults apply).
   */
  getSkill(characterId: string, skillName: CombatSkillSlug): Promise<PlayerSkillRecord | null>;

  /**
   * Get all combat skill records for a character.
   */
  getAllSkills(characterId: string): Promise<PlayerSkillRecord[]>;

  /**
   * Upsert a skill record — create if missing, update if exists.
   */
  upsertSkill(characterId: string, playerId: string, record: PlayerSkillRecord): Promise<void>;

  /**
   * Get the number of banked stat points for a character.
   */
  getStatPoints(characterId: string): Promise<number>;

  /**
   * Add stat points to a character's bank (from level-ups).
   */
  addStatPoints(characterId: string, points: number): Promise<void>;
}
