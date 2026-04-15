/**
 * Stat Progression Integration Tests — GDD §7.1 / Issue #457
 *
 * End-to-end integration tests for the full progression loop:
 *   Combat Action → XP Gain → Skill Level Up → Stat Points → Training → Combat Effect
 *
 * Tests cross-system interactions and edge cases that span multiple modules.
 *
 * NOTE: Written proactively from the design spec (Issue #457).
 * These tests will need the real module imports once implementation lands.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { CombatStats } from '../combat/CombatState.js';
import {
  calculatePlayerEffectiveStats,
} from '../combat/stats.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_BASE_STATS: CombatStats = {
  maxHp: 100,
  unarmed: 5,
  oneHanded: 5,
  twoHanded: 5,
  ranged: 5,
  shieldBlock: 5,
  dodge: 5,
  armour: 2,
};

const NO_EQUIPMENT = {
  weaponSkill: 'unarmed' as const,
  weaponDamage: 0,
  armour: 0,
  shieldBlock: 0,
};

const ONE_HANDED_WEAPON = {
  weaponSkill: 'one_handed' as const,
  weaponDamage: 8,
  armour: 0,
  shieldBlock: 0,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Stat Progression Integration (GDD §7.1)', () => {
  describe('Training affects effective stats calculation', () => {
    it('should increase effective armour when base armour is trained', () => {
      const before = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, NO_EQUIPMENT);

      const trainedStats = { ...DEFAULT_BASE_STATS, armour: DEFAULT_BASE_STATS.armour + 3 };
      const after = calculatePlayerEffectiveStats(trainedStats, NO_EQUIPMENT);

      expect(after.armour).toBe(before.armour + 3);
    });

    it('should increase effective dodge when base dodge is trained', () => {
      const before = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, NO_EQUIPMENT);

      const trainedStats = { ...DEFAULT_BASE_STATS, dodge: DEFAULT_BASE_STATS.dodge + 2 };
      const after = calculatePlayerEffectiveStats(trainedStats, NO_EQUIPMENT);

      expect(after.dodge).toBe(before.dodge + 2);
    });

    it('should increase effective shieldBlock when base shieldBlock is trained (with shield)', () => {
      // shieldBlock only applies when a shield is equipped (equipment.shieldBlock > 0)
      const withShield = { ...NO_EQUIPMENT, shieldBlock: 3 };
      const before = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, withShield);

      const trainedStats = { ...DEFAULT_BASE_STATS, shieldBlock: DEFAULT_BASE_STATS.shieldBlock + 4 };
      const after = calculatePlayerEffectiveStats(trainedStats, withShield);

      expect(after.shieldBlock).toBe(before.shieldBlock + 4);
    });

    it('should show 0 shieldBlock without a shield even if trained', () => {
      // No shield equipped → effective shieldBlock is always 0
      const trainedStats = { ...DEFAULT_BASE_STATS, shieldBlock: DEFAULT_BASE_STATS.shieldBlock + 10 };
      const effective = calculatePlayerEffectiveStats(trainedStats, NO_EQUIPMENT);

      expect(effective.shieldBlock).toBe(0);
    });

    it('should increase effective attack when weapon skill is trained', () => {
      const before = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, ONE_HANDED_WEAPON);

      const trainedStats = { ...DEFAULT_BASE_STATS, oneHanded: DEFAULT_BASE_STATS.oneHanded + 3 };
      const after = calculatePlayerEffectiveStats(trainedStats, ONE_HANDED_WEAPON);

      expect(after.attack).toBe(before.attack + 3);
    });

    it('should increase maxHp when maxHp is trained', () => {
      const before = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, NO_EQUIPMENT);

      const trainedStats = { ...DEFAULT_BASE_STATS, maxHp: DEFAULT_BASE_STATS.maxHp + 10 };
      const after = calculatePlayerEffectiveStats(trainedStats, NO_EQUIPMENT);

      expect(after.maxHp).toBe(before.maxHp + 10);
    });
  });

  describe('Training stacks with equipment bonuses', () => {
    it('should stack trained armour with equipment armour', () => {
      const trainedStats = { ...DEFAULT_BASE_STATS, armour: DEFAULT_BASE_STATS.armour + 3 };
      const withArmour = { ...NO_EQUIPMENT, armour: 5 };

      const effective = calculatePlayerEffectiveStats(trainedStats, withArmour);

      // base armour (2) + trained (+3) + equipment (+5) = 10
      expect(effective.armour).toBe(DEFAULT_BASE_STATS.armour + 3 + 5);
    });

    it('should stack trained shieldBlock with equipment shieldBlock', () => {
      const trainedStats = { ...DEFAULT_BASE_STATS, shieldBlock: DEFAULT_BASE_STATS.shieldBlock + 2 };
      const withShield = { ...NO_EQUIPMENT, shieldBlock: 3 };

      const effective = calculatePlayerEffectiveStats(trainedStats, withShield);

      expect(effective.shieldBlock).toBe(DEFAULT_BASE_STATS.shieldBlock + 2 + 3);
    });

    it('should stack trained weapon skill with weapon damage', () => {
      const trainedStats = { ...DEFAULT_BASE_STATS, oneHanded: DEFAULT_BASE_STATS.oneHanded + 5 };

      const effective = calculatePlayerEffectiveStats(trainedStats, ONE_HANDED_WEAPON);

      // attack = trained oneHanded (5+5=10) + weapon damage (8) = 18
      expect(effective.attack).toBe(10 + 8);
    });
  });

  describe('Full loop: XP → Level Up → Stat Points → Train → Combat', () => {
    /**
     * Simulates the complete progression loop using stub logic.
     * Once implementation lands, replace stubs with real calls.
     */

    interface SimulatedPlayerProgression {
      skills: Map<string, { level: number; xp: number }>;
      statPoints: number;
      baseStats: CombatStats;
    }

    function createFreshPlayer(): SimulatedPlayerProgression {
      return {
        skills: new Map([
          ['one_handed', { level: 1, xp: 0 }],
          ['dodge', { level: 1, xp: 0 }],
          ['armour', { level: 1, xp: 0 }],
        ]),
        statPoints: 0,
        baseStats: { ...DEFAULT_BASE_STATS },
      };
    }

    function grantXp(player: SimulatedPlayerProgression, skill: string, amount: number): boolean {
      const s = player.skills.get(skill);
      if (!s) return false;
      s.xp += amount;
      const threshold = 100 * (s.level + 1);
      if (s.xp >= threshold) {
        s.level += 1;
        s.xp -= threshold;
        player.statPoints += 1; // 1 point per level-up
        return true; // leveled up
      }
      return false;
    }

    function trainStat(player: SimulatedPlayerProgression, stat: keyof CombatStats): boolean {
      if (player.statPoints <= 0) return false;
      player.baseStats[stat] += 1;
      player.statPoints -= 1;
      return true;
    }

    it('should complete the full loop: combat XP → level → train → better stats', () => {
      const player = createFreshPlayer();

      // Step 1: Earn XP through combat (several actions)
      const effectiveBefore = calculatePlayerEffectiveStats(player.baseStats, ONE_HANDED_WEAPON);

      // Grant enough XP for a level-up (threshold = 100 * 2 = 200)
      let leveledUp = false;
      for (let i = 0; i < 25; i++) {
        leveledUp = grantXp(player, 'one_handed', 10) || leveledUp;
      }

      // Step 2: Verify level-up occurred and stat point was banked
      expect(leveledUp).toBe(true);
      expect(player.statPoints).toBeGreaterThanOrEqual(1);
      expect(player.skills.get('one_handed')!.level).toBe(2);

      // Step 3: Train the stat
      const trained = trainStat(player, 'oneHanded');
      expect(trained).toBe(true);

      // Step 4: Verify effective stats improved
      const effectiveAfter = calculatePlayerEffectiveStats(player.baseStats, ONE_HANDED_WEAPON);
      expect(effectiveAfter.attack).toBe(effectiveBefore.attack + 1);
    });

    it('should accumulate multiple level-ups into banked stat points', () => {
      const player = createFreshPlayer();

      // Grant massive XP across multiple skills
      for (let i = 0; i < 50; i++) {
        grantXp(player, 'one_handed', 10);
        grantXp(player, 'dodge', 10);
      }

      // Should have banked points from multiple level-ups
      expect(player.statPoints).toBeGreaterThanOrEqual(2);
    });

    it('should allow spending points across different stats', () => {
      const player = createFreshPlayer();

      // Bank some stat points
      for (let i = 0; i < 30; i++) {
        grantXp(player, 'one_handed', 10);
      }
      expect(player.statPoints).toBeGreaterThanOrEqual(1);

      // Spend point on a different stat than the one that leveled
      const armourBefore = player.baseStats.armour;
      trainStat(player, 'armour');
      expect(player.baseStats.armour).toBe(armourBefore + 1);
    });
  });

  describe('Persistence: base stats survive save/load cycle', () => {
    /**
     * Integration test: after training, base stats written via saveBaseStats
     * should be loadable via getBaseStats with the same values.
     *
     * This uses in-memory simulation. Replace with real CharacterRepository
     * calls once available in test environment.
     */

    const savedStats = new Map<string, CombatStats>();

    function mockSaveBaseStats(charId: string, stats: CombatStats): void {
      savedStats.set(charId, { ...stats });
    }

    function mockGetBaseStats(charId: string): CombatStats {
      const stored = savedStats.get(charId);
      return stored ? { ...stored } : { ...DEFAULT_BASE_STATS };
    }

    beforeEach(() => {
      savedStats.clear();
    });

    it('should persist trained stats across save/load cycle', () => {
      const charId = 'char-001';
      const trained = { ...DEFAULT_BASE_STATS, oneHanded: 8, dodge: 7, armour: 4 };

      mockSaveBaseStats(charId, trained);
      const loaded = mockGetBaseStats(charId);

      expect(loaded.oneHanded).toBe(8);
      expect(loaded.dodge).toBe(7);
      expect(loaded.armour).toBe(4);
      // Untrained stats should remain at defaults
      expect(loaded.unarmed).toBe(DEFAULT_BASE_STATS.unarmed);
      expect(loaded.maxHp).toBe(DEFAULT_BASE_STATS.maxHp);
    });

    it('should return defaults for a character with no saved stats', () => {
      const loaded = mockGetBaseStats('nonexistent-char');

      expect(loaded).toEqual(DEFAULT_BASE_STATS);
    });

    it('should not mutate stored stats when training further', () => {
      const charId = 'char-002';
      mockSaveBaseStats(charId, { ...DEFAULT_BASE_STATS, armour: 5 });

      // Load, modify, save again
      const loaded = mockGetBaseStats(charId);
      loaded.armour += 1;
      mockSaveBaseStats(charId, loaded);

      const reloaded = mockGetBaseStats(charId);
      expect(reloaded.armour).toBe(6);

      // Original save should not be affected by subsequent modification
      reloaded.armour = 999;
      const finalLoad = mockGetBaseStats(charId);
      expect(finalLoad.armour).toBe(6); // not 999
    });
  });

  describe('Edge: concurrent training attempts', () => {
    /**
     * Simulates rapid sequential training to verify no double-spending.
     * Real concurrent requests would be handled by DB transactions,
     * but we verify the logic layer handles sequencing correctly.
     */

    it('should not double-spend points on rapid sequential calls', () => {
      let points = 1;
      const stats = { ...DEFAULT_BASE_STATS };

      function attemptTrain(stat: keyof CombatStats): boolean {
        if (points <= 0) return false;
        stats[stat] += 1;
        points -= 1;
        return true;
      }

      // Two rapid attempts with only 1 point
      const first = attemptTrain('dodge');
      const second = attemptTrain('dodge');

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(stats.dodge).toBe(DEFAULT_BASE_STATS.dodge + 1);
      expect(points).toBe(0);
    });

    it('should handle multiple players training simultaneously', () => {
      const playerStats = new Map<string, { points: number; stats: CombatStats }>();

      playerStats.set('p1', { points: 2, stats: { ...DEFAULT_BASE_STATS } });
      playerStats.set('p2', { points: 1, stats: { ...DEFAULT_BASE_STATS } });

      function trainFor(pid: string, stat: keyof CombatStats): boolean {
        const p = playerStats.get(pid)!;
        if (p.points <= 0) return false;
        p.stats[stat] += 1;
        p.points -= 1;
        return true;
      }

      trainFor('p1', 'dodge');
      trainFor('p2', 'armour');
      trainFor('p1', 'unarmed');

      expect(playerStats.get('p1')!.stats.dodge).toBe(DEFAULT_BASE_STATS.dodge + 1);
      expect(playerStats.get('p1')!.stats.unarmed).toBe(DEFAULT_BASE_STATS.unarmed + 1);
      expect(playerStats.get('p2')!.stats.armour).toBe(DEFAULT_BASE_STATS.armour + 1);
      expect(playerStats.get('p1')!.points).toBe(0);
      expect(playerStats.get('p2')!.points).toBe(0);
    });
  });
});
