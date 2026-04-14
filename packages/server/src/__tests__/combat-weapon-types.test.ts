/**
 * Weapon Type Selection Tests — New Combat Stat System
 *
 * Spec: copilot-directive-2026-04-13T2140.md
 *
 * Key design decisions:
 * - Both players AND creatures use weapon-type skills (unarmed, oneHanded, twoHanded, ranged)
 * - Weapon type is determined by equipped weapon's weaponType field
 * - No weapon equipped → unarmed (pure skill, no weapon damage)
 * - The weaponSkill type maps to the corresponding stat name on the player
 */

import { describe, it, expect } from 'vitest';

import {
  calculateEquipmentBonuses,
  calculatePlayerEffectiveStats,
  calculateCreatureEffectiveStats,
} from '../combat/stats.js';

import type {
  CombatStats,
  EquipmentBonuses,
  WeaponType,
  ItemStats,
} from '../combat/CombatState.js';

// ─── Test Helpers ───────────────────────────────────────────────────────────

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

function slot(name: string, stats: ItemStats | null): { slot: string; stats: ItemStats | null } {
  return { slot: name, stats };
}

// ─── Weapon Type Selection ──────────────────────────────────────────────────

describe('Weapon type selection', () => {
  it('one_handed weapon → uses oneHanded skill', () => {
    const bonuses = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'one_handed', weaponDamage: 12 }),
    ]);
    expect(bonuses.weaponSkill).toBe('one_handed');

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    // attack = oneHanded (5) + weaponDamage (12) = 17
    expect(effective.attack).toBe(DEFAULT_BASE_STATS.oneHanded + 12);
  });

  it('two_handed weapon → uses twoHanded skill', () => {
    const bonuses = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'two_handed', weaponDamage: 20 }),
    ]);
    expect(bonuses.weaponSkill).toBe('two_handed');

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.attack).toBe(DEFAULT_BASE_STATS.twoHanded + 20);
  });

  it('ranged weapon → uses ranged skill', () => {
    const bonuses = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'ranged', weaponDamage: 15 }),
    ]);
    expect(bonuses.weaponSkill).toBe('ranged');

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.attack).toBe(DEFAULT_BASE_STATS.ranged + 15);
  });

  it('no weapon → uses unarmed skill (pure skill, no weapon damage)', () => {
    const bonuses = calculateEquipmentBonuses([]);
    expect(bonuses.weaponSkill).toBe('unarmed');
    expect(bonuses.weaponDamage).toBe(0);

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.attack).toBe(DEFAULT_BASE_STATS.unarmed);
  });

  it('weapon type correctly maps to corresponding skill stat name', () => {
    const weaponTypeToStat: Record<WeaponType, keyof CombatStats> = {
      unarmed: 'unarmed',
      one_handed: 'oneHanded',
      two_handed: 'twoHanded',
      ranged: 'ranged',
    };

    for (const [weaponType, statName] of Object.entries(weaponTypeToStat)) {
      const customStats: CombatStats = {
        ...DEFAULT_BASE_STATS,
        [statName]: 10,
      };
      const equipment: EquipmentBonuses = {
        weaponSkill: weaponType as WeaponType,
        weaponDamage: 5,
        armour: 0,
        shieldBlock: 0,
      };
      const effective = calculatePlayerEffectiveStats(customStats, equipment);
      // attack = boosted skill (10) + weaponDamage (5) = 15
      expect(effective.attack).toBe(15);
    }
  });
});

// ─── Weapon Type with Varied Skill Levels ───────────────────────────────────

