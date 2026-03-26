/**
 * Loadout test fixtures — shared item definitions and helpers for loadout tests.
 *
 * These fixtures define test items for every equipment slot type, plus
 * factory helpers to create item instances. Used across all loadout test files.
 *
 * Based on shared types: EquipmentSlotType, SLOT_ACCEPTS, DisplayItem,
 * StashItem, StashItemInstance.
 */

import type {
  StashItem,
  StashItemInstance,
  EquipmentSlotType,
  ItemType,
} from '@ellmud/shared';
import { SLOT_ACCEPTS } from '@ellmud/shared';

// ─── Player IDs ──────────────────────────────────────────────────────────────

export const PLAYER_A = 'loadout-player-aaa';
export const PLAYER_B = 'loadout-player-bbb';

// ─── Test Stash Items (Definitions) ──────────────────────────────────────────
// Each item is designed for a specific equipment slot.

export const IRON_HELM: StashItem = {
  id: 'iron-helm',
  name: 'Iron Helm',
  type: 'armour',
  weight: 5,
  rarity: 'common',
  description: 'A sturdy iron helm protecting the head.',
  baseDurability: 50,
};

export const STEEL_BREASTPLATE: StashItem = {
  id: 'steel-breastplate',
  name: 'Steel Breastplate',
  type: 'armour',
  weight: 15,
  rarity: 'sturdy',
  description: 'Heavy chest armour forged from hardened steel.',
  baseDurability: 70,
};

export const LEATHER_LEGGINGS: StashItem = {
  id: 'leather-leggings',
  name: 'Leather Leggings',
  type: 'armour',
  weight: 6,
  rarity: 'common',
  description: 'Flexible leggings offering decent leg protection.',
  baseDurability: 40,
};

export const IRON_BOOTS: StashItem = {
  id: 'iron-boots',
  name: 'Iron Boots',
  type: 'armour',
  weight: 4,
  rarity: 'common',
  description: 'Heavy iron boots.',
  baseDurability: 45,
};

export const CHAIN_GAUNTLETS: StashItem = {
  id: 'chain-gauntlets',
  name: 'Chain Gauntlets',
  type: 'armour',
  weight: 3,
  rarity: 'common',
  description: 'Chain-linked gauntlets protecting the hands.',
  baseDurability: 35,
};

export const RUSTY_SWORD: StashItem = {
  id: 'rusty-sword',
  name: 'Rusty Sword',
  type: 'weapon',
  weight: 5,
  rarity: 'scrap',
  description: 'A battered sword, still sharp enough to cut.',
  baseDurability: 30,
};

export const IRON_SWORD: StashItem = {
  id: 'iron-sword',
  name: 'Iron Sword',
  type: 'weapon',
  weight: 6,
  rarity: 'common',
  description: 'A reliable iron sword.',
  baseDurability: 50,
};

export const WOODEN_SHIELD: StashItem = {
  id: 'wooden-shield',
  name: 'Wooden Shield',
  type: 'tool',
  weight: 8,
  rarity: 'common',
  description: 'A wooden buckler for the offhand.',
  baseDurability: 40,
};

export const OFFHAND_DAGGER: StashItem = {
  id: 'offhand-dagger',
  name: 'Offhand Dagger',
  type: 'weapon',
  weight: 2,
  rarity: 'common',
  description: 'A small dagger wielded in the off hand.',
  baseDurability: 30,
};

export const COPPER_RING: StashItem = {
  id: 'copper-ring',
  name: 'Copper Ring',
  type: 'material',
  weight: 0.5,
  rarity: 'common',
  description: 'A simple copper ring.',
  baseDurability: null,
};

export const SILVER_RING: StashItem = {
  id: 'silver-ring',
  name: 'Silver Ring',
  type: 'material',
  weight: 0.5,
  rarity: 'sturdy',
  description: 'A polished silver ring.',
  baseDurability: null,
};

export const JADE_AMULET: StashItem = {
  id: 'jade-amulet',
  name: 'Jade Amulet',
  type: 'material',
  weight: 1,
  rarity: 'refined',
  description: 'An amulet carved from deep-green jade.',
  baseDurability: null,
};

export const CRYPT_KEY: StashItem = {
  id: 'crypt-key',
  name: 'Crypt Key',
  type: 'key',
  weight: 1,
  rarity: 'common',
  description: 'A skeletal key that unlocks deeper shard levels.',
  baseDurability: null,
};

export const HEALING_POTION: StashItem = {
  id: 'healing-potion',
  name: 'Healing Potion',
  type: 'consumable',
  weight: 1,
  rarity: 'common',
  description: 'Restores a moderate amount of health.',
  baseDurability: null,
};

