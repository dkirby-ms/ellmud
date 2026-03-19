/**
 * Shared item type tests — validates the pure type functions
 * exported from @ellmud/shared that Drizzt's stash system will consume.
 */

import { describe, it, expect } from 'vitest';
import {
  RARITY_TIERS,
  GEAR_TIER_ORDER,
  getRarityConfig,
  compareTiers,
  computeEffectiveStats,
  computeMaxDurability,
  createItemInstance,
  depleteDurability,
  isBroken,
  validateLoadout,
  calculateLoadoutWeight,
  MAX_LOADOUT_WEIGHT,
  MAX_CONSUMABLE_SLOTS,
  type ItemDefinition,
  type WeaponStats,
  type ArmourStats,
  type ConsumableStats,
  type Loadout,
} from '../index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const TEST_WEAPON: ItemDefinition = {
  id: 'test_sword',
  name: 'Test Sword',
  type: 'weapon',
  tier: 'common',
  baseStats: { damage: 10, speed: 1 } as WeaponStats,
  baseDurability: 50,
  weight: 5,
  description: 'A test weapon',
  soulbound: false,
};

const TEST_ARMOUR: ItemDefinition = {
  id: 'test_plate',
  name: 'Test Plate',
  type: 'armour',
  tier: 'sturdy',
  baseStats: { armour: 8, weight: 20 } as ArmourStats,
  baseDurability: 60,
  weight: 20,
  description: 'Test armour',
  soulbound: false,
};

const TEST_POTION: ItemDefinition = {
  id: 'test_potion',
  name: 'Test Potion',
  type: 'consumable',
  tier: 'common',
  baseStats: { heal: 30 } as ConsumableStats,
  baseDurability: null,
  weight: 1,
  description: 'A test potion',
  soulbound: false,
};

const TEST_MATERIAL: ItemDefinition = {
  id: 'test_ore',
  name: 'Test Ore',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 3,
  description: 'A test material',
  soulbound: false,
};

function makeDefs(...items: ItemDefinition[]): Map<string, ItemDefinition> {
  return new Map(items.map(i => [i.id, i]));
}

// ═════════════════════════════════════════════════════════════════════════════

describe('Shared Item Types', () => {
  describe('Rarity system', () => {
    it('exports 6 rarity tiers', () => {
      expect(RARITY_TIERS).toHaveLength(6);
      expect(GEAR_TIER_ORDER).toHaveLength(6);
    });

    it('getRarityConfig finds every tier', () => {
      for (const tier of GEAR_TIER_ORDER) {
        const config = getRarityConfig(tier);
        expect(config.tier).toBe(tier);
        expect(config.statMultiplier).toBeGreaterThan(0);
      }
    });

    it('compareTiers produces correct ordering', () => {
      expect(compareTiers('scrap', 'anomalous')).toBeLessThan(0);
      expect(compareTiers('anomalous', 'scrap')).toBeGreaterThan(0);
      expect(compareTiers('common', 'common')).toBe(0);
    });
  });

  describe('Effective stats computation', () => {
    it('weapon damage scales by tier', () => {
      const common = computeEffectiveStats(TEST_WEAPON) as WeaponStats;
      expect(common.damage).toBe(10); // 10 × 1.0

      const scrap = computeEffectiveStats({ ...TEST_WEAPON, tier: 'scrap' }) as WeaponStats;
      expect(scrap.damage).toBe(6); // 10 × 0.6

      const masterwork = computeEffectiveStats({ ...TEST_WEAPON, tier: 'masterwork' }) as WeaponStats;
      expect(masterwork.damage).toBe(18); // 10 × 1.8
    });

    it('armour scales by tier', () => {
      const sturdy = computeEffectiveStats(TEST_ARMOUR) as ArmourStats;
      expect(sturdy.armour).toBe(9); // 8 × 1.2 = 9.6 → 9
    });

    it('consumable heal scales by tier', () => {
      const common = computeEffectiveStats(TEST_POTION) as ConsumableStats;
      expect(common.heal).toBe(30); // 30 × 1.0
    });

    it('material returns empty stats', () => {
      const stats = computeEffectiveStats(TEST_MATERIAL);
      expect(stats).toEqual({});
    });
  });

  describe('Durability', () => {
    it('max durability scales with tier', () => {
      expect(computeMaxDurability(TEST_WEAPON)).toBe(50);  // 50 × 1.0
      expect(computeMaxDurability(TEST_ARMOUR)).toBe(78);  // 60 × 1.3
      expect(computeMaxDurability(TEST_POTION)).toBeNull();
    });

    it('createItemInstance initializes correctly', () => {
      const inst = createItemInstance(TEST_WEAPON, 'i1');
      expect(inst.instanceId).toBe('i1');
      expect(inst.definitionId).toBe('test_sword');
      expect(inst.durability).toBe(50);
      expect(inst.maxDurability).toBe(50);
    });

    it('depleteDurability reduces and clamps', () => {
      const inst = createItemInstance(TEST_WEAPON, 'i2');
      const after = depleteDurability(inst, 20);
      expect(after.durability).toBe(30);
      const smashed = depleteDurability(after, 100);
      expect(smashed.durability).toBe(0);
    });

    it('isBroken detects zero durability', () => {
      const fresh = createItemInstance(TEST_WEAPON, 'i3');
      expect(isBroken(fresh)).toBe(false);
      const broken = depleteDurability(fresh, 9999);
      expect(isBroken(broken)).toBe(true);
    });

    it('non-degradable items ignore durability ops', () => {
      const inst = createItemInstance(TEST_POTION, 'i4');
      expect(isBroken(inst)).toBe(false);
      const same = depleteDurability(inst, 100);
      expect(same).toBe(inst);
    });
  });

  describe('Loadout validation', () => {
    it('accepts valid loadout', () => {
      const defs = makeDefs(TEST_WEAPON, TEST_ARMOUR, TEST_POTION);
      const loadout: Loadout = {
        weapon: createItemInstance(TEST_WEAPON, 'w1'),
        armour: createItemInstance(TEST_ARMOUR, 'a1'),
        consumables: [createItemInstance(TEST_POTION, 'c1')],
      };
      const result = validateLoadout(loadout, defs);
      expect(result.valid).toBe(true);
    });

    it('rejects wrong item type in slot', () => {
      const defs = makeDefs(TEST_POTION);
      const loadout: Loadout = {
        weapon: createItemInstance(TEST_POTION, 'wrong'),
        armour: null,
        consumables: [],
      };
      const result = validateLoadout(loadout, defs);
      expect(result.valid).toBe(false);
    });

    it('calculates loadout weight', () => {
      const defs = makeDefs(TEST_WEAPON, TEST_ARMOUR, TEST_POTION);
      const loadout: Loadout = {
        weapon: createItemInstance(TEST_WEAPON, 'w1'),
        armour: createItemInstance(TEST_ARMOUR, 'a1'),
        consumables: [createItemInstance(TEST_POTION, 'c1')],
      };
      // 5 + 20 + 1 = 26
      expect(calculateLoadoutWeight(loadout, defs)).toBe(26);
    });

    it('rejects overweight loadout', () => {
      const heavy: ItemDefinition = { ...TEST_WEAPON, id: 'heavy', weight: MAX_LOADOUT_WEIGHT + 1 };
      const defs = makeDefs(heavy);
      const loadout: Loadout = {
        weapon: createItemInstance(heavy, 'h1'),
        armour: null,
        consumables: [],
      };
      const result = validateLoadout(loadout, defs);
      expect(result.valid).toBe(false);
    });
  });
});
