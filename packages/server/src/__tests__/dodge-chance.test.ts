/**
 * Dodge Chance Tests — GDD §6.4
 *
 * Verifies that dodging grants a % chance to fully avoid an attack,
 * based on AGI stat + dodge skill rank, with proper PRNG integration.
 *
 * Formula: min(75%, 20% + 2% × AGI + 3% × dodgeSkillRank)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  getDodgeChance,
  DODGE_BASE_CHANCE,
  DODGE_CHANCE_PER_AGI,
  DODGE_CHANCE_PER_SKILL_RANK,
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
  it('should return base 20% + 2% per AGI with no skill', () => {
    // AGI 0, skill 0 → 20%
    expect(getDodgeChance(0, 0)).toBeCloseTo(0.20);
    // AGI 5, skill 0 → 20% + 10% = 30%
    expect(getDodgeChance(5, 0)).toBeCloseTo(0.30);
    // AGI 10, skill 0 → 20% + 20% = 40%
    expect(getDodgeChance(10, 0)).toBeCloseTo(0.40);
  });

  it('should add 3% per dodge skill rank', () => {
    // AGI 0, skill 5 → 20% + 15% = 35%
    expect(getDodgeChance(0, 5)).toBeCloseTo(0.35);
    // AGI 5, skill 5 → 20% + 10% + 15% = 45%
    expect(getDodgeChance(5, 5)).toBeCloseTo(0.45);
  });

  it('should cap at MAX_DODGE_CHANCE (75%)', () => {
    // AGI 20, skill 10 → 20% + 40% + 30% = 90% → capped at 75%
    expect(getDodgeChance(20, 10)).toBeCloseTo(MAX_DODGE_CHANCE);
    // AGI 100, skill 100 → way over cap
    expect(getDodgeChance(100, 100)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('should return base chance (20%) for AGI 0 and skill 0', () => {
    expect(getDodgeChance(0, 0)).toBeCloseTo(DODGE_BASE_CHANCE);
  });

  it('should default dodgeSkillRank to 0 when omitted', () => {
    expect(getDodgeChance(5)).toBeCloseTo(0.30);
  });

  it('should produce correct values for typical player builds', () => {
    // Default player: AGI 5, no dodge skill → 30%
    expect(getDodgeChance(5, 0)).toBeCloseTo(0.30);
    // Agile rogue: AGI 10, dodge skill 5 → 20% + 20% + 15% = 55%
    expect(getDodgeChance(10, 5)).toBeCloseTo(0.55);
    // Max dodge build: AGI 15, dodge skill 8 → 20% + 30% + 24% = 74%
    expect(getDodgeChance(15, 8)).toBeCloseTo(0.74);
    // Just over cap: AGI 15, dodge skill 9 → 20% + 30% + 27% = 77% → 75%
    expect(getDodgeChance(15, 9)).toBeCloseTo(MAX_DODGE_CHANCE);
  });

  it('should export correct constants', () => {
    expect(DODGE_BASE_CHANCE).toBe(0.20);
    expect(DODGE_CHANCE_PER_AGI).toBe(0.02);
    expect(DODGE_CHANCE_PER_SKILL_RANK).toBe(0.03);
    expect(MAX_DODGE_CHANCE).toBe(0.75);
  });
});

// ─── calculateDamage dodge integration ──────────────────────────────────────

describe('Dodge Damage Reduction (calculateDamage)', () => {
  const attack = 10;
  const armour = 2;
  const agi = 5;         // 30% dodge chance with no skill
  const skillRank = 0;

  it('should fully avoid damage when dodge roll succeeds', () => {
    // Roll 0.10 < 0.30 dodge chance → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: agi,
      defenderDodgeSkillRank: skillRank,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('should apply normal halved damage when dodge roll fails', () => {
    // Roll 0.50 >= 0.30 dodge chance → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: agi,
      defenderDodgeSkillRank: skillRank,
      dodgeRoll: 0.50,
    });
    // 10 * 0.5 - 2 = 3
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('should not dodge at the boundary (roll exactly at chance threshold)', () => {
    // AGI 5, skill 0 → ~30% chance; roll 0.31 > 0.30 → not dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: agi,
      defenderDodgeSkillRank: skillRank,
      dodgeRoll: 0.31,
    });
    expect(result.finalDamage).toBe(3);
    expect(result.dodged).toBeUndefined();
  });

  it('should respect MAX_DODGE_CHANCE cap', () => {
    // AGI 20, skill 10 → capped at 75%
    // Roll 0.74 < 0.75 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 20,
      defenderDodgeSkillRank: 10,
      dodgeRoll: 0.74,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);

    // Roll 0.76 >= 0.75 → not dodged
    const result2 = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 20,
      defenderDodgeSkillRank: 10,
      dodgeRoll: 0.76,
    });
    expect(result2.finalDamage).toBe(3);
    expect(result2.dodged).toBeUndefined();
  });

  it('should scale with dodge skill rank', () => {
    // AGI 5, skill 5 → 20% + 10% + 15% = 45%
    // Roll 0.40 < 0.45 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 5,
      defenderDodgeSkillRank: 5,
      dodgeRoll: 0.40,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);
  });

  it('should not apply dodge chance when defender is not dodging', () => {
    const result = calculateDamage(attack, armour, 'strike', 'strike', {
      defenderAgility: agi,
      defenderDodgeSkillRank: skillRank,
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

  it('should still have base 20% dodge chance with AGI 0 and skill 0', () => {
    // AGI 0, skill 0 → 20% base chance
    // Roll 0.10 < 0.20 → dodged
    const result = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 0,
      defenderDodgeSkillRank: 0,
      dodgeRoll: 0.10,
    });
    expect(result.finalDamage).toBe(0);
    expect(result.dodged).toBe(true);

    // Roll 0.25 >= 0.20 → not dodged
    const result2 = calculateDamage(attack, armour, 'strike', 'dodge', {
      defenderAgility: 0,
      defenderDodgeSkillRank: 0,
      dodgeRoll: 0.25,
    });
    expect(result2.finalDamage).toBe(3);
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
    return createCombatant(id, id, roomId, true, merged, dodgeSkillRank);
  }

  it('should fully dodge when PRNG roll is below dodge chance', () => {
    // Roll always 0.0 → always dodge (AGI 5, skill 0 = 30%)
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');

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

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    // Defender takes halved damage (10 * 0.5 - 2 = 3)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('should not apply dodge roll when both combatants strike', () => {
    const system = new CombatSystem(testExitResolver, () => 0.0);

    const p1 = makePlayer('p1');
    const p2 = makePlayer('p2');
    system.registerCombatant(p1);
    system.registerCombatant(p2);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'strike', 'p1');
    system.resolveTick();

    // Both take full damage (10 * 1.0 - 2 = 8)
    expect(p1.hp).toBe(p1.maxHp - 8);
    expect(p2.hp).toBe(p2.maxHp - 8);
  });

  it('backward compat: default CombatSystem (no PRNG) never dodges', () => {
    const system = new CombatSystem(testExitResolver);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2');
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    expect(defender.hp).toBe(defender.maxHp - 3);
  });

  it('high-AGI combatant dodges more reliably', () => {
    // AGI 10, skill 0 → 20% + 20% = 40%. Roll at 0.35 → dodge succeeds.
    const system = new CombatSystem(testExitResolver, () => 0.35);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', TEST_ROOM, { agility: 10 });
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    // 40% chance, roll 0.35 < 0.40 → dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
  });

  it('dodge skill rank increases dodge chance', () => {
    // AGI 5, skill 5 → 20% + 10% + 15% = 45%. Roll at 0.40 → dodge succeeds.
    const system = new CombatSystem(testExitResolver, () => 0.40);

    const attacker = makePlayer('p1');
    const defender = makePlayer('p2', TEST_ROOM, undefined, 5);
    system.registerCombatant(attacker);
    system.registerCombatant(defender);
    system.initiateCombat('p1', 'p2');

    system.submitAction('p2', 'dodge');
    system.resolveTick();

    // 45% chance, roll 0.40 < 0.45 → dodge succeeds
    expect(defender.hp).toBe(defender.maxHp);
  });

  it('dodge can succeed on multiple attacks in the same tick', () => {
    // Three attackers strike the same dodging defender. Each gets independent roll.
    let rollCount = 0;
    const rolls = [0.10, 0.10, 0.10]; // all below 30% → all dodged
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
    system.submitAction('defender', 'dodge');

    system.resolveTick();

    // All attacks dodged — defender takes no damage
    expect(defender.hp).toBe(defender.maxHp);
    expect(rollCount).toBe(3);
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
    system.submitAction('defender', 'dodge');

    system.resolveTick();

    // One attack dodged (0 damage), one hit (10 * 0.5 - 2 = 3)
    expect(defender.hp).toBe(defender.maxHp - 3);
  });
});
