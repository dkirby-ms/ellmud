/**
 * InMemoryPlayerSkillsRepository — Test double for PlayerSkillsRepository.
 *
 * Mirrors the Pg implementation with a Map-based store so integration tests
 * can run without Postgres.
 */

import type { PlayerSkillsRepository, PlayerSkillRecord } from './PlayerSkillsRepository.js';
import type { CombatSkillSlug } from './SkillProgression.js';

export class InMemoryPlayerSkillsRepository implements PlayerSkillsRepository {
  private skills = new Map<string, PlayerSkillRecord>();
  private statPoints = new Map<string, number>();

  private key(characterId: string, skillName: CombatSkillSlug): string {
    return `${characterId}:${skillName}`;
  }

  async getSkill(characterId: string, skillName: CombatSkillSlug): Promise<PlayerSkillRecord | null> {
    return this.skills.get(this.key(characterId, skillName)) ?? null;
  }

  async getAllSkills(characterId: string): Promise<PlayerSkillRecord[]> {
    const prefix = `${characterId}:`;
    const results: PlayerSkillRecord[] = [];
    for (const [k, v] of this.skills) {
      if (k.startsWith(prefix)) results.push(v);
    }
    return results.sort((a, b) => a.skillName.localeCompare(b.skillName));
  }

  async upsertSkill(characterId: string, _playerId: string, record: PlayerSkillRecord): Promise<void> {
    this.skills.set(this.key(characterId, record.skillName), { ...record });
  }

  async awardXp(
    characterId: string,
    _playerId: string,
    skill: CombatSkillSlug,
    category: string,
    xpDelta: number,
  ): Promise<{ level: number; xp: number; previousLevel: number }> {
    const key = this.key(characterId, skill);
    const existing = this.skills.get(key);
    const previousLevel = existing?.level ?? 0;
    let level = existing?.level ?? 1;
    let xp = (existing?.xp ?? 0) + xpDelta;

    // Resolve level-up: threshold = 50 * level^2 (matches SkillProgression.xpForNextLevel)
    while (xp >= 50 * level * level) {
      xp -= 50 * level * level;
      level++;
    }

    this.skills.set(key, { skillName: skill, category, level, xp });
    return { level, xp, previousLevel };
  }

  async getStatPoints(characterId: string): Promise<number> {
    return this.statPoints.get(characterId) ?? 0;
  }

  async addStatPoints(characterId: string, points: number): Promise<void> {
    this.statPoints.set(characterId, (this.statPoints.get(characterId) ?? 0) + points);
  }
}
