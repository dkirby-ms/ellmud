/**
 * Skill Progression / XP Gain Tests — GDD §7.1
 *
 * Tests for Jarlaxle's SkillProgression system: XP gain on combat actions,
 * zone-tier scaling, soft cap diminishing returns, anti-farming, and level-ups.
 *
 * NOTE: Written proactively from the design spec (Issue #457).
 * Minor adjustments may be needed once implementation lands.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Expected module paths (adjust once implementation lands) ───────────────
// import { SkillProgression } from '../SkillProgression.js';
// import type { SkillProgressionConfig } from '../SkillProgression.js';

// ─── Placeholder types matching the design spec ─────────────────────────────

/** Skill categories that map to combat actions. */
type SkillCategory =
  | 'one_handed'
  | 'two_handed'
  | 'unarmed'
  | 'ranged'
  | 'shield_block'
  | 'dodge'
  | 'armour';

/** Player skill record as stored in the player_skills table. */
interface PlayerSkillRecord {
  skillName: SkillCategory;
  level: number;
  xp: number;
}

/** Result of granting XP to a skill. */
interface XpGainResult {
  skillName: SkillCategory;
  xpGained: number;
  totalXp: number;
  leveledUp: boolean;
  newLevel: number;
  statPointsAwarded: number;
}

// ─── Stub implementation for proactive testing ──────────────────────────────
// Replace with real imports once Jarlaxle's code lands.

const BASE_XP_PER_ACTION = 10;
const XP_PER_LEVEL = 100;
const SOFT_CAP_THRESHOLD = 10; // Skill level where diminishing returns kick in

/** Calculate XP gain with zone tier scaling and soft cap. */
function calculateXpGain(
  actionSkill: SkillCategory,
  skillLevel: number,
  zoneTier: number,
  _playerLevel?: number,
): number {
  // Anti-farming: no XP if zone is below player's skill level
  if (zoneTier < skillLevel) return 0;

  let xp = BASE_XP_PER_ACTION;

  // Zone tier scaling: higher tier zones give more XP
  xp = Math.floor(xp * (1 + (zoneTier - 1) * 0.25));

  // Soft cap: diminishing returns past threshold
  if (skillLevel >= SOFT_CAP_THRESHOLD) {
    const overCap = skillLevel - SOFT_CAP_THRESHOLD + 1;
    const diminishFactor = 1 / (1 + overCap * 0.5);
    xp = Math.max(1, Math.floor(xp * diminishFactor));
  }

  return xp;
}

