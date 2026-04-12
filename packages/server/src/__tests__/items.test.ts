/**
 * Item system tests — loadout validation, weight calculations,
 * durability mechanics, rarity tiers, loot drops.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  validateLoadout,
  calculateLoadoutWeight,
  computeEffectiveStats,
  computeMaxDurability,
  createItemInstance,
  depleteDurability,
  isBroken,
  getRarityConfig,
  compareTiers,
  RARITY_TIERS,
  GEAR_TIER_ORDER,
  MAX_LOADOUT_WEIGHT,
  MAX_CONSUMABLE_SLOTS,
  type ItemDefinition,
  type Loadout,
  type WeaponStats,
  type ArmourStats,
  type ConsumableStats,
} from '@ellmud/shared';
import {
  ALL_FIXTURE_ITEMS,
  buildFixtureRegistry,
  RUSTY_BLADE,
  IRON_SWORD,
  CORRODED_HALBERD,
  TATTERED_LEATHER,
  IRON_CHAINMAIL,
  WATERLOGGED_POTION,
  HEALING_DRAUGHT,
  STAMINA_TONIC,
  REVENANT_BONE,
  CRYPT_KEY_FRAGMENT,
  VOIDFORGED_BLADE,
} from './helpers/item-fixtures.js';

// Mock ContentRegistry so registry functions (and loot-drops) work without a DB.
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import {
  getItemDefinition,
  getAllItemDefinitions,
  getItemsByType,
  getItemsByTier,
} from '../items/registry.js';
import {
  getEligibleItems,
  weightedSelect,
  spawnRoomLoot,
  generateCreatureLoot,
  rollDropCount,
} from '../items/loot-drops.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildDefs(...items: ItemDefinition[]): Map<string, ItemDefinition> {
  return new Map(items.map(i => [i.id, i]));
}

function makeLoadout(
  weapon: ItemDefinition | null,
  armour: ItemDefinition | null,
  consumables: ItemDefinition[] = [],
): { loadout: Loadout; defs: Map<string, ItemDefinition> } {
  const items = [...consumables];
  if (weapon) items.push(weapon);
  if (armour) items.push(armour);
  const defs = buildDefs(...items);

  return {
    loadout: {
      weapon: weapon ? createItemInstance(weapon, `inst-${weapon.id}`) : null,
      armour: armour ? createItemInstance(armour, `inst-${armour.id}`) : null,
      consumables: consumables.map((c, i) => createItemInstance(c, `inst-${c.id}-${i}`)),
    },
    defs,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// RARITY TIERS
// ═════════════════════════════════════════════════════════════════════════════

describe('Rarity Tiers', () => {
  it('should have exactly 6 tiers', () => {
    expect(RARITY_TIERS).toHaveLength(6);
  });

  it('should have ascending stat multipliers', () => {
    for (let i = 1; i < RARITY_TIERS.length; i++) {
      expect(RARITY_TIERS[i].statMultiplier).toBeGreaterThan(RARITY_TIERS[i - 1].statMultiplier);
    }
  });

  it('should have descending drop weights (rarer = lower weight)', () => {
    for (let i = 1; i < RARITY_TIERS.length; i++) {
      expect(RARITY_TIERS[i].dropWeight).toBeLessThan(RARITY_TIERS[i - 1].dropWeight);
    }
  });

  it('getRarityConfig returns correct config for each tier', () => {
    expect(getRarityConfig('scrap').statMultiplier).toBe(0.6);
    expect(getRarityConfig('anomalous').statMultiplier).toBe(2.5);
  });

  it('compareTiers orders correctly', () => {
    expect(compareTiers('scrap', 'common')).toBeLessThan(0);
    expect(compareTiers('masterwork', 'common')).toBeGreaterThan(0);
    expect(compareTiers('refined', 'refined')).toBe(0);
  });

  it('GEAR_TIER_ORDER matches RARITY_TIERS order', () => {
    for (let i = 0; i < RARITY_TIERS.length; i++) {
      expect(GEAR_TIER_ORDER[i]).toBe(RARITY_TIERS[i].tier);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ITEM REGISTRY
// ═════════════════════════════════════════════════════════════════════════════

describe('Item Registry (via ContentRegistry mock)', () => {
  it('should contain all fixture items', () => {
    const all = getAllItemDefinitions();
    expect(all.length).toBe(ALL_FIXTURE_ITEMS.length);
  });

  it('getItemDefinition returns correct item', () => {
    const blade = getItemDefinition('rusty_blade');
    expect(blade).toBeDefined();
    expect(blade!.name).toBe('Rusty Blade');
    expect(blade!.type).toBe('weapon');
    expect(blade!.tier).toBe('scrap');
  });

  it('getItemDefinition returns undefined for unknown item', () => {
    expect(getItemDefinition('nonexistent')).toBeUndefined();
  });

  it('getAllItemDefinitions returns all items', () => {
    const all = getAllItemDefinitions();
    expect(all.length).toBe(ALL_FIXTURE_ITEMS.length);
  });

  it('getItemsByType filters correctly', () => {
    const weapons = getItemsByType('weapon');
    expect(weapons.length).toBeGreaterThanOrEqual(3);
    for (const w of weapons) {
      expect(w.type).toBe('weapon');
    }
  });

  it('getItemsByTier filters correctly', () => {
    const scrap = getItemsByTier('scrap');
    expect(scrap.length).toBeGreaterThanOrEqual(2);
    for (const s of scrap) {
      expect(s.tier).toBe('scrap');
    }
  });

  it('every item has a unique id', () => {
    const ids = getAllItemDefinitions().map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('weapons have WeaponStats', () => {
    for (const w of getItemsByType('weapon')) {
      const stats = w.baseStats as WeaponStats;
      expect(stats.damage).toBeGreaterThan(0);
      expect(stats.speed).toBeGreaterThan(0);
    }
  });

  it('armour has ArmourStats', () => {
    for (const a of getItemsByType('armour')) {
      const stats = a.baseStats as ArmourStats;
      expect(stats.armour).toBeGreaterThan(0);
    }
  });

  it('consumables have non-degradable durability (null)', () => {
    for (const c of getItemsByType('consumable')) {
      expect(c.baseDurability).toBeNull();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// EFFECTIVE STATS (rarity-adjusted)
// ═════════════════════════════════════════════════════════════════════════════

describe('Effective Stats', () => {
  it('scrap weapon has reduced damage', () => {
    const stats = computeEffectiveStats(RUSTY_BLADE) as WeaponStats;
    // base damage 8 × 0.6 = 4.8 → floor = 4
    expect(stats.damage).toBe(4);
    expect(stats.speed).toBe(1);
  });

  it('common weapon has base damage', () => {
    const stats = computeEffectiveStats(IRON_SWORD) as WeaponStats;
    // base 12 × 1.0 = 12
    expect(stats.damage).toBe(12);
  });

  it('sturdy weapon has boosted damage', () => {
    const stats = computeEffectiveStats(CORRODED_HALBERD) as WeaponStats;
    // base 18 × 1.2 = 21.6 → floor = 21
    expect(stats.damage).toBe(21);
  });

  it('anomalous weapon has highest multiplier', () => {
    const stats = computeEffectiveStats(VOIDFORGED_BLADE) as WeaponStats;
    // base 20 × 2.5 = 50
    expect(stats.damage).toBe(50);
  });

  it('armour stats scale with rarity', () => {
    const scrapArmour = computeEffectiveStats(TATTERED_LEATHER) as ArmourStats;
    const commonArmour = computeEffectiveStats(IRON_CHAINMAIL) as ArmourStats;
    // scrap: 3 × 0.6 = 1.8 → 1
    // common: 6 × 1.0 = 6
    expect(scrapArmour.armour).toBe(1);
    expect(commonArmour.armour).toBe(6);
  });

  it('consumable heal scales with rarity', () => {
    const scrapHeal = computeEffectiveStats(WATERLOGGED_POTION) as ConsumableStats;
    const commonHeal = computeEffectiveStats(HEALING_DRAUGHT) as ConsumableStats;
    // scrap: 20 × 0.6 = 12
    // common: 40 × 1.0 = 40
    expect(scrapHeal.heal).toBe(12);
    expect(commonHeal.heal).toBe(40);
  });

  it('consumable duration is not scaled', () => {
    const stats = computeEffectiveStats(STAMINA_TONIC) as ConsumableStats;
    expect(stats.duration).toBe(5);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DURABILITY
// ═════════════════════════════════════════════════════════════════════════════

describe('Durability', () => {
  it('computeMaxDurability applies tier multiplier', () => {
    // Rusty Blade: base 30 × 0.5 (scrap) = 15
    expect(computeMaxDurability(RUSTY_BLADE)).toBe(15);
    // Iron Sword: base 50 × 1.0 (common) = 50
    expect(computeMaxDurability(IRON_SWORD)).toBe(50);
    // Corroded Halberd: base 60 × 1.3 (sturdy) = 78
    expect(computeMaxDurability(CORRODED_HALBERD)).toBe(78);
  });

  it('returns null for non-degradable items', () => {
    expect(computeMaxDurability(WATERLOGGED_POTION)).toBeNull();
    expect(computeMaxDurability(REVENANT_BONE)).toBeNull();
    expect(computeMaxDurability(CRYPT_KEY_FRAGMENT)).toBeNull();
  });

  it('createItemInstance sets full durability', () => {
    const inst = createItemInstance(IRON_SWORD, 'test-1');
    expect(inst.durability).toBe(50);
    expect(inst.maxDurability).toBe(50);
    expect(inst.definitionId).toBe('iron_sword');
  });

  it('createItemInstance sets null durability for materials', () => {
    const inst = createItemInstance(REVENANT_BONE, 'test-2');
    expect(inst.durability).toBeNull();
    expect(inst.maxDurability).toBeNull();
  });

  it('depleteDurability reduces correctly', () => {
    const inst = createItemInstance(IRON_SWORD, 'test-3');
    const depleted = depleteDurability(inst, 10);
    expect(depleted.durability).toBe(40);
    expect(depleted.maxDurability).toBe(50);
  });

  it('depleteDurability clamps at zero', () => {
    const inst = createItemInstance(IRON_SWORD, 'test-4');
    const depleted = depleteDurability(inst, 999);
    expect(depleted.durability).toBe(0);
  });

  it('depleteDurability is no-op for non-degradable items', () => {
    const inst = createItemInstance(WATERLOGGED_POTION, 'test-5');
    const depleted = depleteDurability(inst, 10);
    expect(depleted.durability).toBeNull();
    expect(depleted).toBe(inst); // same reference, no copy
  });

  it('isBroken detects zero durability', () => {
    const inst = createItemInstance(IRON_SWORD, 'test-6');
    expect(isBroken(inst)).toBe(false);
    const broken = depleteDurability(inst, 999);
    expect(isBroken(broken)).toBe(true);
  });

  it('isBroken is false for non-degradable items', () => {
    const inst = createItemInstance(WATERLOGGED_POTION, 'test-7');
    expect(isBroken(inst)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// LOADOUT VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe('Loadout Validation', () => {
  it('valid loadout: weapon + armour + consumables', () => {
    const { loadout, defs } = makeLoadout(IRON_SWORD, IRON_CHAINMAIL, [HEALING_DRAUGHT]);
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('valid loadout: empty (no equipment)', () => {
    const { loadout, defs } = makeLoadout(null, null, []);
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects weapon in armour slot', () => {
    const defs = buildDefs(IRON_SWORD);
    const loadout: Loadout = {
      weapon: null,
      armour: createItemInstance(IRON_SWORD, 'wrong-slot'),
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not armour'))).toBe(true);
  });

  it('rejects armour in weapon slot', () => {
    const defs = buildDefs(IRON_CHAINMAIL);
    const loadout: Loadout = {
      weapon: createItemInstance(IRON_CHAINMAIL, 'wrong-slot'),
      armour: null,
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not a weapon'))).toBe(true);
  });

  it('rejects non-consumable in consumable slot', () => {
    const defs = buildDefs(IRON_SWORD);
    const loadout: Loadout = {
      weapon: null,
      armour: null,
      consumables: [createItemInstance(IRON_SWORD, 'wrong-type')],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not a consumable'))).toBe(true);
  });

  it('rejects broken weapon', () => {
    const defs = buildDefs(IRON_SWORD);
    const inst = createItemInstance(IRON_SWORD, 'broken-sword');
    const broken = depleteDurability(inst, 999);
    const loadout: Loadout = {
      weapon: broken,
      armour: null,
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('broken'))).toBe(true);
  });

  it('rejects broken armour', () => {
    const defs = buildDefs(IRON_CHAINMAIL);
    const inst = createItemInstance(IRON_CHAINMAIL, 'broken-armour');
    const broken = depleteDurability(inst, 999);
    const loadout: Loadout = {
      weapon: null,
      armour: broken,
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('broken'))).toBe(true);
  });

  it('rejects too many consumables', () => {
    const consumables = Array.from({ length: MAX_CONSUMABLE_SLOTS + 1 }, () => HEALING_DRAUGHT);
    const { loadout, defs } = makeLoadout(null, null, consumables);
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many consumables'))).toBe(true);
  });

  it('rejects unknown definition', () => {
    const loadout: Loadout = {
      weapon: { instanceId: 'x', definitionId: 'unknown', durability: 10, maxDurability: 10 },
      armour: null,
      consumables: [],
    };
    const result = validateLoadout(loadout, new Map());
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const defs = buildDefs(IRON_CHAINMAIL, IRON_SWORD);
    const brokenSword = depleteDurability(createItemInstance(IRON_SWORD, 'broken'), 999);
    const loadout: Loadout = {
      weapon: brokenSword,
      armour: null,
      consumables: Array.from({ length: MAX_CONSUMABLE_SLOTS + 1 }, (_, i) =>
        createItemInstance(IRON_CHAINMAIL, `armour-as-consumable-${i}`),
      ),
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// WEIGHT CALCULATIONS
// ═════════════════════════════════════════════════════════════════════════════

describe('Weight Calculations', () => {
  it('calculates total weight correctly', () => {
    const { loadout, defs } = makeLoadout(IRON_SWORD, IRON_CHAINMAIL, [HEALING_DRAUGHT, STAMINA_TONIC]);
    const weight = calculateLoadoutWeight(loadout, defs);
    // sword=6, chainmail=15, 2 consumables=1+1=2
    expect(weight).toBe(23);
  });

  it('empty loadout has zero weight', () => {
    const { loadout, defs } = makeLoadout(null, null, []);
    expect(calculateLoadoutWeight(loadout, defs)).toBe(0);
  });

  it('weapon-only loadout', () => {
    const { loadout, defs } = makeLoadout(CORRODED_HALBERD, null, []);
    expect(calculateLoadoutWeight(loadout, defs)).toBe(12);
  });

  it('rejects overweight loadout', () => {
    const heavyWeapon: ItemDefinition = {
      ...IRON_SWORD,
      id: 'heavy_weapon',
      weight: 50,
    };
    const heavyArmour: ItemDefinition = {
      ...IRON_CHAINMAIL,
      id: 'heavy_armour',
      weight: 55,
    };
    const defs = buildDefs(heavyWeapon, heavyArmour);
    const loadout: Loadout = {
      weapon: createItemInstance(heavyWeapon, 'hw'),
      armour: createItemInstance(heavyArmour, 'ha'),
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('too heavy'))).toBe(true);
  });

  it('loadout at exactly max weight is valid', () => {
    const exactWeapon: ItemDefinition = {
      ...IRON_SWORD,
      id: 'exact_weapon',
      weight: MAX_LOADOUT_WEIGHT,
    };
    const defs = buildDefs(exactWeapon);
    const loadout: Loadout = {
      weapon: createItemInstance(exactWeapon, 'ew'),
      armour: null,
      consumables: [],
    };
    const result = validateLoadout(loadout, defs);
    expect(result.valid).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// LOOT DROPS
// ═════════════════════════════════════════════════════════════════════════════

describe('Loot Drops', () => {
  describe('Eligible Items', () => {
    it('tier 1 zones cap at sturdy', () => {
      const eligible = getEligibleItems(1);
      for (const item of eligible) {
        const tierIdx = GEAR_TIER_ORDER.indexOf(item.tier);
        const sturdyIdx = GEAR_TIER_ORDER.indexOf('sturdy');
        expect(tierIdx).toBeLessThanOrEqual(sturdyIdx);
      }
    });

    it('tier 2 zones cap at refined', () => {
      const eligible = getEligibleItems(2);
      for (const item of eligible) {
        const tierIdx = GEAR_TIER_ORDER.indexOf(item.tier);
        const refinedIdx = GEAR_TIER_ORDER.indexOf('refined');
        expect(tierIdx).toBeLessThanOrEqual(refinedIdx);
      }
    });

    it('tier 3 zones include anomalous', () => {
      const eligible = getEligibleItems(3);
      expect(eligible.some(i => i.tier === 'anomalous')).toBe(true);
    });

    it('higher tiers have more eligible items', () => {
      expect(getEligibleItems(3).length).toBeGreaterThanOrEqual(getEligibleItems(2).length);
      expect(getEligibleItems(2).length).toBeGreaterThanOrEqual(getEligibleItems(1).length);
    });
  });

  describe('Weighted Selection', () => {
    it('low roll values prefer common/scrap items', () => {
      const eligible = getEligibleItems(3);
      const item = weightedSelect(eligible, 0.01);
      const tierIdx = GEAR_TIER_ORDER.indexOf(item.tier);
      expect(tierIdx).toBeLessThanOrEqual(2);
    });

    it('high roll values can yield rarer items', () => {
      const eligible = getEligibleItems(3);
      const item = weightedSelect(eligible, 0.99);
      expect(item).toBeDefined();
    });

    it('returns valid item for boundary rolls', () => {
      const eligible = getEligibleItems(1);
      expect(weightedSelect(eligible, 0)).toBeDefined();
      expect(weightedSelect(eligible, 0.5)).toBeDefined();
      expect(weightedSelect(eligible, 0.999)).toBeDefined();
    });

    it('is deterministic (same roll → same item)', () => {
      const eligible = getEligibleItems(2);
      const a = weightedSelect(eligible, 0.42);
      const b = weightedSelect(eligible, 0.42);
      expect(a.id).toBe(b.id);
    });
  });

  describe('Room Loot Spawning', () => {
    it('spawns correct number of items', () => {
      const loot = spawnRoomLoot('room_5', 1, [0.3, 0.7]);
      expect(loot).toHaveLength(2);
    });

    it('each item has unique instance ID', () => {
      const loot = spawnRoomLoot('room_5', 1, [0.1, 0.5, 0.9]);
      const ids = loot.map(l => l.instanceId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('returns empty for no rolls', () => {
      const loot = spawnRoomLoot('room_5', 1, []);
      expect(loot).toHaveLength(0);
    });

    it('spawned items have valid definitions', () => {
      const loot = spawnRoomLoot('room_5', 2, [0.2, 0.8]);
      for (const l of loot) {
        expect(l.definition).toBeDefined();
        expect(l.definition.id).toBe(l.item.definitionId);
      }
    });
  });

  describe('Creature Loot', () => {
    it('generates correct drop count', () => {
      const loot = generateCreatureLoot({
        creatureId: 'creature_1',
        creatureType: 'drowned_revenant',
        zoneTier: 1,
        rollValues: [0.3, 0.7, 0.1],
        dropCount: 2,
      });
      expect(loot).toHaveLength(2);
    });

    it('limits to available roll values', () => {
      const loot = generateCreatureLoot({
        creatureId: 'creature_2',
        creatureType: 'drowned_revenant',
        zoneTier: 1,
        rollValues: [0.5],
        dropCount: 3,
      });
      expect(loot).toHaveLength(1);
    });

    it('instance IDs are namespaced by creature', () => {
      const loot = generateCreatureLoot({
        creatureId: 'creature_3',
        creatureType: 'drowned_revenant',
        zoneTier: 2,
        rollValues: [0.2, 0.6],
        dropCount: 2,
      });
      for (const l of loot) {
        expect(l.instanceId).toContain('creature_3');
      }
    });

    it('respects zone tier rarity cap', () => {
      const loot = generateCreatureLoot({
        creatureId: 'creature_4',
        creatureType: 'drowned_revenant',
        zoneTier: 1,
        rollValues: [0.99, 0.99],
        dropCount: 2,
      });
      for (const l of loot) {
        const tierIdx = GEAR_TIER_ORDER.indexOf(l.definition.tier);
        const sturdyIdx = GEAR_TIER_ORDER.indexOf('sturdy');
        expect(tierIdx).toBeLessThanOrEqual(sturdyIdx);
      }
    });
  });

  describe('Drop Count Rolling', () => {
    it('tier 1: 1-2 drops', () => {
      expect(rollDropCount(1, 0)).toBe(1);
      expect(rollDropCount(1, 0.99)).toBe(2);
    });

    it('tier 2: 1-3 drops', () => {
      expect(rollDropCount(2, 0)).toBe(1);
      expect(rollDropCount(2, 0.99)).toBe(3);
    });

    it('tier 3: 2-4 drops', () => {
      expect(rollDropCount(3, 0)).toBe(2);
      expect(rollDropCount(3, 0.99)).toBe(4);
    });
  });
});
