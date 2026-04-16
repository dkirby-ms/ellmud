/**
 * PlayerSkillsRepository — Interface for player skill persistence.
 *
 * Reads and writes the player_skills table (per-character skill levels and XP).
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
   * Atomically award XP to a skill using relative increment (xp = xp + delta).
   * Handles single level-up in the write to prevent lost updates from concurrent ticks.
   * Returns the new state and previous level for level-up detection.
   */
  awardXp(
    characterId: string,
    playerId: string,
    skill: CombatSkillSlug,
    category: string,
    xpDelta: number,
  ): Promise<{ level: number; xp: number; previousLevel: number }>;
}
