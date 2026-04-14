/**
 * Combat Dodge & Shield Block Tests — New Combat Stat System
 *
 * Spec: copilot-directive-2026-04-13T2140.md
 *
 * Key design decisions:
 * - Agility is REMOVED — dodge formula uses dodge stat only
 * - Dodge formula: min(MAX_DODGE_CHANCE, BASE_DODGE_CHANCE + DODGE_CHANCE_PER_RANK * dodge)
 * - Shield block is BINARY: shieldBlock stat = block CHANCE, success = 0 damage
 * - Resolution order: Dodge → Shield Block → Damage
 * - Both dodge and shield block are passive mechanics
 */

import { describe, it, expect } from 'vitest';

import {
  calculateDamage,
  getDodgeChance,
  getShieldBlockChance,
  DODGE_BASE_CHANCE,
  DODGE_CHANCE_PER_RANK,
  MAX_DODGE_CHANCE,
  BLOCK_BASE_CHANCE,
  BLOCK_CHANCE_PER_RANK,
  MAX_BLOCK_CHANCE,
} from '../combat/damage.js';

// ─── getDodgeChance (no agility) ────────────────────────────────────────────

describe('getDodgeChance (no agility — dodge stat only)', () => {
  it('dodge=0 → returns BASE_DODGE_CHANCE (0.20)', () => {
    expect(getDodgeChance(0)).toBeCloseTo(0.20);
  });

  it('dodge=5 → returns 0.20 + 0.03*5 = 0.35', () => {
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
  });

  it('dodge=10 → returns 0.20 + 0.03*10 = 0.50', () => {
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
  });

  it('dodge=1 → returns 0.20 + 0.03 = 0.23', () => {
    expect(getDodgeChance(1)).toBeCloseTo(0.23);
  });

  it('very high dodge → capped at MAX_DODGE_CHANCE (0.75)', () => {
    // dodge=20 → 0.20 + 0.03*20 = 0.80 → capped at 0.75
    expect(getDodgeChance(20)).toBeCloseTo(MAX_DODGE_CHANCE);
    expect(getDodgeChance(100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('dodge just below cap → not capped', () => {
    // dodge=18 → 0.20 + 0.03*18 = 0.74
    expect(getDodgeChance(18)).toBeCloseTo(0.74);
  });

  it('dodge at exact cap boundary → capped', () => {
    // dodge=19 → 0.20 + 0.03*19 = 0.77 → capped at 0.75
    expect(getDodgeChance(19)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('single-param signature produces correct results (no agility)', () => {
    // The new getDodgeChance takes only dodge stat — no agility.
    // dodge=5 → 0.20 + 0.03*5 = 0.35 (not the old 0.30 from agi=5)
    const result = getDodgeChance(5);
    expect(result).toBeCloseTo(0.35);
  });

  it('exports correct constants', () => {
    expect(DODGE_BASE_CHANCE).toBe(0.20);
    expect(DODGE_CHANCE_PER_RANK).toBe(0.03);
    expect(MAX_DODGE_CHANCE).toBe(0.75);
  });
});

// ─── getShieldBlockChance ───────────────────────────────────────────────────

describe('getShieldBlockChance (binary shield block)', () => {
  it('shieldBlock=0 → returns BLOCK_BASE_CHANCE (5%)', () => {
    // Formula: 5% + 3%*0 = 5% base
    expect(getShieldBlockChance(0)).toBeCloseTo(BLOCK_BASE_CHANCE);
  });

  it('shieldBlock=5 → returns 0.05 + 0.03*5 = 0.20', () => {
    expect(getShieldBlockChance(5)).toBeCloseTo(0.20);
  });

  it('shieldBlock=10 → returns 0.05 + 0.03*10 = 0.35', () => {
    expect(getShieldBlockChance(10)).toBeCloseTo(0.35);
  });

  it('shieldBlock=10 → higher chance than shieldBlock=5', () => {
    expect(getShieldBlockChance(10)).toBeGreaterThan(getShieldBlockChance(5));
  });

  it('very high shieldBlock → capped at MAX_BLOCK_CHANCE (0.60)', () => {
    // shieldBlock=100 → 0.05 + 3.0 = 3.05 → capped at 0.60
    expect(getShieldBlockChance(100)).toBeCloseTo(MAX_BLOCK_CHANCE);
    expect(getShieldBlockChance(200)).toBeCloseTo(MAX_BLOCK_CHANCE);
  });

  it('shieldBlock scales linearly before cap', () => {
    const c5 = getShieldBlockChance(5);
    const c10 = getShieldBlockChance(10);
    const c15 = getShieldBlockChance(15);
    const delta1 = c10 - c5;
    const delta2 = c15 - c10;
    // Both deltas should be 0.15 (5 * 0.03) — linear scaling before cap
    expect(delta1).toBeCloseTo(0.15);
    expect(delta2).toBeCloseTo(delta1);
  });

  it('exports correct block constants', () => {
    expect(BLOCK_BASE_CHANCE).toBe(0.05);
    expect(BLOCK_CHANCE_PER_RANK).toBe(0.03);
    expect(MAX_BLOCK_CHANCE).toBe(0.60);
  });
});

// ─── calculateDamage — binary shield block ──────────────────────────────────

describe('calculateDamage — binary shield block', () => {
  const attack = 10;
  const armour = 2;

  it('shield block succeeds → finalDamage = 0, blocked = true', () => {
    // shieldBlock=10 → blockChance = 0.05 + 0.03*10 = 0.35; roll 0.01 < 0.35 → blocked
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderShieldBlock: 10,
      blockRoll: 0.01,
      dodgeRoll: 0.99,
      defenderDodge: 5,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.blocked).toBe(true);
  });

  it('shield block fails → normal damage calculation', () => {
    // shieldBlock=5 → blockChance = 0.05 + 0.03*5 = 0.20; roll 0.99 > 0.20 → not blocked
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderShieldBlock: 5,
      blockRoll: 0.99,
      dodgeRoll: 0.99,
      defenderDodge: 5,
    });
    expect(result.finalDamage).toBe(8); // 10 - 2
    expect(result.blocked).toBeUndefined();
  });

  it('shieldBlock = 0 → no block roll at all', () => {
    // shieldBlock=0 means no equipped shield → block logic is skipped entirely
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderShieldBlock: 0,
      blockRoll: 0.01, // low roll, but shouldn't trigger
      dodgeRoll: 0.99,
      defenderDodge: 0,
    });
    expect(result.finalDamage).toBeGreaterThan(0);
    expect(result.blocked).toBeUndefined();
  });

  it('dodge takes priority over shield block (dodge first in resolution)', () => {
    // Dodge succeeds → shield block never checked
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.01,         // dodge succeeds (0.01 < 0.35)
      defenderShieldBlock: 10,
      blockRoll: 0.01,         // block would also succeed, but not reached
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
    expect(result.blocked).toBeUndefined();
  });

  it('dodge fails, shield block succeeds → blocked = true', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99,         // dodge fails
      defenderShieldBlock: 10,
      blockRoll: 0.01,         // block succeeds
    });
    expect(result.finalDamage).toBe(0);
    expect(result.blocked).toBe(true);
    expect(result.dodged).toBeUndefined();
  });

  it('both dodge and block fail → full damage', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99,
      defenderShieldBlock: 5,
      blockRoll: 0.99,
    });
    expect(result.finalDamage).toBe(8); // 10 - 2
    expect(result.dodged).toBeUndefined();
    expect(result.blocked).toBeUndefined();
  });

  it('shield block with high shieldBlock and low roll → always blocks', () => {
    const result = calculateDamage(20, armour, 'strike', 'strike', {
      defenderShieldBlock: 50,
      blockRoll: 0.01,
      dodgeRoll: 0.99,
      defenderDodge: 0,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.blocked).toBe(true);
  });

  it('breakdown includes blockChance when shield is present', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderShieldBlock: 10,
      blockRoll: 0.99, // fail block to see breakdown
      dodgeRoll: 0.99,
      defenderDodge: 0,
    });
    expect(result.breakdown?.blockChance).toBeCloseTo(0.35); // 0.05 + 0.03*10
  });
});

