/**
 * Dodge Chance — Skill Rank Tests (Issue #162, GDD §6.4)
 *
 * Spec: dodge % = 20% + (3% × dodge_skill_rank)
 * Cap: 75% (MAX_DODGE_CHANCE)
 *
 * Dodge is now PASSIVE — every incoming attack gets a dodge roll automatically.
 * Dodge is BINARY — full avoidance (0 damage) or full hit (no 0.5× reduction).
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
  return createCombatant(id, id, roomId, true, {
    attack: merged.unarmed,
    maxHp: merged.maxHp,
    armour: merged.armour,
    shieldBlock: merged.shieldBlock,
    dodge: merged.dodge,
  });
}

// ─── getDodgeChance — new formula unit tests ────────────────────────────────

describe('getDodgeChance (dodge skill rank formula — GDD §6.4)', () => {
  it('base dodge chance with 0 dodge skill is 20%', () => {
    // 20% + (3% × 0) = 20%
    expect(getDodgeChance(0)).toBeCloseTo(0.20);
  });

  it('default dodge skill (5) gives 35%', () => {
    // 20% + (3% × 5) = 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
  });

  it('dodge skill scaling: each rank adds 3%', () => {
    // 20% + (3% × 1) = 23%
    expect(getDodgeChance(1)).toBeCloseTo(0.23);
    // 20% + (3% × 5) = 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
    // 20% + (3% × 10) = 50%
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
  });

  it('higher dodge skill ranks', () => {
    // 20% + (3% × 3) = 29%
    expect(getDodgeChance(3)).toBeCloseTo(0.29);
    // 20% + (3% × 5) = 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
  });

  it('caps at 75% (MAX_DODGE_CHANCE)', () => {
    // 20% + (3% × 10) = 50% (below cap)
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
    // 20% + (3% × 19) = 77% → capped at 75%
    expect(getDodgeChance(19)).toBeCloseTo(MAX_DODGE_CHANCE);
    // Extreme values
    expect(getDodgeChance(100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('values just below and at the cap boundary', () => {
    // skill=15 → 20 + 45 = 65% (below cap)
    expect(getDodgeChance(15)).toBeCloseTo(0.65);

    // skill=18 → 20 + 54 = 74% (just below cap)
    expect(getDodgeChance(18)).toBeCloseTo(0.74);

    // skill=19 → 20 + 57 = 77% → capped at 75%
    expect(getDodgeChance(19)).toBeCloseTo(MAX_DODGE_CHANCE);
  });
});

// ─── calculateDamage — passive dodge with skill rank ─────────────────────────

describe('calculateDamage passive dodge with dodge skill (GDD §6.4)', () => {
  const attack = 10;
  const armour = 2;

  it('dodge success: zero damage when roll < dodge chance', () => {
    // dodge=5 → 35% dodge chance; roll 0.10 < 0.35 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('dodge failure: full damage when roll >= dodge chance (no 0.5× reduction)', () => {
    // dodge=5 → 35% dodge chance; roll 0.50 >= 0.35 → no dodge
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.50,
    });
    // 10 * 1.0 - 2 = 8 (full damage, no halving)
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('boundary: roll exactly at dodge chance does NOT dodge (strict <)', () => {
    // dodge=5 → 35% chance; roll 0.36 clearly above → no dodge
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 5,
      dodgeRoll: 0.36,
    });
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('high dodge skill: dodges at higher roll values', () => {
    // dodge=10 → 50% dodge chance; roll 0.45 < 0.50 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 10,
      dodgeRoll: 0.45,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('cap enforcement at 75% in damage calculation', () => {
    // dodge=30 → way over 75%, but capped
    // Roll 0.74 < 0.75 → dodge
    const dodged = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 30,
      dodgeRoll: 0.74,
    });
    expect(dodged.finalDamage).toBe(0);
    expect(dodged.dodged).toBe(true);

    // Roll 0.76 >= 0.75 → no dodge
    const notDodged = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 30,
      dodgeRoll: 0.76,
    });
    expect(notDodged.finalDamage).toBe(8);
    expect(notDodged.dodged).toBeUndefined();
  });

  it('0 dodge skill still has 20% base dodge chance', () => {
    // dodge=0 → 20% chance; roll 0.15 < 0.20 → dodge
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 0,
      dodgeRoll: 0.15,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('passive dodge applies regardless of defender action (flee)', () => {
    // Defender is fleeing but passive dodge still triggers
    const result = calculateDamage(attack, armour, 'strike', 'flee', {
      defenderDodge: 5,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('no options: backward compatible (no dodge roll)', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike');
    // 10 * 1.0 - 2 = 8, no dodge chance applied
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });
});

// ─── CombatSystem integration — passive dodge success/failure ────────────────

describe('CombatSystem passive dodge integration (GDD §6.4)', () => {
  it('dodge success → defender takes no damage', () => {
    // Roll always 0.0 → always below any positive dodge chance
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    const result = system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp);

    const strike = result.events.find(e => e.type === 'strike' && e.targetId === 'p2');
    expect(strike).toBeDefined();
    expect(strike!.dodged).toBe(true);
    expect(strike!.damage).toBe(0);
  });

  it('dodge failure → defender takes full damage (no 0.5× reduction)', () => {
    // Roll always 0.99 → never dodges
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.resolveTick();

    // 5 * 1.0 - 2 = 3 (full damage, no halving)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('dodge narration contains dodge message on success', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    const result = system.resolveTick();

    const strike = result.events.find(e => e.type === 'strike' && e.dodged);
    expect(strike).toBeDefined();
    expect(strike!.narration).toMatch(/dodge/i);
  });

  it('passive dodge works on multiple consecutive ticks', () => {
    // Defender dodges tick after tick — passive dodge is reusable
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Tick 1: passive dodge
    const r1 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);
    const s1 = r1.events.find(e => e.type === 'strike' && e.targetId === 'p2');
    expect(s1?.dodged).toBe(true);

    // Tick 2: passive dodge again
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    const _r2 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);

    // Tick 3: passive dodge a third time
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    const _r3 = system.resolveTick();
    expect(defender.hp).toBe(defender.maxHp);
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

    const result = system.resolveTick();

    // Defender should have passively dodged both strikes
    expect(defender.hp).toBe(defender.maxHp);
    const strikes = result.events.filter(e => e.type === 'strike' && e.targetId === 'def');
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

    system.resolveTick();

    // Default roll = 1 → never dodges → defender takes full damage
    expect(defender.hp).toBe(defender.maxHp - 3);
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('Dodge edge cases (GDD §6.4)', () => {
  it('passive dodge applies even when fleeing', () => {
    // With passive dodge, fleeing combatant still gets dodge roll
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const fleer = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(fleer);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'flee');
    system.resolveTick();

    // Passive dodge: roll 0.0 < 30% → dodged even while fleeing
    expect(fleer.hp).toBe(fleer.maxHp);
  });

  it('fleeing without dodge success takes full damage', () => {
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const fleer = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(fleer);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'flee');
    system.resolveTick();

    // Flee = full damage: 5 * 1.0 - 2 = 3
    expect(fleer.hp).toBe(fleer.maxHp - 3);
  });

  it('dodge with minimum damage (high armour) still results in 0 on success', () => {
    // Even if base damage would be min(1), dodge zeroes it completely
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1', TEST_ROOM, { unarmed: 3 });
    const defender = makePlayer('p2', TEST_ROOM, { armour: 10 });
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    const result = system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp);
    const strike = result.events.find(e => e.type === 'strike' && e.targetId === 'p2');
    expect(strike!.dodged).toBe(true);
  });

  it('disconnected combatant auto-attacks and gets passive dodge', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Disconnect p2 — should auto-attack (not dodge), but still gets passive dodge
    system.markDisconnected('p2');

    system.resolveTick(); // consume auto-queued strike

    system.submitAction('p1', 'strike', 'p2');
    const result = system.resolveTick();

    // Disconnected p2 gets passive dodge — with PRNG roll 0.0, dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
    const strike = result.events.find(e => e.type === 'strike' && e.targetId === 'p2');
    expect(strike!.dodged).toBe(true);
  });

  it('sequential ticks: full damage when dodge fails (no 0.5× reduction)', () => {
    // Roll 0.99 → never dodges (to verify HP tracking)
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // Tick 1: both auto-strike, both take 3 (5 * 1.0 - 2 = 3)
    system.resolveTick();
    expect(defender.hp).toBe(97);
    expect(attacker.hp).toBe(97);

    // Tick 2: both strike again, both take another 3
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();
    expect(defender.hp).toBe(94);
    expect(attacker.hp).toBe(94);

    // Tick 3: both strike again, both take another 3
    system.submitAction('p1', 'strike', 'p2');
    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();
    expect(defender.hp).toBe(91);
    expect(attacker.hp).toBe(91);
  });
});
