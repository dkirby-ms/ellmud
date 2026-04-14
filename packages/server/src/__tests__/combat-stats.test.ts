/**
 * Combat Stats Tests — Equipment Bonuses & Effective Stats
 *
 * Tests for the new weapon-type skill system (Phase 1).
 * Spec: elminster-combat-stat-architecture-v2.md + copilot-directive-2026-04-13T2140.md
 *
 * Key design decisions:
 * - Agility is REMOVED — not part of stats
 * - 8 stats: maxHp, unarmed, oneHanded, twoHanded, ranged, shieldBlock, dodge, armour
 * - Unarmed = pure skill (no phantom weapon damage)
 * - Shield block = binary chance (stat determines block probability)
 * - Both players AND creatures use weapon-type skills
 */

import { describe, it, expect } from 'vitest';

import {
  calculateEquipmentBonuses,
  calculatePlayerEffectiveStats,
} from '../combat/stats.js';

import type {
  CombatStats,
  EquipmentBonuses,
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

/** Creates a slot entry for calculateEquipmentBonuses. */
function slot(name: string, stats: ItemStats | null): { slot: string; stats: ItemStats | null } {
  return { slot: name, stats };
}

// ─── calculateEquipmentBonuses ──────────────────────────────────────────────

describe('calculateEquipmentBonuses', () => {
  it('no equipment → unarmed weapon type, 0 damage, 0 armour, 0 shieldBlock', () => {
    const result = calculateEquipmentBonuses([]);
    expect(result.weaponSkill).toBe('unarmed');
    expect(result.weaponDamage).toBe(0);
    expect(result.armour).toBe(0);
    expect(result.shieldBlock).toBe(0);
  });

  it('one-handed weapon → weaponSkill=one_handed, correct damage', () => {
    const result = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'one_handed', weaponDamage: 12 }),
    ]);
    expect(result.weaponSkill).toBe('one_handed');
    expect(result.weaponDamage).toBe(12);
  });

  it('two-handed weapon → weaponSkill=two_handed', () => {
    const result = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'two_handed', weaponDamage: 20 }),
    ]);
    expect(result.weaponSkill).toBe('two_handed');
    expect(result.weaponDamage).toBe(20);
  });

  it('ranged weapon → weaponSkill=ranged', () => {
    const result = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'ranged', weaponDamage: 15 }),
    ]);
    expect(result.weaponSkill).toBe('ranged');
    expect(result.weaponDamage).toBe(15);
  });

  it('shield in off_hand → returns shieldBlock value from shield item', () => {
    const result = calculateEquipmentBonuses([
      slot('off_hand', { shieldBlock: 10 }),
    ]);
    expect(result.shieldBlock).toBe(10);
  });

  it('full loadout (weapon + shield + armour pieces) → sums correctly', () => {
    const result = calculateEquipmentBonuses([
      slot('main_hand', { weaponType: 'one_handed', weaponDamage: 12 }),
      slot('off_hand', { shieldBlock: 10, armour: 2 }),
      slot('head', { armour: 3 }),
      slot('chest', { armour: 8 }),
      slot('legs', { armour: 4 }),
      slot('feet', { armour: 2 }),
      slot('hands', { armour: 1 }),
    ]);
    expect(result.weaponSkill).toBe('one_handed');
    expect(result.weaponDamage).toBe(12);
    expect(result.shieldBlock).toBe(10);
    // armour: 2 (shield) + 3 + 8 + 4 + 2 + 1 = 20
    expect(result.armour).toBe(20);
  });

  it('no weapon but shield equipped → still unarmed, but has shieldBlock', () => {
    const result = calculateEquipmentBonuses([
      slot('off_hand', { shieldBlock: 8 }),
    ]);
    expect(result.weaponSkill).toBe('unarmed');
    expect(result.weaponDamage).toBe(0);
    expect(result.shieldBlock).toBe(8);
  });

  it('item with no base_stats (null) → treated as 0 for all fields', () => {
    const result = calculateEquipmentBonuses([
      slot('head', null),
      slot('chest', null),
      slot('main_hand', null),
    ]);
    expect(result.weaponSkill).toBe('unarmed');
    expect(result.weaponDamage).toBe(0);
    expect(result.armour).toBe(0);
    expect(result.shieldBlock).toBe(0);
  });

  it('item with empty stats object → treated as 0 for all fields', () => {
    const result = calculateEquipmentBonuses([
      slot('head', {}),
      slot('chest', {}),
      slot('main_hand', {}),
    ]);
    expect(result.weaponSkill).toBe('unarmed');
    expect(result.weaponDamage).toBe(0);
    expect(result.armour).toBe(0);
    expect(result.shieldBlock).toBe(0);
  });

  it('armour items with mixed stats → sums armour from all slots', () => {
    const result = calculateEquipmentBonuses([
      slot('head', { armour: 3 }),
      slot('chest', { armour: 8 }),
    ]);
    expect(result.armour).toBe(11);
  });

  it('weapon with no weaponType → defaults to unarmed', () => {
    const result = calculateEquipmentBonuses([
      slot('main_hand', { weaponDamage: 5 }),
    ]);
    expect(result.weaponSkill).toBe('unarmed');
  });
});