describe('Weapon type with asymmetric skill levels', () => {
  it('high oneHanded, low twoHanded → 1H weapon is more effective', () => {
    const specializedStats: CombatStats = {
      ...DEFAULT_BASE_STATS,
      oneHanded: 12,
      twoHanded: 3,
    };

    const oneHand: EquipmentBonuses = {
      weaponSkill: 'one_handed',
      weaponDamage: 10,
      armour: 0,
      shieldBlock: 0,
    };
    const twoHand: EquipmentBonuses = {
      weaponSkill: 'two_handed',
      weaponDamage: 10,
      armour: 0,
      shieldBlock: 0,
    };

    const eff1H = calculatePlayerEffectiveStats(specializedStats, oneHand);
    const eff2H = calculatePlayerEffectiveStats(specializedStats, twoHand);

    expect(eff1H.attack).toBe(22); // 12 + 10
    expect(eff2H.attack).toBe(13); // 3 + 10
    expect(eff1H.attack).toBeGreaterThan(eff2H.attack);
  });

  it('unarmed specialist with no weapon outperforms low-skill + weak weapon', () => {
    const unarmedSpec: CombatStats = {
      ...DEFAULT_BASE_STATS,
      unarmed: 15,
      oneHanded: 2,
    };

    const bareHands: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 0,
      shieldBlock: 0,
    };
    const weakWeapon: EquipmentBonuses = {
      weaponSkill: 'one_handed',
      weaponDamage: 5,
      armour: 0,
      shieldBlock: 0,
    };

    const effUnarmed = calculatePlayerEffectiveStats(unarmedSpec, bareHands);
    const effWeapon = calculatePlayerEffectiveStats(unarmedSpec, weakWeapon);

    expect(effUnarmed.attack).toBe(15); // 15 + 0
    expect(effWeapon.attack).toBe(7);   // 2 + 5
    expect(effUnarmed.attack).toBeGreaterThan(effWeapon.attack);
  });
});

// ─── Unarmed Pure Skill ─────────────────────────────────────────────────────

describe('Unarmed = pure skill (no phantom weapon)', () => {
  it('unarmed attack equals exactly the unarmed stat value', () => {
    for (const unarmedValue of [1, 5, 10, 20]) {
      const stats: CombatStats = {
        ...DEFAULT_BASE_STATS,
        unarmed: unarmedValue,
      };
      const noWeapon: EquipmentBonuses = {
        weaponSkill: 'unarmed',
        weaponDamage: 0,
        armour: 0,
        shieldBlock: 0,
      };
      const effective = calculatePlayerEffectiveStats(stats, noWeapon);
      expect(effective.attack).toBe(unarmedValue);
    }
  });

  it('unarmed has no base weapon damage component', () => {
    const noWeapon = calculateEquipmentBonuses([]);
    expect(noWeapon.weaponDamage).toBe(0);
  });

  it('shield without weapon → unarmed + shieldBlock but no weapon damage', () => {
    const bonuses = calculateEquipmentBonuses([
      slot('off_hand', { shieldBlock: 10 }),
    ]);
    expect(bonuses.weaponSkill).toBe('unarmed');
    expect(bonuses.weaponDamage).toBe(0);
    expect(bonuses.shieldBlock).toBe(10);

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.attack).toBe(5);       // unarmed only
    expect(effective.shieldBlock).toBe(15); // 5 base + 10 equipment
  });
});

// ─── Creature Effective Stats ───────────────────────────────────────────────

describe('Creature effective stats (weapon-type skills)', () => {
  it('creature uses highest weapon skill as attack', () => {
    const creatureStats: CombatStats = {
      maxHp: 80,
      unarmed: 8,
      oneHanded: 12,
      twoHanded: 5,
      ranged: 3,
      shieldBlock: 0,
      dodge: 3,
      armour: 4,
    };
    const effective = calculateCreatureEffectiveStats(creatureStats);
    // Highest skill: oneHanded (12)
    expect(effective.attack).toBe(12);
    expect(effective.armour).toBe(4);
    expect(effective.dodge).toBe(3);
    expect(effective.shieldBlock).toBe(0);
    expect(effective.maxHp).toBe(80);
  });

  it('creature with only unarmed skill', () => {
    const beastStats: CombatStats = {
      maxHp: 50,
      unarmed: 10,
      oneHanded: 0,
      twoHanded: 0,
      ranged: 0,
      shieldBlock: 0,
      dodge: 5,
      armour: 1,
    };
    const effective = calculateCreatureEffectiveStats(beastStats);
    expect(effective.attack).toBe(10);
  });
});
