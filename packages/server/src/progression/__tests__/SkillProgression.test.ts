/**
 * Skill Progression / XP Gain Tests — GDD §7.1
 *
 * Tests for the real SkillProgression system: XP gain on combat actions,
 * zone-tier scaling, soft cap diminishing returns, and level-ups.
 *
 * All tests exercise the REAL implementation — no stubs.
 */

import { describe, it, expect } from 'vitest';
import type { ZoneTier } from '@ellmud/shared';
import {
  type CombatSkillSlug,
  BASE_XP_PER_ACTION,
  ZONE_TIER_XP_MULTIPLIER,
  SOFT_CAP_THRESHOLD,
  SOFT_CAP_DECAY_RATE,
  MIN_XP_GAIN,
  xpForNextLevel,
  cumulativeXpForLevel,
  softCapMultiplier,
  calculateXpGain,
  applyXpGain,
} from '../SkillProgression.js';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Skill Progression — XP Gain System (GDD §7.1)', () => {
  describe('XP granted per combat action type', () => {
    const skills: CombatSkillSlug[] = [
      'one_handed',
      'two_handed',
      'unarmed',
      'ranged',
      'shield_block',
      'dodge',
      'armour',
    ];

    it.each(skills)(
      'should grant XP for %s combat action',
      (_skill) => {
        // calculateXpGain(skillLevel, zoneTier) — real signature
        const xp = calculateXpGain(1, 1 as ZoneTier);
        expect(xp).toBeGreaterThan(0);
      },
    );

    it('should grant base XP for a tier-1 zone at skill level 1', () => {
      const xp = calculateXpGain(1, 1 as ZoneTier);
      // Real formula: BASE_XP_PER_ACTION * ZONE_TIER_XP_MULTIPLIER[1] = 10 * 1.0 = 10
      expect(xp).toBe(BASE_XP_PER_ACTION * ZONE_TIER_XP_MULTIPLIER[1]);
    });
  });

  describe('XP scales with zone tier', () => {
    it('should grant more XP in higher tier zones', () => {
      const xpTier1 = calculateXpGain(1, 1 as ZoneTier);
      const xpTier2 = calculateXpGain(1, 2 as ZoneTier);
      const xpTier3 = calculateXpGain(1, 3 as ZoneTier);

      expect(xpTier2).toBeGreaterThan(xpTier1);
      expect(xpTier3).toBeGreaterThan(xpTier2);
    });

    it('should scale according to ZONE_TIER_XP_MULTIPLIER', () => {
      const xpTier1 = calculateXpGain(1, 1 as ZoneTier);
      const xpTier3 = calculateXpGain(1, 3 as ZoneTier);

      // Tier 3 multiplier is 3.0, Tier 1 is 1.0
      expect(xpTier3).toBe(xpTier1 * ZONE_TIER_XP_MULTIPLIER[3]);
    });
  });

  describe('XP diminishes past soft cap', () => {
    it('should grant full XP below soft cap threshold for zone tier', () => {
      const tier: ZoneTier = 1;
      const threshold = SOFT_CAP_THRESHOLD[tier]; // 10 for tier 1
      // At level 1 and level threshold, both at or below cap → same XP
      const xpAtLevel1 = calculateXpGain(1, tier);
      const xpAtThreshold = calculateXpGain(threshold, tier);

      expect(xpAtThreshold).toBe(xpAtLevel1);
    });

    it('should grant reduced XP past soft cap threshold', () => {
      const tier: ZoneTier = 1;
      const threshold = SOFT_CAP_THRESHOLD[tier]; // 10
      const xpAtCap = calculateXpGain(threshold, tier);
      const xpPastCap = calculateXpGain(threshold + 1, tier);

      expect(xpPastCap).toBeLessThan(xpAtCap);
    });

    it('should grant progressively less XP further past soft cap', () => {
      const tier: ZoneTier = 2;
      const threshold = SOFT_CAP_THRESHOLD[tier]; // 20
      const xpAt1Past = calculateXpGain(threshold + 1, tier);
      const xpAt5Past = calculateXpGain(threshold + 5, tier);
      const xpAt10Past = calculateXpGain(threshold + 10, tier);

      expect(xpAt5Past).toBeLessThanOrEqual(xpAt1Past);
      expect(xpAt10Past).toBeLessThanOrEqual(xpAt5Past);
    });

    it('should never grant less than MIN_XP_GAIN in any zone', () => {
      // Even at extreme soft cap, minimum is MIN_XP_GAIN (1)
      const xp = calculateXpGain(100, 1 as ZoneTier);
      expect(xp).toBeGreaterThanOrEqual(MIN_XP_GAIN);
    });
  });

  describe('softCapMultiplier', () => {
    it('should return 1.0 at or below threshold', () => {
      expect(softCapMultiplier(5, 1 as ZoneTier)).toBe(1.0);
      expect(softCapMultiplier(SOFT_CAP_THRESHOLD[1], 1 as ZoneTier)).toBe(1.0);
    });

    it('should return < 1.0 past threshold', () => {
      const tier: ZoneTier = 1;
      const threshold = SOFT_CAP_THRESHOLD[tier];
      expect(softCapMultiplier(threshold + 1, tier)).toBeLessThan(1.0);
    });

    it('should follow the decay formula', () => {
      const tier: ZoneTier = 2;
      const threshold = SOFT_CAP_THRESHOLD[tier];
      const levelsPast = 4;
      const expected = 1 / (1 + SOFT_CAP_DECAY_RATE * levelsPast);
      expect(softCapMultiplier(threshold + levelsPast, tier)).toBe(expected);
    });
  });

  describe('xpForNextLevel — quadratic curve', () => {
    it('should use formula 50 × level²', () => {
      expect(xpForNextLevel(1)).toBe(50);   // 50 × 1²
      expect(xpForNextLevel(2)).toBe(200);  // 50 × 2²
      expect(xpForNextLevel(5)).toBe(1250); // 50 × 5²
      expect(xpForNextLevel(10)).toBe(5000); // 50 × 10²
    });
  });

  describe('cumulativeXpForLevel', () => {
    it('should return 0 for level 1', () => {
      expect(cumulativeXpForLevel(1)).toBe(0);
    });

    it('should sum xpForNextLevel from 1 to target-1', () => {
      // Level 3 = xpForNextLevel(1) + xpForNextLevel(2) = 50 + 200 = 250
      expect(cumulativeXpForLevel(3)).toBe(250);
    });
  });

  describe('Skill level-up mechanics (applyXpGain)', () => {
    it('should level up when XP reaches threshold', () => {
      // xpForNextLevel(1) = 50. Start at xp=45, gain XP from tier 1 (=10).
      // 45 + 10 = 55 >= 50 → level up, newXp = 55 - 50 = 5
      const result = applyXpGain('one_handed', 45, 1, 1 as ZoneTier);

      expect(result.levelsGained).toBe(1);
      expect(result.newLevel).toBe(2);
      expect(result.newXp).toBe(5);
    });

    it('should not level up when XP is below threshold', () => {
      // xpForNextLevel(1) = 50. Start at xp=0, gain 10 → 10 < 50
      const result = applyXpGain('one_handed', 0, 1, 1 as ZoneTier);

      expect(result.levelsGained).toBe(0);
      expect(result.newLevel).toBe(1);
      expect(result.newXp).toBe(10);
    });

    it('should carry over excess XP after level-up', () => {
      // xpForNextLevel(1) = 50. Start at xp=48, gain 10 → 58 >= 50 → carry 8
      const result = applyXpGain('unarmed', 48, 1, 1 as ZoneTier);

      expect(result.levelsGained).toBe(1);
      expect(result.newXp).toBe(8);
    });

    it('should award stat points equal to levels gained', () => {
      const result = applyXpGain('dodge', 45, 1, 1 as ZoneTier);
      expect(result.statPointsAwarded).toBe(result.levelsGained);
    });

    it('should award 0 stat points when no level-up occurs', () => {
      const result = applyXpGain('dodge', 0, 5, 1 as ZoneTier);
      expect(result.statPointsAwarded).toBe(0);
    });

    it('should handle XP gain at level boundary exactly', () => {
      // xpForNextLevel(1) = 50. Start at xp=40, gain 10 → 50 >= 50 → level up, newXp=0
      const result = applyXpGain('ranged', 40, 1, 1 as ZoneTier);

      expect(result.levelsGained).toBe(1);
      expect(result.newXp).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle multi-level jumps from large XP', () => {
      // xpForNextLevel(1) = 50, xpForNextLevel(2) = 200.
      // Use applyXpGain with high starting xp to force multi-level
      const result = applyXpGain('unarmed', 240, 1, 3 as ZoneTier);
      // Gain from tier 3 at level 1 = 10 * 3.0 = 30. Total = 270.
      // 270 >= 50 → level 2 (220 left), 220 >= 200 → level 3 (20 left), 20 < 450 → stop
      expect(result.newLevel).toBe(3);
      expect(result.levelsGained).toBe(2);
      expect(result.newXp).toBe(20);
    });

    it('should handle XP gain at extreme soft cap gracefully', () => {
      // Even at extreme soft cap, calculateXpGain returns at least MIN_XP_GAIN
      const result = applyXpGain('dodge', 50, 100, 1 as ZoneTier);

      expect(result.xpGained).toBeGreaterThanOrEqual(MIN_XP_GAIN);
      expect(result.newXp).toBeGreaterThanOrEqual(50 + MIN_XP_GAIN);
    });

    it('should return correct skill slug in result', () => {
      const result = applyXpGain('shield_block', 0, 1, 1 as ZoneTier);
      expect(result.skill).toBe('shield_block');
    });

    it('should report xpGained matching calculateXpGain', () => {
      const tier: ZoneTier = 2;
      const level = 3;
      const expectedXp = calculateXpGain(level, tier);
      const result = applyXpGain('armour', 0, level, tier);

      expect(result.xpGained).toBe(expectedXp);
    });
  });
});