// ─── calculatePlayerEffectiveStats ──────────────────────────────────────────

describe('calculatePlayerEffectiveStats', () => {
  it('base stats only (no equipment) → effective = base stats, attack = unarmed skill', () => {
    const noEquipment: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, noEquipment);
    expect(result.attack).toBe(5); // unarmed skill only
    expect(result.armour).toBe(2);
    expect(result.dodge).toBe(5);
    expect(result.shieldBlock).toBe(0); // No shield equipped → no block chance
    expect(result.maxHp).toBe(100);
  });

  it('with one-handed weapon → attack = oneHanded skill + weapon damage', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'one_handed',
      weaponDamage: 12,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.attack).toBe(17); // 5 + 12
  });

  it('with two-handed weapon → attack = twoHanded skill + weapon damage', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'two_handed',
      weaponDamage: 20,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.attack).toBe(25); // 5 + 20
  });

  it('with ranged weapon → attack = ranged skill + weapon damage', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'ranged',
      weaponDamage: 15,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.attack).toBe(20); // 5 + 15
  });

  it('with shield → shieldBlock = base + equipment', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 0,
      shieldBlock: 10,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.shieldBlock).toBe(15); // 5 + 10
  });

  it('armour stacks from multiple equipment items', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 18,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.armour).toBe(20); // 2 + 18
  });

  it('unarmed with no weapon → attack = unarmed skill value only (no weapon damage)', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.attack).toBe(DEFAULT_BASE_STATS.unarmed);
  });

  it('higher weapon skill → higher effective attack', () => {
    const highSkillStats: CombatStats = {
      ...DEFAULT_BASE_STATS,
      oneHanded: 12,
    };
    const equipment: EquipmentBonuses = {
      weaponSkill: 'one_handed',
      weaponDamage: 12,
      armour: 0,
      shieldBlock: 0,
    };
    const result = calculatePlayerEffectiveStats(highSkillStats, equipment);
    expect(result.attack).toBe(24); // 12 + 12
  });

  it('full loadout → all stats combined correctly', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'one_handed',
      weaponDamage: 12,
      armour: 18,
      shieldBlock: 10,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.attack).toBe(17);      // 5 + 12
    expect(result.armour).toBe(20);      // 2 + 18
    expect(result.shieldBlock).toBe(15); // 5 + 10
    expect(result.dodge).toBe(5);        // base only
    expect(result.maxHp).toBe(100);
  });

  it('dodge is base only — no equipment modifier in Phase 1', () => {
    const equipment: EquipmentBonuses = {
      weaponSkill: 'unarmed',
      weaponDamage: 0,
      armour: 50,
      shieldBlock: 50,
    };
    const result = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, equipment);
    expect(result.dodge).toBe(DEFAULT_BASE_STATS.dodge);
  });
});

