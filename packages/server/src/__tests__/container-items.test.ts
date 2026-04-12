/**
 * Container item type tests — Issue #409 Phase 2.
 *
 * Covers: Container type creation, adding/removing items, slot limits,
 * weight limits, carryBonus, allowedItemTypes filtering, nesting prevention,
 * weight calculations with nested items, and serialization.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createItemInstance,
  addItemToContainer,
  removeItemFromContainer,
  getContainerContentsWeight,
  getContainerTotalWeight,
  getContainerSlotCount,
  calculateCarryBonus,
  type ItemDefinition,
  type ItemInstance,
  type ContainerSlotEntry,
} from '@ellmud/shared';
import {
  TATTERED_SATCHEL,
  EXPEDITION_PACK,
  APOTHECARY_POUCH,
  HEALING_DRAUGHT,
  RUSTY_BLADE,
  ALL_FIXTURE_ITEMS,
  buildFixtureRegistry,
} from './helpers/item-fixtures.js';

// Mock ContentRegistry so getItemsByType works without a DB.
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import { getItemsByType } from '../items/index.js';
import { inventoryToEntries } from '../inventory/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function makeDefs(...items: ItemDefinition[]): Map<string, ItemDefinition> {
  return new Map(items.map(i => [i.id, i]));
}

const TEST_CONTAINER: ItemDefinition = {
  id: 'test_bag',
  name: 'Test Bag',
  type: 'container',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A test container',
  soulbound: false,
  containerProperties: {
    maxSlots: 3,
    maxWeight: 15,
  },
};

const TEST_BONUS_BAG: ItemDefinition = {
  id: 'bonus_bag',
  name: 'Bonus Bag',
  type: 'container',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'A bag that helps you carry more',
  soulbound: false,
  containerProperties: {
    maxSlots: 4,
    carryBonus: 10,
  },
};

const TEST_POTION_ONLY: ItemDefinition = {
  id: 'potion_pouch',
  name: 'Potion Pouch',
  type: 'container',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 0.5,
  description: 'Only potions fit here',
  soulbound: false,
  containerProperties: {
    maxSlots: 5,
    allowedItemTypes: ['consumable'],
  },
};

const TEST_POTION: ItemDefinition = {
  id: 'test_potion',
  name: 'Test Potion',
  type: 'consumable',
  tier: 'common',
  baseStats: { heal: 20 },
  baseDurability: null,
  weight: 1,
  description: 'A healing potion',
  soulbound: false,
};

const TEST_WEAPON: ItemDefinition = {
  id: 'test_sword',
  name: 'Test Sword',
  type: 'weapon',
  tier: 'common',
  baseStats: { damage: 10, speed: 1 },
  baseDurability: 50,
  weight: 5,
  description: 'A test weapon',
  soulbound: false,
};

const TEST_MATERIAL: ItemDefinition = {
  id: 'test_bone',
  name: 'Test Bone',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A bone',
  soulbound: false,
};

// ─── Container Creation ─────────────────────────────────────────────────────

describe('Container Item Type (#409 Phase 2)', () => {
  describe('creation', () => {
    it('creates a container item with empty contents', () => {
      const instance = createItemInstance(TEST_CONTAINER, 'bag-1');
      expect(instance.definitionId).toBe('test_bag');
      expect(instance.contents).toEqual([]);
      expect(instance.durability).toBeNull();
    });

    it('non-container items have no contents field', () => {
      const sword = createItemInstance(TEST_WEAPON, 'sword-1');
      expect(sword.contents).toBeUndefined();
    });

    it('registry containers have containerProperties', () => {
      expect(TATTERED_SATCHEL.type).toBe('container');
      expect(TATTERED_SATCHEL.containerProperties).toBeDefined();
      expect(TATTERED_SATCHEL.containerProperties!.maxSlots).toBe(4);
    });

    it('expedition pack has carryBonus', () => {
      expect(EXPEDITION_PACK.containerProperties!.carryBonus).toBe(5);
    });

    it('apothecary pouch restricts to consumables', () => {
      expect(APOTHECARY_POUCH.containerProperties!.allowedItemTypes).toEqual(['consumable']);
    });
  });

  // ─── Adding Items ──────────────────────────────────────────────────────

  describe('adding items to container', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON, TEST_MATERIAL);
    let container: ItemInstance;

    it('adds an item to an empty container', () => {
      container = createItemInstance(TEST_CONTAINER, 'bag-1');
      const result = addItemToContainer(
        container,
        TEST_CONTAINER,
        { definitionId: 'test_potion', quantity: 1, durability: null },
        TEST_POTION,
        defs,
      );
      expect(result.success).toBe(true);
      expect(result.updatedContainer!.contents).toHaveLength(1);
      expect(result.updatedContainer!.contents![0]).toEqual({
        definitionId: 'test_potion',
        quantity: 1,
        durability: null,
      });
    });

    it('stacks same items in existing slot', () => {
      container = createItemInstance(TEST_CONTAINER, 'bag-1');
      const first = addItemToContainer(
        container,
        TEST_CONTAINER,
        { definitionId: 'test_potion', quantity: 2, durability: null },
        TEST_POTION,
        defs,
      );
      const second = addItemToContainer(
        first.updatedContainer!,
        TEST_CONTAINER,
        { definitionId: 'test_potion', quantity: 3, durability: null },
        TEST_POTION,
        defs,
      );
      expect(second.success).toBe(true);
      // Should still be 1 slot, quantity 5
      expect(second.updatedContainer!.contents).toHaveLength(1);
      expect(second.updatedContainer!.contents![0].quantity).toBe(5);
    });

    it('adds different items to separate slots', () => {
      container = createItemInstance(TEST_CONTAINER, 'bag-1');
      let c = container;
      const r1 = addItemToContainer(
        c, TEST_CONTAINER,
        { definitionId: 'test_potion', quantity: 1, durability: null },
        TEST_POTION, defs,
      );
      c = r1.updatedContainer!;
      const r2 = addItemToContainer(
        c, TEST_CONTAINER,
        { definitionId: 'test_sword', quantity: 1, durability: 50 },
        TEST_WEAPON, defs,
      );
      c = r2.updatedContainer!;
      expect(c.contents).toHaveLength(2);
    });

    it('immutably returns a new container instance', () => {
      container = createItemInstance(TEST_CONTAINER, 'bag-1');
      const result = addItemToContainer(
        container,
        TEST_CONTAINER,
        { definitionId: 'test_potion', quantity: 1, durability: null },
        TEST_POTION,
        defs,
      );
      // Original should be unchanged
      expect(container.contents).toEqual([]);
      expect(result.updatedContainer!.contents).toHaveLength(1);
    });
  });

  // ─── Slot Limits ───────────────────────────────────────────────────────

  describe('slot limits', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON, TEST_MATERIAL);

    it('rejects items when container is full (maxSlots)', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1'); // maxSlots: 3
      // Fill 3 distinct slots
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 1, durability: null }, TEST_POTION, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 1, durability: 50 }, TEST_WEAPON, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_bone', quantity: 1, durability: null }, TEST_MATERIAL, defs).updatedContainer!;

      expect(c.contents).toHaveLength(3);

      // 4th distinct item should fail
      const result = addItemToContainer(
        c, TEST_CONTAINER,
        { definitionId: 'another_item', quantity: 1, durability: null },
        { ...TEST_MATERIAL, id: 'another_item' },
        defs,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('full');
    });

    it('stacking past maxSlots is allowed (same item)', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1'); // maxSlots: 3
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 1, durability: null }, TEST_POTION, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 1, durability: 50 }, TEST_WEAPON, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_bone', quantity: 1, durability: null }, TEST_MATERIAL, defs).updatedContainer!;

      // Adding more potions should succeed (stacks on existing)
      const result = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 5, durability: null }, TEST_POTION, defs);
      expect(result.success).toBe(true);
      expect(result.updatedContainer!.contents).toHaveLength(3);
      expect(result.updatedContainer!.contents![0].quantity).toBe(6);
    });
  });

  // ─── Weight Limits ─────────────────────────────────────────────────────

  describe('weight limits', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON);

    it('rejects items when weight limit would be exceeded', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1'); // maxWeight: 15
      // Sword weighs 5 each, add 3 = 15
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 3, durability: 50 }, TEST_WEAPON, defs).updatedContainer!;

      // Adding another potion (weight 1) would exceed 15
      const result = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 1, durability: null }, TEST_POTION, defs);
      expect(result.success).toBe(false);
      expect(result.error).toContain('weight limit');
    });

    it('allows items up to exact weight limit', () => {
      const c = createItemInstance(TEST_CONTAINER, 'bag-1'); // maxWeight: 15
      // 3 swords = 15 weight exactly
      const result = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 3, durability: 50 }, TEST_WEAPON, defs);
      expect(result.success).toBe(true);
    });

    it('container with no maxWeight has unlimited capacity', () => {
      const unlimitedBag: ItemDefinition = {
        ...TEST_CONTAINER,
        id: 'unlimited_bag',
        containerProperties: { maxSlots: 10 },
      };
      const d = makeDefs(unlimitedBag, TEST_WEAPON);
      const c = createItemInstance(unlimitedBag, 'unlimited-1');
      // Add many heavy items
      const result = addItemToContainer(c, unlimitedBag, { definitionId: 'test_sword', quantity: 100, durability: 50 }, TEST_WEAPON, d);
      expect(result.success).toBe(true);
    });
  });

  // ─── Weight Calculations ───────────────────────────────────────────────

  describe('weight calculations', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON);

    it('empty container weight = own weight only', () => {
      const c = createItemInstance(TEST_CONTAINER, 'bag-1');
      expect(getContainerContentsWeight(c, defs)).toBe(0);
      expect(getContainerTotalWeight(c, defs)).toBe(2); // own weight
    });

    it('calculates contents weight correctly', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 3, durability: null }, TEST_POTION, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 1, durability: 50 }, TEST_WEAPON, defs).updatedContainer!;

      // 3 potions × 1 weight + 1 sword × 5 weight = 8
      expect(getContainerContentsWeight(c, defs)).toBe(8);
      // Total = own (2) + contents (8) = 10
      expect(getContainerTotalWeight(c, defs)).toBe(10);
    });

    it('handles unknown definitions gracefully (0 weight)', () => {
      const c: ItemInstance = {
        instanceId: 'orphan-bag',
        definitionId: 'unknown_bag',
        durability: null,
        maxDurability: null,
        contents: [{ definitionId: 'unknown_item', quantity: 5, durability: null }],
      };
      // Unknown defs contribute 0 weight
      expect(getContainerContentsWeight(c, defs)).toBe(0);
      expect(getContainerTotalWeight(c, defs)).toBe(0);
    });
  });

  // ─── Removing Items ────────────────────────────────────────────────────

  describe('removing items from container', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON);

    it('removes entire stack when quantity matches', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 1, durability: null }, TEST_POTION, defs).updatedContainer!;
      
      const result = removeItemFromContainer(c, 'test_potion', 1);
      expect(result.success).toBe(true);
      expect(result.updatedContainer!.contents).toHaveLength(0);
      expect(result.removed!.quantity).toBe(1);
    });

    it('partial removal reduces quantity', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 5, durability: null }, TEST_POTION, defs).updatedContainer!;

      const result = removeItemFromContainer(c, 'test_potion', 2);
      expect(result.success).toBe(true);
      expect(result.updatedContainer!.contents![0].quantity).toBe(3);
      expect(result.removed!.quantity).toBe(2);
    });

    it('removing more than available removes entire stack', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 3, durability: null }, TEST_POTION, defs).updatedContainer!;

      const result = removeItemFromContainer(c, 'test_potion', 10);
      expect(result.success).toBe(true);
      expect(result.updatedContainer!.contents).toHaveLength(0);
      expect(result.removed!.quantity).toBe(3);
    });

    it('fails when item not found', () => {
      const c = createItemInstance(TEST_CONTAINER, 'bag-1');
      const result = removeItemFromContainer(c, 'nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('fails on empty contents', () => {
      const c: ItemInstance = {
        instanceId: 'no-contents',
        definitionId: 'test_bag',
        durability: null,
        maxDurability: null,
      };
      const result = removeItemFromContainer(c, 'test_potion');
      expect(result.success).toBe(false);
    });

    it('immutably returns a new container instance', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 3, durability: null }, TEST_POTION, defs).updatedContainer!;
      const original = c;
      
      const result = removeItemFromContainer(c, 'test_potion', 1);
      // Original should be unchanged
      expect(original.contents![0].quantity).toBe(3);
      expect(result.updatedContainer!.contents![0].quantity).toBe(2);
    });
  });

  // ─── Carry Bonus ───────────────────────────────────────────────────────

  describe('carryBonus', () => {
    it('calculates bonus from a single bag with carryBonus', () => {
      const defs = makeDefs(TEST_BONUS_BAG);
      const bag = createItemInstance(TEST_BONUS_BAG, 'bonus-1');
      expect(calculateCarryBonus([bag], defs)).toBe(10);
    });

    it('stacks bonuses from multiple bags', () => {
      const defs = makeDefs(TEST_BONUS_BAG, EXPEDITION_PACK);
      const bag1 = createItemInstance(TEST_BONUS_BAG, 'bonus-1');
      const bag2 = createItemInstance(EXPEDITION_PACK, 'pack-1');
      expect(calculateCarryBonus([bag1, bag2], defs)).toBe(15); // 10 + 5
    });

    it('ignores containers without carryBonus', () => {
      const defs = makeDefs(TEST_CONTAINER, TEST_BONUS_BAG);
      const noBonusBag = createItemInstance(TEST_CONTAINER, 'no-bonus');
      const bonusBag = createItemInstance(TEST_BONUS_BAG, 'bonus');
      expect(calculateCarryBonus([noBonusBag, bonusBag], defs)).toBe(10);
    });

    it('ignores non-container items', () => {
      const defs = makeDefs(TEST_WEAPON);
      const sword = createItemInstance(TEST_WEAPON, 'sword-1');
      expect(calculateCarryBonus([sword], defs)).toBe(0);
    });

    it('returns 0 for empty inventory', () => {
      const defs = makeDefs();
      expect(calculateCarryBonus([], defs)).toBe(0);
    });
  });

  // ─── Allowed Item Types ────────────────────────────────────────────────

  describe('allowedItemTypes filtering', () => {
    const defs = makeDefs(TEST_POTION_ONLY, TEST_POTION, TEST_WEAPON);

    it('accepts items of allowed type', () => {
      const c = createItemInstance(TEST_POTION_ONLY, 'pouch-1');
      const result = addItemToContainer(
        c, TEST_POTION_ONLY,
        { definitionId: 'test_potion', quantity: 1, durability: null },
        TEST_POTION, defs,
      );
      expect(result.success).toBe(true);
    });

    it('rejects items of disallowed type', () => {
      const c = createItemInstance(TEST_POTION_ONLY, 'pouch-1');
      const result = addItemToContainer(
        c, TEST_POTION_ONLY,
        { definitionId: 'test_sword', quantity: 1, durability: 50 },
        TEST_WEAPON, defs,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not accept');
    });

    it('registry apothecary pouch rejects weapons', () => {
      const d = makeDefs(APOTHECARY_POUCH, RUSTY_BLADE);
      const pouch = createItemInstance(APOTHECARY_POUCH, 'pouch-1');
      const result = addItemToContainer(
        pouch, APOTHECARY_POUCH,
        { definitionId: RUSTY_BLADE.id, quantity: 1, durability: 30 },
        RUSTY_BLADE, d,
      );
      expect(result.success).toBe(false);
    });

    it('registry apothecary pouch accepts healing draught', () => {
      const d = makeDefs(APOTHECARY_POUCH, HEALING_DRAUGHT);
      const pouch = createItemInstance(APOTHECARY_POUCH, 'pouch-1');
      const result = addItemToContainer(
        pouch, APOTHECARY_POUCH,
        { definitionId: HEALING_DRAUGHT.id, quantity: 1, durability: null },
        HEALING_DRAUGHT, d,
      );
      expect(result.success).toBe(true);
    });
  });

  // ─── Container Nesting Prevention ──────────────────────────────────────

  describe('nesting prevention', () => {
    it('rejects placing a container inside another container', () => {
      const defs = makeDefs(TEST_CONTAINER);
      const outer = createItemInstance(TEST_CONTAINER, 'outer');
      const result = addItemToContainer(
        outer, TEST_CONTAINER,
        { definitionId: 'test_bag', quantity: 1, durability: null },
        TEST_CONTAINER, defs,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot place a container');
    });
  });

  // ─── Non-container rejection ───────────────────────────────────────────

  describe('non-container rejection', () => {
    it('rejects adding items to a non-container', () => {
      const defs = makeDefs(TEST_WEAPON, TEST_POTION);
      const sword = createItemInstance(TEST_WEAPON, 'sword-1');
      const result = addItemToContainer(
        sword, TEST_WEAPON,
        { definitionId: 'test_potion', quantity: 1, durability: null },
        TEST_POTION, defs,
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('not a container');
    });
  });

  // ─── Slot Count ────────────────────────────────────────────────────────

  describe('slot count', () => {
    const defs = makeDefs(TEST_CONTAINER, TEST_POTION, TEST_WEAPON);

    it('empty container has 0 slots used', () => {
      const c = createItemInstance(TEST_CONTAINER, 'bag-1');
      expect(getContainerSlotCount(c)).toBe(0);
    });

    it('counts distinct item stacks as slots', () => {
      let c = createItemInstance(TEST_CONTAINER, 'bag-1');
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_potion', quantity: 5, durability: null }, TEST_POTION, defs).updatedContainer!;
      c = addItemToContainer(c, TEST_CONTAINER, { definitionId: 'test_sword', quantity: 1, durability: 50 }, TEST_WEAPON, defs).updatedContainer!;
      expect(getContainerSlotCount(c)).toBe(2);
    });

    it('handles instance without contents', () => {
      const c: ItemInstance = {
        instanceId: 'bare',
        definitionId: 'test_bag',
        durability: null,
        maxDurability: null,
      };
      expect(getContainerSlotCount(c)).toBe(0);
    });
  });

  // ─── Serialization / Persistence ───────────────────────────────────────

  describe('serialization', () => {
    it('inventoryToEntries serializes container contents in metadata', () => {
      const bagItem = {
        id: 'test_bag',
        name: 'Test Bag',
        weight: 2,
        description: 'A test container',
        containerContents: [
          { definitionId: 'test_potion', quantity: 3, durability: null },
          { definitionId: 'test_sword', quantity: 1, durability: 50 },
        ],
      };
      const inventory = new Map([
        ['test_bag', { item: bagItem, quantity: 1 }],
      ]);

      const entries = inventoryToEntries(inventory);
      expect(entries).toHaveLength(1);
      expect(entries[0].metadata.containerContents).toEqual([
        { definitionId: 'test_potion', quantity: 3, durability: null },
        { definitionId: 'test_sword', quantity: 1, durability: 50 },
      ]);
    });

    it('inventoryToEntries excludes containerContents for non-containers', () => {
      const sword = {
        id: 'test_sword',
        name: 'Test Sword',
        weight: 5,
        description: 'A sword',
      };
      const inventory = new Map([
        ['test_sword', { item: sword, quantity: 1 }],
      ]);

      const entries = inventoryToEntries(inventory);
      expect(entries[0].metadata.containerContents).toBeUndefined();
    });

    it('round-trips container contents through serialization', () => {
      const contents: ContainerSlotEntry[] = [
        { definitionId: 'healing_draught', quantity: 2, durability: null },
        { definitionId: 'rusty_blade', quantity: 1, durability: 15 },
      ];
      const bagItem = {
        id: 'expedition_pack',
        name: 'Expedition Pack',
        weight: 2,
        description: 'A pack',
        containerContents: contents,
      };
      const inventory = new Map([
        ['expedition_pack', { item: bagItem, quantity: 1 }],
      ]);

      const entries = inventoryToEntries(inventory);
      const restored = entries[0].metadata.containerContents as ContainerSlotEntry[];
      expect(restored).toEqual(contents);
    });
  });

  // ─── Registry Items ────────────────────────────────────────────────────

  describe('registry container items', () => {
    it('tattered satchel is a valid container definition', () => {
      expect(TATTERED_SATCHEL.type).toBe('container');
      expect(TATTERED_SATCHEL.containerProperties).toEqual({
        maxSlots: 4,
        maxWeight: 10,
      });
    });

    it('expedition pack has carryBonus', () => {
      expect(EXPEDITION_PACK.type).toBe('container');
      expect(EXPEDITION_PACK.containerProperties!.carryBonus).toBe(5);
      expect(EXPEDITION_PACK.containerProperties!.maxSlots).toBe(8);
    });

    it('apothecary pouch restricts to consumables', () => {
      expect(APOTHECARY_POUCH.type).toBe('container');
      expect(APOTHECARY_POUCH.containerProperties!.allowedItemTypes).toEqual(['consumable']);
    });

    it('getItemsByType returns container items', () => {
      const containers = getItemsByType('container');
      expect(containers.length).toBeGreaterThanOrEqual(3);
      expect(containers.every((c: ItemDefinition) => c.type === 'container')).toBe(true);
    });
  });
});
