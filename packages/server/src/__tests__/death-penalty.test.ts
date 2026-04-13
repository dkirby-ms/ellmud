/**
 * DeathPenalty unit tests — stat penalty calculations, stacking, persistence interface.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateStatMultiplier,
  getDeathPenaltyDebuff,
  applyDeathPenalty,
  isDeathPenaltyActive,
  InMemoryDeathPenaltyStore,
  MAX_PENALTY,
  DEATH_PENALTY_DURATION_S,
} from '../systems/DeathPenalty.js';

describe('DeathPenalty', () => {

  // ─── Stat Multiplier Calculation ──────────────────────────────────────────

  describe('calculateStatMultiplier', () => {
    it('should return 1.0 for 0 deaths (no penalty)', () => {
      expect(calculateStatMultiplier(0)).toBe(1.0);
    });

    it('should return 1.0 for negative deaths', () => {
      expect(calculateStatMultiplier(-1)).toBe(1.0);
    });

    it('should reduce stats for 1 death', () => {
      const mult = calculateStatMultiplier(1);
      expect(mult).toBeLessThan(1.0);
      expect(mult).toBeGreaterThan(0.85); // ~9.5% penalty
    });

    it('should apply diminishing returns (each death adds less penalty)', () => {
      const m1 = calculateStatMultiplier(1);
      const m2 = calculateStatMultiplier(2);
      const m3 = calculateStatMultiplier(3);

      // Each step gets smaller
      const step1 = 1.0 - m1;
      const step2 = m1 - m2;
      const step3 = m2 - m3;

      expect(step2).toBeLessThan(step1);
      expect(step3).toBeLessThan(step2);
    });

    it('should never reduce below (1 - MAX_PENALTY)', () => {
      const mult = calculateStatMultiplier(1000);
      expect(mult).toBeGreaterThanOrEqual(1 - MAX_PENALTY);
      expect(mult).toBeCloseTo(1 - MAX_PENALTY, 3);
    });

    it('should produce expected penalty ranges', () => {
      // 1 death: ~9.5%
      expect(1 - calculateStatMultiplier(1)).toBeCloseTo(0.095, 2);
      // 3 deaths: ~25.9%
      expect(1 - calculateStatMultiplier(3)).toBeCloseTo(0.226, 1);
      // 5 deaths: ~39.3%
      expect(1 - calculateStatMultiplier(5)).toBeCloseTo(0.316, 1);
    });
  });

  // ─── Debuff Info ──────────────────────────────────────────────────────────

  describe('getDeathPenaltyDebuff', () => {
    it('should return inactive debuff for 0 deaths', () => {
      const debuff = getDeathPenaltyDebuff(0);
      expect(debuff.active).toBe(false);
      expect(debuff.penaltyPercent).toBe(0);
      expect(debuff.statMultiplier).toBe(1.0);
    });

    it('should return active debuff for 1+ deaths', () => {
      const debuff = getDeathPenaltyDebuff(1);
      expect(debuff.active).toBe(true);
      expect(debuff.penaltyPercent).toBeGreaterThan(0);
      expect(debuff.deathCount).toBe(1);
    });

    it('should cap penalty at 50%', () => {
      const debuff = getDeathPenaltyDebuff(100);
      expect(debuff.penaltyPercent).toBeLessThanOrEqual(50);
    });
  });

  // ─── Stat Application ────────────────────────────────────────────────────

  describe('applyDeathPenalty', () => {
    const baseStats = { maxHp: 100, attack: 10, armour: 2 };

    it('should return unmodified stats for 0 deaths', () => {
      const modified = applyDeathPenalty(baseStats, 0);
      expect(modified).toEqual(baseStats);
    });

    it('should reduce all stats for 1 death', () => {
      const modified = applyDeathPenalty(baseStats, 1);
      expect(modified.maxHp).toBeLessThan(baseStats.maxHp);
      expect(modified.attack).toBeLessThan(baseStats.attack);
      // Armour is 2 → floor(2 * 0.905) = floor(1.81) = 1
      expect(modified.armour).toBeLessThanOrEqual(baseStats.armour);
    });

    it('should never reduce stats below 1', () => {
      const tinyStats = { maxHp: 1, attack: 1, armour: 1 };
      const modified = applyDeathPenalty(tinyStats, 100);
      expect(modified.maxHp).toBeGreaterThanOrEqual(1);
      expect(modified.attack).toBeGreaterThanOrEqual(1);
      expect(modified.armour).toBeGreaterThanOrEqual(1);
    });

    it('should reduce stats more with more deaths', () => {
      const mod1 = applyDeathPenalty(baseStats, 1);
      const mod3 = applyDeathPenalty(baseStats, 3);
      expect(mod3.maxHp).toBeLessThan(mod1.maxHp);
      expect(mod3.attack).toBeLessThan(mod1.attack);
    });

    it('should floor stat values (no fractional stats)', () => {
      const modified = applyDeathPenalty(baseStats, 1);
      expect(Number.isInteger(modified.maxHp)).toBe(true);
      expect(Number.isInteger(modified.attack)).toBe(true);
      expect(Number.isInteger(modified.armour)).toBe(true);
    });
  });

  // ─── Sickness Duration ───────────────────────────────────────────────────

  describe('isDeathPenaltyActive', () => {
    it('should be inactive when no death recorded', () => {
      expect(isDeathPenaltyActive(null)).toBe(false);
    });

    it('should be active immediately after death', () => {
      const now = Date.now();
      expect(isDeathPenaltyActive(now, now)).toBe(true);
    });

    it('should be active within duration window', () => {
      const now = Date.now();
      const halfDuration = (DEATH_PENALTY_DURATION_S * 1000) / 2;
      expect(isDeathPenaltyActive(now - halfDuration, now)).toBe(true);
    });

    it('should be inactive after duration expires', () => {
      const now = Date.now();
      const expired = now - (DEATH_PENALTY_DURATION_S * 1000) - 1;
      expect(isDeathPenaltyActive(expired, now)).toBe(false);
    });
  });

  // ─── In-Memory Store ──────────────────────────────────────────────────────

  describe('InMemoryDeathPenaltyStore', () => {
    it('should start with 0 deaths', async () => {
      const store = new InMemoryDeathPenaltyStore();
      expect(await store.getDeathCount('p1')).toBe(0);
    });

    it('should increment death count', async () => {
      const store = new InMemoryDeathPenaltyStore();
      expect(await store.incrementDeathCount('p1')).toBe(1);
      expect(await store.incrementDeathCount('p1')).toBe(2);
      expect(await store.getDeathCount('p1')).toBe(2);
    });

    it('should reset death count', async () => {
      const store = new InMemoryDeathPenaltyStore();
      await store.incrementDeathCount('p1');
      await store.incrementDeathCount('p1');
      await store.resetDeathCount('p1');
      expect(await store.getDeathCount('p1')).toBe(0);
    });

    it('should track death times', async () => {
      const store = new InMemoryDeathPenaltyStore();
      expect(await store.getLastDeathTime('p1')).toBeNull();
      const now = Date.now();
      await store.setLastDeathTime('p1', now);
      expect(await store.getLastDeathTime('p1')).toBe(now);
    });

    it('should isolate players from each other', async () => {
      const store = new InMemoryDeathPenaltyStore();
      await store.incrementDeathCount('p1');
      await store.incrementDeathCount('p1');
      await store.incrementDeathCount('p2');
      expect(await store.getDeathCount('p1')).toBe(2);
      expect(await store.getDeathCount('p2')).toBe(1);
    });
  });
});