// ─── extractCombatItemStats (#453) ──────────────────────────────────────────

import { extractCombatItemStats } from '../combat/stats.js';

describe('extractCombatItemStats', () => {
  it('weapon with canonical format → extracts weaponType and weaponDamage', () => {
    const stats = extractCombatItemStats('weapon', { weaponType: 'two_handed', weaponDamage: 20 });
    expect(stats.weaponType).toBe('two_handed');
    expect(stats.weaponDamage).toBe(20);
  });

  it('weapon with legacy format (damage field) → maps damage to weaponDamage', () => {
    const stats = extractCombatItemStats('weapon', { damage: 8, speed: 1 });
    expect(stats.weaponType).toBe('one_handed');
    expect(stats.weaponDamage).toBe(8);
  });

  it('armour item → extracts armour value', () => {
    const stats = extractCombatItemStats('armour', { armour: 3, weight: 8 });
    expect(stats.armour).toBe(3);
    expect(stats.weaponType).toBeUndefined();
    expect(stats.weaponDamage).toBeUndefined();
  });

  it('armour with shieldBlock → extracts both', () => {
    const stats = extractCombatItemStats('armour', { armour: 2, shieldBlock: 5 });
    expect(stats.armour).toBe(2);
    expect(stats.shieldBlock).toBe(5);
  });

  it('consumable → returns empty stats', () => {
    const stats = extractCombatItemStats('consumable', { heal: 20 });
    expect(stats.weaponType).toBeUndefined();
    expect(stats.weaponDamage).toBeUndefined();
    expect(stats.armour).toBeUndefined();
    expect(stats.shieldBlock).toBeUndefined();
  });

  it('empty base_stats → defaults for weapon', () => {
    const stats = extractCombatItemStats('weapon', {});
    expect(stats.weaponType).toBe('one_handed');
    expect(stats.weaponDamage).toBe(0);
  });
});

// ─── Item → Equipment Pipeline (#453) ──────────────────────────────────────

describe('Item with stats → calculateEquipmentBonuses pipeline', () => {
  it('Item with weapon stats feeds correctly through equipment bonuses', () => {
    const itemStats: ItemStats = { weaponType: 'one_handed', weaponDamage: 12 };
    const bonuses = calculateEquipmentBonuses([
      slot('main_hand', itemStats),
    ]);
    expect(bonuses.weaponSkill).toBe('one_handed');
    expect(bonuses.weaponDamage).toBe(12);
  });

  it('Item with armour stats feeds correctly through equipment bonuses', () => {
    const itemStats: ItemStats = { armour: 5 };
    const bonuses = calculateEquipmentBonuses([
      slot('chest', itemStats),
    ]);
    expect(bonuses.armour).toBe(5);
  });

  it('full pipeline: extractCombatItemStats → calculateEquipmentBonuses → effective stats', () => {
    const weaponStats = extractCombatItemStats('weapon', { damage: 10, speed: 1 });
    const armourStats = extractCombatItemStats('armour', { armour: 4, weight: 6 });

    const bonuses = calculateEquipmentBonuses([
      slot('main_hand', weaponStats),
      slot('chest', armourStats),
    ]);

    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.attack).toBe(15); // oneHanded(5) + weaponDamage(10)
    expect(effective.armour).toBe(6);  // base(2) + gear(4)
  });

  it('equipment bonuses include shield stats when item has shieldBlock', () => {
    const shieldStats = extractCombatItemStats('armour', { armour: 2, shieldBlock: 8 });
    const bonuses = calculateEquipmentBonuses([
      slot('off_hand', shieldStats),
    ]);
    const effective = calculatePlayerEffectiveStats(DEFAULT_BASE_STATS, bonuses);
    expect(effective.shieldBlock).toBe(13); // base(5) + gear(8)
    expect(effective.armour).toBe(4);       // base(2) + gear(2)
  });
});