// ─── calculateDamage — dodge with new formula (no agility) ──────────────────

describe('calculateDamage — dodge (no agility)', () => {
  const attack = 10;
  const armour = 2;

  it('dodge succeeds → 0 damage, dodged=true', () => {
    // dodge=5 → 35% chance; roll 0.10 < 0.35 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('dodge fails → full damage', () => {
    // dodge=5 → 35% chance; roll 0.50 > 0.35 → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.50,
    });
    expect(result.finalDamage).toBe(8); // 10 - 2
    expect(result.dodged).toBeUndefined();
  });

  it('dodge=0 still has base 20% chance', () => {
    // dodge=0 → 20% base; roll 0.15 < 0.20 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 0,
      dodgeRoll: 0.15,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('no dodge options → no dodge roll (backward compat)', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike');
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('breakdown includes dodgeChance', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99, // fail dodge to see breakdown
    });
    expect(result.breakdown?.dodgeChance).toBeCloseTo(0.35); // 0.20 + 0.03*5
  });
});

// ─── Resolution order integration: Dodge → Block → Damage ──────────────────

describe('Resolution order: Dodge → Shield Block → Damage', () => {
  it('all three layers: dodge miss, block miss, armour reduces', () => {
    const result = calculateDamage(15, 3, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99,
      defenderShieldBlock: 5,
      blockRoll: 0.99,
    });
    // 15 - 3 = 12
    expect(result.finalDamage).toBe(12);
  });

  it('dodge hit → short circuits (block and damage never apply)', () => {
    const result = calculateDamage(15, 3, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.01,
      defenderShieldBlock: 5,
      blockRoll: 0.99,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
    expect(result.blocked).toBeUndefined();
  });

  it('dodge miss, block hit → damage = 0 via block', () => {
    const result = calculateDamage(15, 3, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99,
      defenderShieldBlock: 10,
      blockRoll: 0.01,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBeUndefined();
    expect(result.blocked).toBe(true);
  });

  it('non-strike action → no damage regardless of dodge/block', () => {
    const result = calculateDamage(15, 3, 'flee', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.99,
      defenderShieldBlock: 5,
      blockRoll: 0.99,
    });
    expect(result.finalDamage).toBe(0);
  });
});