// ─── All Test Items ──────────────────────────────────────────────────────────

export const ALL_TEST_ITEMS: StashItem[] = [
  IRON_HELM,
  STEEL_BREASTPLATE,
  LEATHER_LEGGINGS,
  IRON_BOOTS,
  CHAIN_GAUNTLETS,
  RUSTY_SWORD,
  IRON_SWORD,
  WOODEN_SHIELD,
  OFFHAND_DAGGER,
  COPPER_RING,
  SILVER_RING,
  JADE_AMULET,
  CRYPT_KEY,
  HEALING_POTION,
];

// ─── Item Definition Map ────────────────────────────────────────────────────

export function buildItemDefs(...items: StashItem[]): Map<string, StashItem> {
  return new Map(items.map((i) => [i.id, i]));
}

export function allTestItemDefs(): Map<string, StashItem> {
  return buildItemDefs(...ALL_TEST_ITEMS);
}

// ─── Instance Factories ─────────────────────────────────────────────────────

let instanceCounter = 0;

export function makeInstance(
  itemId: string,
  instanceId?: string,
  durability: number | null = 50,
  maxDurability: number | null = 50,
): StashItemInstance {
  instanceCounter++;
  return {
    instanceId: instanceId ?? `${itemId}-inst-${instanceCounter}`,
    itemId,
    durability,
    maxDurability,
  };
}

/** Create a StashItemInstance from a StashItem definition with sensible defaults. */
export function makeInstanceFromDef(
  item: StashItem,
  instanceId?: string,
): StashItemInstance {
  instanceCounter++;
  return {
    instanceId: instanceId ?? `${item.id}-inst-${instanceCounter}`,
    itemId: item.id,
    durability: item.baseDurability,
    maxDurability: item.baseDurability,
  };
}

export function resetInstanceCounter(): void {
  instanceCounter = 0;
}

// ─── Slot Mapping Helpers ───────────────────────────────────────────────────

/** Get an item type that a given slot does NOT accept (for negative tests). */
export function getInvalidTypeForSlot(slot: EquipmentSlotType): ItemType {
  const accepted = SLOT_ACCEPTS[slot];
  const allTypes: ItemType[] = ['weapon', 'armour', 'consumable', 'material', 'tool', 'key'];
  return allTypes.find((t) => !accepted.includes(t)) ?? 'key';
}

/** Get a test item that fits a given slot. */
export function getItemForSlot(slot: EquipmentSlotType): StashItem {
  const map: Record<EquipmentSlotType, StashItem> = {
    head: IRON_HELM,
    chest: STEEL_BREASTPLATE,
    legs: LEATHER_LEGGINGS,
    feet: IRON_BOOTS,
    hands: CHAIN_GAUNTLETS,
    weapon: RUSTY_SWORD,
    offhand: WOODEN_SHIELD,
    ring1: COPPER_RING,
    ring2: SILVER_RING,
    amulet: JADE_AMULET,
  };
  return map[slot];
}

/** Get a test item that does NOT fit a given slot (wrong type). */
export function getWrongItemForSlot(slot: EquipmentSlotType): StashItem {
  // Return an item type the slot does NOT accept
  const accepted = SLOT_ACCEPTS[slot];
  if (!accepted.includes('weapon')) return RUSTY_SWORD;
  if (!accepted.includes('armour')) return IRON_HELM;
  if (!accepted.includes('material')) return COPPER_RING;
  return CRYPT_KEY;
}

// ─── Stash Population Helpers ───────────────────────────────────────────────

/**
 * Pre-populate an InMemoryStashRepository with test items for a player.
 * Returns map of itemId → instanceId for reference in tests.
 */
export async function populateStash(
  repo: { addItem(playerId: string, instance: StashItemInstance, quantity?: number): Promise<void> },
  playerId: string,
  items: Array<{ item: StashItem; quantity?: number }>,
): Promise<Map<string, string>> {
  const instanceMap = new Map<string, string>();
  for (const { item, quantity } of items) {
    const instance = makeInstanceFromDef(item);
    instanceMap.set(item.id, instance.instanceId);
    await repo.addItem(playerId, instance, quantity ?? 1);
  }
  return instanceMap;
}

/**
 * Count total items across stash and loadout for invariant checks.
 * Takes stash entries + equipment slots and returns total count.
 */
export function countTotalItems(
  stashEntries: Array<{ quantity: number }>,
  equipmentSlots: Record<string, unknown>,
): number {
  const stashCount = stashEntries.reduce((sum, e) => sum + e.quantity, 0);
  const equippedCount = Object.values(equipmentSlots).filter((v) => v != null).length;
  return stashCount + equippedCount;
}
