/**
 * Dodge Chance Tests — GDD §6.4
 *
 * Verifies that dodge grants a passive % chance to fully avoid any attack,
 * based on dodge skill rank, with proper PRNG integration.
 * Dodge is now PASSIVE — every incoming attack gets a dodge roll automatically.
 * Dodge is BINARY — full avoidance (0 damage) or full hit (no 0.5× reduction).
 *
 * Formula: min(75%, 20% + 3% × dodgeSkillRank)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  getDodgeChance,
  DODGE_BASE_CHANCE,
  DODGE_CHANCE_PER_RANK,
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
  it('should return base 20% + 3% per dodge skill rank', () => {
    // skill 0 → 20%
    expect(getDodgeChance(0)).toBeCloseTo(0.20);
    // skill 5 → 20% + 15% = 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
    // skill 10 → 20% + 30% = 50%
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
  });

  it('should add 3% per dodge skill rank', () => {
    // skill 5 → 20% + 15% = 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
    // skill 10 → 20% + 30% = 50%
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
  });

  it('should cap at MAX_DODGE_CHANCE (75%)', () => {
    // skill 19 → 20% + 57% = 77% → capped at 75%
    expect(getDodgeChance(19)).toBeCloseTo(MAX_DODGE_CHANCE);
    // skill 100 → way over cap
    expect(getDodgeChance(100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('should return base chance (20%) for dodge skill 0', () => {
    expect(getDodgeChance(0)).toBeCloseTo(DODGE_BASE_CHANCE);
  });

  it('should produce correct values for typical player builds', () => {
    // Default player: dodge skill 5 → 35%
    expect(getDodgeChance(5)).toBeCloseTo(0.35);
    // Agile rogue: dodge skill 10 → 50%
    expect(getDodgeChance(10)).toBeCloseTo(0.50);
    // High dodge build: dodge skill 15 → 20% + 45% = 65%
    expect(getDodgeChance(15)).toBeCloseTo(0.65);
    // Just over cap: dodge skill 19 → 20% + 57% = 77% → 75%
    expect(getDodgeChance(19)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('should export correct constants', () => {
    expect(DODGE_BASE_CHANCE).toBe(0.20);
    expect(DODGE_CHANCE_PER_RANK).toBe(0.03);
    expect(MAX_DODGE_CHANCE).toBe(0.75);
  });
});

// ─── calculateDamage dodge integration ──────────────────────────────────────

describe('Dodge Damage Reduction (calculateDamage)', () => {
  const attack = 10;
  const armour = 2;
  const dodgeSkill = 5;  // 35% dodge chance

  it('should fully avoid damage when dodge roll succeeds', () => {
    // Roll 0.10 < 0.35 dodge chance → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: dodgeSkill,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('should deal full damage when dodge roll fails', () => {
    // Roll 0.50 >= 0.35 dodge chance → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: dodgeSkill,
      dodgeRoll: 0.50,
    });
    // 10 * 1.0 - 2 = 8 (full damage, no 0.5× reduction)
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('should not dodge at the boundary (roll exactly at chance threshold)', () => {
    // dodge skill 5 → ~35% chance; roll 0.36 > 0.35 → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: dodgeSkill,
      dodgeRoll: 0.36,
    });
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('should respect MAX_DODGE_CHANCE cap', () => {
    // dodge 19 → capped at 75%
    // Roll 0.74 < 0.75 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 19,
      dodgeRoll: 0.74,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);

    // Roll 0.76 >= 0.75 → not dodged
    const result2 = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 19,
      dodgeRoll: 0.76,
    });
    expect(result2.finalDamage).toBe(8);
    expect(result2.dodged).toBeUndefined();
  });

  it('should scale with dodge skill rank', () => {
    // dodge skill 10 → 20% + 30% = 50%
    // Roll 0.40 < 0.50 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 10,
      dodgeRoll: 0.40,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('passive dodge applies even when defender is striking', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: dodgeSkill,
      dodgeRoll: 0.01,
    });
    // Passive dodge: roll 0.01 < 0.35 → dodged regardless of defender action
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('should not dodge when no options are provided (backward compat)', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike');
    // 10 * 1.0 - 2 = 8 (full damage, no dodge roll)
    expect(result.finalDamage).toBe(8);
    expect(result.dodged).toBeUndefined();
  });

  it('should still have base 20% dodge chance with dodge skill 0', () => {
    // dodge skill 0 → 20% base chance
    // Roll 0.10 < 0.20 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 0,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);

    // Roll 0.25 >= 0.20 → not dodged
    const result2 = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderDodge: 0,
      dodgeRoll: 0.25,
    });
    expect(result2.finalDamage).toBe(8);
    expect(result2.dodged).toBeUndefined();
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

  function makePlayer(id: string, roomId = TEST_ROOM, stats?: Partial<CombatStats>, dodgeSkillRank = 0): ReturnType<typeof createCombatant> {
    const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
    return createCombatant(id, id, roomId, true, {
      attack: merged.unarmed,
      maxHp: merged.maxHp,
      armour: merged.armour,
      shieldBlock: merged.shieldBlock,
      dodge: dodgeSkillRank > 0 ? dodgeSkillRank : merged.dodge,
    });
  }

  it('should fully dodge when PRNG roll is below dodge chance', () => {
    // Roll always 0.0 → always dodge (dodge skill 5 = 35%)
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike');

    const result = system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp);

    const strikeEvent = result.events.find(e => e.type === 'strike');
    expect(strikeEvent).toBeDefined();
    expect(strikeEvent!.dodged).toBe(true);
    expect(strikeEvent!.damage).toBe(0);
    expect(strikeEvent!.narration).toContain('dodges!');
  });

  it('should not dodge when PRNG roll is above dodge chance', () => {
    // Roll always 0.99 → never dodge
    const system = new CombatSystem(testExitResolver, () => 0.99);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike');
    system.resolveTick();

    // Defender takes full damage (5 * 1.0 - 2 = 3)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('passive dodge triggers even when both combatants strike', () => {
    // Roll always 0.0 → always dodge (passive). Both strikers dodge each other.
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();

    // Both passively dodge — roll 0.0 < 35% dodge chance
    expect(p1.hp).toBe(p1.maxHp);
    expect(p2.hp).toBe(p2.maxHp);
  });

  it('backward compat: default CombatSystem (no PRNG) never dodges', () => {
    const system = new CombatSystem(testExitResolver);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike');
    system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('high-dodge-skill combatant dodges more reliably', () => {
    // dodge 10 → 20% + 30% = 50%. Roll at 0.45 → dodge succeeds.
    const system = new CombatSystem(testExitResolver, () => 0.45);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', TEST_ROOM, { dodge: 10 });
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike');
    system.resolveTick();

    // 50% chance, roll 0.45 < 0.50 → dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
  });

  it('dodge skill rank increases dodge chance', () => {
    // dodge skill 10 → 20% + 30% = 50%. Roll at 0.45 → dodge succeeds.
    const system = new CombatSystem(testExitResolver, () => 0.45);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', TEST_ROOM, undefined, 10);
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike');
    system.resolveTick();

    // 50% chance, roll 0.45 < 0.50 → dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
  });

  it('dodge can succeed on multiple attacks in the same tick', () => {
    // Three attackers strike the same defender. Each attack gets an independent dodge roll
    // plus a block roll (shield block). Defender also strikes a1 (auto-attack).
    let rollCount = 0;
    // Each attack needs 2 rolls: dodge + block. 4 attacks = 8 rolls.
    const rolls = [0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10]; // all below 35% → all dodged
    const system = new CombatSystem(testExitResolver, () => rolls[rollCount++]);

    const a1 = makePlayer('a1');
    const a2 = makePlayer('a2');
    const a3 = makePlayer('a3');
    const defender = makePlayer('defender');
    system.registerCombatant(a1);
    system.registerCombatant(a2);
    system.registerCombatant(a3);
    system.registerCombatant(defender);
    system.initiateCombat('a1', 'defender');
    system.initiateCombat('a2', 'defender');
    system.initiateCombat('a3', 'defender');
    system.submitAction('defender', 'strike');

    system.resolveTick();

    // All attacks dodged — defender takes no damage
    expect(defender.hp).toBe(defender.maxHp);
    // 4 attacks × 2 rolls each (dodge + block) = 8 rolls
    expect(rollCount).toBe(8);
  });

  it('dodge can partially succeed against multiple attackers', () => {
    // Two attackers: first roll dodged, second roll not
    let rollCount = 0;
    const rolls = [0.10, 0.99]; // first dodged, second not
    const system = new CombatSystem(testExitResolver, () => rolls[rollCount++]);

    const a1 = makePlayer('a1');
    const a2 = makePlayer('a2');
    const defender = makePlayer('defender');
    system.registerCombatant(a1);
    system.registerCombatant(a2);
    system.registerCombatant(defender);
    system.initiateCombat('a1', 'defender');
    system.initiateCombat('a2', 'defender');
    system.submitAction('defender', 'strike');

    system.resolveTick();

    // One attack dodged (0 damage), one hit (5 * 1.0 - 2 = 3)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });
});