/** Check if skill has leveled up and return result. */
function applyXpGain(
  skill: PlayerSkillRecord,
  xpGained: number,
): XpGainResult {
  const newXp = skill.xp + xpGained;
  const xpForNextLevel = XP_PER_LEVEL * (skill.level + 1);
  const leveledUp = newXp >= xpForNextLevel;
  const newLevel = leveledUp ? skill.level + 1 : skill.level;

  return {
    skillName: skill.skillName,
    xpGained,
    totalXp: leveledUp ? newXp - xpForNextLevel : newXp,
    leveledUp,
    newLevel,
    statPointsAwarded: leveledUp ? 1 : 0, // 1 stat point per level-up (design decision #1)
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Skill Progression — XP Gain System (GDD §7.1)', () => {
  describe('XP granted per combat action type', () => {
    const actionTypes: SkillCategory[] = [
      'one_handed',
      'two_handed',
      'unarmed',
      'ranged',
      'shield_block',
      'dodge',
      'armour',
    ];

    it.each(actionTypes)(
      'should grant XP for %s combat action',
      (action) => {
        const xp = calculateXpGain(action, 1, 1);
        expect(xp).toBeGreaterThan(0);
      },
    );

    it('should grant base XP for a tier-1 zone at skill level 1', () => {
      const xp = calculateXpGain('one_handed', 1, 1);
      expect(xp).toBe(BASE_XP_PER_ACTION);
    });
  });

  describe('XP scales with zone tier', () => {
    it('should grant more XP in higher tier zones', () => {
      const xpTier1 = calculateXpGain('one_handed', 1, 1);
      const xpTier2 = calculateXpGain('one_handed', 1, 2);
      const xpTier3 = calculateXpGain('one_handed', 1, 3);

      expect(xpTier2).toBeGreaterThan(xpTier1);
      expect(xpTier3).toBeGreaterThan(xpTier2);
    });

    it('should scale proportionally to zone tier', () => {
      const xpTier1 = calculateXpGain('one_handed', 1, 1);
      const xpTier5 = calculateXpGain('one_handed', 1, 5);

      // Tier 5 should be meaningfully more than tier 1
      expect(xpTier5).toBeGreaterThanOrEqual(xpTier1 * 1.5);
    });
  });

  describe('XP diminishes past soft cap', () => {
    it('should grant full XP below soft cap threshold', () => {
      const xpBeforeCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD - 1, SOFT_CAP_THRESHOLD);
      const xpAtBase = calculateXpGain('one_handed', 1, SOFT_CAP_THRESHOLD);

      // Below cap, same tier should give same XP (no diminishing)
      expect(xpBeforeCap).toBe(xpAtBase);
    });

    it('should grant reduced XP at soft cap threshold', () => {
      // At cap, same tier — diminishing returns apply
      const xpBeforeCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD - 1, SOFT_CAP_THRESHOLD + 5);
      const xpAtCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD, SOFT_CAP_THRESHOLD + 5);

      expect(xpAtCap).toBeLessThan(xpBeforeCap);
    });

    it('should grant progressively less XP further past soft cap', () => {
      const xpAtCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD, SOFT_CAP_THRESHOLD + 5);
      const xpPastCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD + 3, SOFT_CAP_THRESHOLD + 5);
      const xpFarPastCap = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD + 6, SOFT_CAP_THRESHOLD + 10);

      expect(xpPastCap).toBeLessThanOrEqual(xpAtCap);
      expect(xpFarPastCap).toBeLessThanOrEqual(xpPastCap);
    });

    it('should never grant 0 XP when in an appropriate zone (minimum 1)', () => {
      // Even at very high skill levels in appropriate zones, minimum XP is 1
      const xp = calculateXpGain('one_handed', SOFT_CAP_THRESHOLD + 50, SOFT_CAP_THRESHOLD + 50);
      expect(xp).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Anti-farming: no XP in low-tier zones', () => {
    it('should grant 0 XP when zone tier is below skill level', () => {
      const xp = calculateXpGain('one_handed', 5, 3);
      expect(xp).toBe(0);
    });

    it('should grant XP when zone tier equals skill level', () => {
      const xp = calculateXpGain('one_handed', 5, 5);
      expect(xp).toBeGreaterThan(0);
    });

    it('should grant XP when zone tier exceeds skill level', () => {
      const xp = calculateXpGain('one_handed', 3, 5);
      expect(xp).toBeGreaterThan(0);
    });

    it('should prevent farming tier 1 zones with high skill', () => {
      const xp = calculateXpGain('one_handed', 10, 1);
      expect(xp).toBe(0);
    });
  });

  describe('Skill level-up mechanics', () => {
    let baseSkill: PlayerSkillRecord;

    beforeEach(() => {
      baseSkill = { skillName: 'one_handed', level: 1, xp: 0 };
    });

    it('should level up when XP reaches threshold', () => {
      // XP threshold for level 2 = XP_PER_LEVEL * 2 = 200
      baseSkill.xp = XP_PER_LEVEL * (baseSkill.level + 1) - 5;
      const result = applyXpGain(baseSkill, 10);

      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBe(2);
    });

    it('should not level up when XP is below threshold', () => {
      baseSkill.xp = 50;
      const result = applyXpGain(baseSkill, 10);

      expect(result.leveledUp).toBe(false);
      expect(result.newLevel).toBe(1);
    });

    it('should carry over excess XP after level-up', () => {
      const xpForNextLevel = XP_PER_LEVEL * (baseSkill.level + 1);
      baseSkill.xp = xpForNextLevel - 5;
      const result = applyXpGain(baseSkill, 10);

      expect(result.leveledUp).toBe(true);
      expect(result.totalXp).toBe(5); // 5 excess XP carried over
    });

    it('should award exactly 1 stat point per level-up', () => {
      baseSkill.xp = XP_PER_LEVEL * (baseSkill.level + 1) - 1;
      const result = applyXpGain(baseSkill, 5);

      expect(result.statPointsAwarded).toBe(1);
    });

    it('should award 0 stat points when no level-up occurs', () => {
      baseSkill.xp = 0;
      const result = applyXpGain(baseSkill, 5);

      expect(result.statPointsAwarded).toBe(0);
    });

    it('should handle XP gain at level boundary exactly', () => {
      const xpForNextLevel = XP_PER_LEVEL * (baseSkill.level + 1);
      baseSkill.xp = xpForNextLevel - 10;
      const result = applyXpGain(baseSkill, 10);

      expect(result.leveledUp).toBe(true);
      expect(result.totalXp).toBe(0); // exact boundary
    });
  });

  describe('Edge cases: XP overflow at level boundaries', () => {
    it('should handle very large XP gains gracefully', () => {
      const skill: PlayerSkillRecord = { skillName: 'unarmed', level: 1, xp: 0 };
      const massiveXp = XP_PER_LEVEL * 10; // Enough for multiple levels potentially
      const result = applyXpGain(skill, massiveXp);

      // Should at least level up once
      expect(result.leveledUp).toBe(true);
      expect(result.newLevel).toBeGreaterThanOrEqual(2);
    });

    it('should handle XP gain of 0 gracefully', () => {
      const skill: PlayerSkillRecord = { skillName: 'dodge', level: 5, xp: 50 };
      const result = applyXpGain(skill, 0);

      expect(result.leveledUp).toBe(false);
      expect(result.totalXp).toBe(50);
      expect(result.xpGained).toBe(0);
    });

    it('should handle skill at level 0 correctly', () => {
      const skill: PlayerSkillRecord = { skillName: 'ranged', level: 0, xp: 0 };
      const result = applyXpGain(skill, BASE_XP_PER_ACTION);

      expect(result.totalXp).toBeGreaterThan(0);
    });
  });
});
