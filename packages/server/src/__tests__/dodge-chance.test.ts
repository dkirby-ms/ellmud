/**
 * Dodge Chance Tests — Bug Fix #2 (GDD §6.4)
 *
 * Verifies that dodging grants a % chance to fully avoid an attack,
 * based on the defender's defence stat, with proper PRNG integration.
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

// ─── getDodgeChance unit tests ──────────────────────────────────────────────

describe('getDodgeChance', () => {
  it('should return 5% per point of defence', () => {
    expect(getDodgeChance(1)).toBeCloseTo(0.05);
    expect(getDodgeChance(5)).toBeCloseTo(0.25);
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
  });

  it('should cap at MAX_DODGE_CHANCE (75%)', () => {
    expect(getDodgeChance(15)).toBeCloseTo(MAX_DODGE_CHANCE);
    expect(getDodgeChance(20)).toBeCloseTo(MAX_DODGE_CHANCE);
    expect(getDodgeChance(100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('should return 0 for 0 defence', () => {
    expect(getDodgeChance(0)).toBe(0);
  });
});

// ─── calculateDamage dodge integration ──────────────────────────────────────

describe('Dodge Damage Reduction (calculateDamage)', () => {
  const attack = 10;
  const armour = 2;
  const defence = 5; // 25% dodge chance

  it('should fully avoid damage when dodge roll succeeds', () => {
    // Roll 0.10 < 0.25 dodge chance → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: defence,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('should apply normal halved damage when dodge roll fails', () => {
    // Roll 0.50 >= 0.25 dodge chance → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: defence,
      dodgeRoll: 0.50,
    });
    // 10 * 0.5 - 2 = 3
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('should dodge at the boundary (roll exactly at chance threshold)', () => {
    // Roll 0.25 >= 0.25 → not dodged (strict less-than comparison)
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: defence,
      dodgeRoll: 0.25,
    });
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('should respect MAX_DODGE_CHANCE cap', () => {
    // defence 20 → capped at 75%
    // Roll 0.74 < 0.75 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: 20,
      dodgeRoll: 0.74,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);

    // Roll 0.76 >= 0.75 → not dodged
    const result2 = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: 20,
      dodgeRoll: 0.76,
    });
    expect(result2.finalDamage).toBe(3);
    expect(result2.dodged).toBeUndefined();
  });

  it('should not apply dodge chance when defender is not dodging', () => {
    // Defender is striking, not dodging — roll should be ignored
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDefence: defence,
      dodgeRoll: 0.01,
    });
    // 10 * 1.0 - 2 = 8 (full damage, no dodge even with low roll)
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('should not dodge when no options are provided (backward compat)', () => {
    const result = calculateDamage(attack, armour, 'strike', 'dodge');
    // 10 * 0.5 - 2 = 3 (halved damage, no full dodge)
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('should not dodge when defence is 0', () => {
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderDefence: 0,
      dodgeRoll: 0.0,
    });
    // 0% dodge chance, even with roll 0 → not dodged
    // But wait: 0 * 0.05 = 0, and 0 < 0 is false → not dodged
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });
});

// ─── CombatSystem dodge integration ─────────────────────────────────────────

describe('CombatSystem Dodge Integration', () => {
  const TEST_ROOM = 'room-1';
  const ADJACENT_ROOM = 'room-2';

  function testExitResolver(roomId: string): string[] {
    if (roomId === TEST_ROOM) return [ADJACENT_ROOM];
    if (roomId === ADJACENT_ROOM) return [TEST_ROOM];
    return [];
  }

  function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>): ReturnType<typeof createCombatant> {
    const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
    return createCombatant(id, id, roomId, true, merged);
  }

  it('should fully dodge when PRNG roll is below dodge chance', () => {
    // Roll always returns 0.0 → always dodge (defence 5 = 25% chance)
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    // p1 auto-strikes. p2 dodges.
    system.submitAction('p2', 'dodge');

    const result = system.resolveTick();

    // Defender should take no damage (dodge succeeded)
    expect(defender.hp).toBe(defender.maxHp);

    // Should have a strike event with dodged=true
    const strikeEvent = result.events.find(e => e.type === 'strike');
    expect(strikeEvent).toBeDefined();
    expect(strikeEvent!.dodged).toBe(true);
    expect(strikeEvent!.damage).toBe(0);
    expect(strikeEvent!.narration).toContain('dodges the blow');
  });

  it('should not dodge when PRNG roll is above dodge chance', () => {
    // Roll always returns 0.99 → never dodge
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');

    system.resolveTick();

    // Defender should take halved damage (10 * 0.5 - 2 = 3)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('should not apply dodge roll when both combatants strike', () => {
    // Roll always returns 0.0 — but both strike, so no dodge check
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike', 'p1');

    system.resolveTick();

    // Both should take full damage (10 * 1.0 - 2 = 8)
    expect(p1.hp).toBe(p1.maxHp - 8);
    expect(p2.hp).toBe(p2.maxHp - 8);
  });

  it('backward compat: default CombatSystem (no PRNG) never dodges', () => {
    // No PRNG passed → default roll always returns 1 → never dodges
    const system = new CombatSystem(testExitResolver);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');

    system.resolveTick();

    // Defender takes halved damage (backward compatible behavior)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('high-defence combatant dodges more reliably', () => {
    // Defence 14 = 70% dodge chance. Roll at 0.5 → dodge succeeds.
    const system = new CombatSystem(testExitResolver, () => 0.5);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', TEST_ROOM, { defence: 14 });
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');

    system.resolveTick();

    // 70% chance, roll 0.5 < 0.7 → dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
  });
});
