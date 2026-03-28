/**
 * Dodge Chance — AGI + Skill Rank Tests (Issue #162, GDD §6.4)
 *
 * Spec: dodge % = 20% + (2% × AGI) + (3% × dodge_skill_rank)
 * Cap: 75% (MAX_DODGE_CHANCE)
 *
 * These tests validate the NEW formula. They will initially fail until
 * the implementation lands (Drizzt, Issue #162).
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  getDodgeChance,
  MAX_DODGE_CHANCE,
} from '../combat/damage.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type CombatStats,
} from '../combat/CombatState.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
  if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
  return [];
}

function makePlayer(
  id: string,
  roomId = TEST_ROOM,
  stats?: Partial<CombatStats>,
): ReturnType<typeof createCombatant> {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, merged);
}

// ─── getDodgeChance — new formula unit tests ────────────────────────────────

describe('getDodgeChance (AGI + skill rank formula — GDD §6.4)', () => {
  it('base dodge chance with 0 AGI and 0 skill rank is 20%', () => {
    // 20% + (2% × 0) + (3% × 0) = 20%
    expect(getDodgeChance(0, 0)).toBeCloseTo(0.20);
  });

  it('default AGI (5) with no skill rank gives 30%', () => {
    // 20% + (2% × 5) + (3% × 0) = 30%
    expect(getDodgeChance(5, 0)).toBeCloseTo(0.30);
  });

  it('AGI scaling: each AGI point adds 2%', () => {
    // 20% + (2% × 1) = 22%
    expect(getDodgeChance(1, 0)).toBeCloseTo(0.22);
    // 20% + (2% × 10) = 40%
    expect(getDodgeChance(10, 0)).toBeCloseTo(0.40);
    // 20% + (2% × 15) = 50%
    expect(getDodgeChance(15, 0)).toBeCloseTo(0.50);
  });

  it('skill rank scaling: each rank adds 3%', () => {
    // 20% + (2% × 0) + (3% × 1) = 23%
    expect(getDodgeChance(0, 1)).toBeCloseTo(0.23);
    // 20% + (2% × 0) + (3% × 5) = 35%
    expect(getDodgeChance(0, 5)).toBeCloseTo(0.35);
    // 20% + (2% × 0) + (3% × 10) = 50%
    expect(getDodgeChance(0, 10)).toBeCloseTo(0.50);
  });

  it('combined AGI + skill rank', () => {
    // 20% + (2% × 5) + (3% × 3) = 20 + 10 + 9 = 39%
    expect(getDodgeChance(5, 3)).toBeCloseTo(0.39);
    // 20% + (2% × 10) + (3% × 5) = 20 + 20 + 15 = 55%
    expect(getDodgeChance(10, 5)).toBeCloseTo(0.55);
  });

  it('caps at 75% (MAX_DODGE_CHANCE)', () => {
    // 20% + (2% × 20) + (3% × 10) = 20 + 40 + 30 = 90% → capped at 75%
    expect(getDodgeChance(20, 10)).toBeCloseTo(MAX_DODGE_CHANCE);
    // Extreme values
    expect(getDodgeChance(100, 100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('values just below and at the cap boundary', () => {
    // Find combo that yields exactly 75%: 20 + (2×X) + (3×Y) = 75
    // AGI=15, skill=5 → 20 + 30 + 15 = 65% (below cap)
    expect(getDodgeChance(15, 5)).toBeCloseTo(0.65);

    // AGI=15, skill=8 → 20 + 30 + 24 = 74% (just below cap)
    expect(getDodgeChance(15, 8)).toBeCloseTo(0.74);

    // AGI=16, skill=8 → 20 + 32 + 24 = 76% → capped at 75%
    expect(getDodgeChance(16, 8)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('defaults skill rank to 0 when not provided', () => {
    // Backward compat: getDodgeChance(agi) without skill should still work
    // 20% + (2% × 5) + (3% × 0) = 30%
    expect(getDodgeChance(5)).toBeCloseTo(0.30);
  });
});

// ─── calculateDamage — dodge with AGI + skill rank ──────────────────────────

describe('calculateDamage dodge with AGI + skill (GDD §6.4)', () => {
  const attack = 10;
  const armour = 2;

  it('dodge success: zero damage when roll < dodge chance', () => {
    // AGI=5, skill=0 → 30% dodge chance; roll 0.10 < 0.30 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 5,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('dodge failure: full (halved) damage when roll >= dodge chance', () => {
    // AGI=5, skill=0 → 30% dodge chance; roll 0.50 >= 0.30 → no dodge
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 5,
      dodgeRoll: 0.50,
    });
    // 10 * 0.5 - 2 = 3
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('boundary: roll exactly at dodge chance does NOT dodge (strict <)', () => {
    // AGI=5 → ~30% chance; roll 0.31 clearly above → no dodge
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 5,
      dodgeRoll: 0.31,
    });
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('high AGI + skill: dodges at higher roll values', () => {
    // AGI=10, skill=5 → 55% dodge chance; roll 0.50 < 0.55 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 10,
      defenderDodgeSkillRank: 5,
      dodgeRoll: 0.50,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('cap enforcement at 75% in damage calculation', () => {
    // AGI=30, skill=30 → way over 75%, but capped
    // Roll 0.74 < 0.75 → dodge
    const dodged = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 30,
      defenderDodgeSkillRank: 30,
      dodgeRoll: 0.74,
    });
    expect(dodged.finalDamage).toBe(0);
    expect(dodged.dodged).toBe(true);

    // Roll 0.76 >= 0.75 → no dodge
    const notDodged = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 30,
      defenderDodgeSkillRank: 30,
      dodgeRoll: 0.76,
    });
    expect(notDodged.finalDamage).toBe(3);
    expect(notDodged.dodged).toBeUndefined();
  });

  it('0 AGI still has 20% base dodge chance', () => {
    // AGI=0, skill=0 → 20% chance; roll 0.15 < 0.20 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 0,
      dodgeRoll: 0.15,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('non-dodge action ignores dodge roll entirely', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderAgility: 15,
      dodgeRoll: 0.01,
    });
    // Full damage: 10 * 1.0 - 2 = 8
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('no options: backward compatible (no dodge roll)', () => {
    const result = calculateDamage(attack, armour, 'strike', 'dodge');
    // 10 * 0.5 - 2 = 3, no dodge chance applied
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });
});

// ─── CombatSystem integration — dodge success/failure ───────────────────────

describe('CombatSystem dodge integration (GDD §6.4)', () => {
  it('dodge success → defender takes no damage', () => {
    // Roll always 0.0 → always below any positive dodge chance
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    const result = system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp);

    const strike = result.events.find(e => e.type === 'strike');
    expect(strike).toBeDefined();
    expect(strike!.dodged).toBe(true);
    expect(strike!.damage).toBe(0);
  });

  it('dodge failure → defender takes halved damage', () => {
    // Roll always 0.99 → never dodges
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    // 10 * 0.5 - 2 = 3
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('dodge narration contains dodge message on success', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    const result = system.resolveTick();

    const strike = result.events.find(e => e.type === 'strike' && e.dodged);
    expect(strike).toBeDefined();
    expect(strike!.narration).toMatch(/dodge/i);
  });

  it('multiple dodges per combat round (not one-per-combat)', () => {
    // Defender dodges tick after tick — dodge is reusable
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Tick 1: dodge
    system.submitAction('p2', 'dodge');
    const r1 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);
    expect(r1.events.find(e => e.type === 'strike')!.dodged).toBe(true);

    // Tick 2: dodge again
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'dodge');
    const r2 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);
    expect(r2.events.find(e => e.type === 'strike')!.dodged).toBe(true);

    // Tick 3: dodge a third time
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'dodge');
    const r3 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);
    expect(r3.events.find(e => e.type === 'strike')!.dodged).toBe(true);
  });

  it('multiple attackers in same tick: defender can dodge all', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const a1 = makePlayer('a1');
    const a2 = makePlayer('a2');
    const defender = makePlayer('def');
    system.registerCombatant(a1);
    system.registerCombatant(a2);
    system.registerCombatant(defender);

    system.initiateCombat('a1', 'def');
    system.initiateCombat('a2', 'def');

    system.submitAction('a2', 'strike', 'def');
    system.submitAction('def', 'dodge');

    const result = system.resolveTick();

    // Defender should have dodged both strikes
    expect(defender.hp).toBe(defender.maxHp);
    const strikes = result.events.filter(e => e.type === 'strike');
    expect(strikes.length).toBe(2);
    expect(strikes.every(s => s.dodged === true)).toBe(true);
  });

  it('default CombatSystem (no PRNG) never dodges — backward compat', () => {
    const system = new CombatSystem(testExitResolver);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    // Default roll = 1 → never dodges → defender takes halved damage
    expect(defender.hp).toBe(defender.maxHp - 3);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('Dodge edge cases (GDD §6.4)', () => {
  it('dodge during flee: fleeing combatant gets no dodge benefit', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const fleer = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(fleer);
    system.initiateCombat('p1', 'p2');

    // p2 flees (not dodging) — should take full damage, not dodge
    system.submitAction('p2', 'flee');
    system.resolveTick();

    // Flee = no dodge multiplier, full damage: 10 * 1.0 - 2 = 8
    expect(fleer.hp).toBe(fleer.maxHp - 8);
  });

  it('dodge when both dodge: no damage dealt (neither strikes)', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    // Consume auto-queued strike tick
    system.resolveTick();

    // Both dodge: no strikes at all
    system.submitAction('p1', 'dodge');
    system.submitAction('p2', 'dodge');
    const result = system.resolveTick();

    const strikes = result.events.filter(e => e.type === 'strike');
    expect(strikes).toHaveLength(0);
  });

  it('dodge with minimum damage (high armour) still results in 0 on success', () => {
    // Even if base damage would be min(1), dodge zeroes it completely
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1', TEST_ROOM, { attack: 3 });
    const defender = makePlayer('p2', TEST_ROOM, { armour: 10 });
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    const result = system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp);
    expect(result.events.find(e => e.type === 'strike')!.dodged).toBe(true);
  });

  it('disconnected combatant defaults to dodge (existing behavior preserved)', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Disconnect p2 — should auto-dodge
    system.markDisconnected('p2');

    system.resolveTick(); // consume auto-queued strike

    system.submitAction('p1', 'strike', 'p2');
    const result = system.resolveTick();

    // Disconnected p2 auto-dodges — with PRNG roll 0.0, should succeed
    expect(defender.hp).toBe(defender.maxHp - 0); // first tick dodged too
    const strike = result.events.find(e => e.type === 'strike');
    expect(strike!.dodged).toBe(true);
  });

  it('sequential ticks: dodge → strike → dodge tracks HP correctly', () => {
    // Roll 0.99 → never dodges (to verify HP tracking across mixed actions)
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Tick 1: p2 dodges (fails, takes 3)
    system.submitAction('p2', 'dodge');
    system.resolveTick();
    expect(defender.hp).toBe(97);

    // Tick 2: p2 strikes back (both take 8)
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();
    expect(defender.hp).toBe(89);
    expect(attacker.hp).toBe(92);

    // Tick 3: p2 dodges again (fails, takes 3)
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'dodge');
    system.resolveTick();
    expect(defender.hp).toBe(86);
  });
});
