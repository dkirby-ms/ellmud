/**
 * Item registry — all known item definitions for the game.
 *
 * Phase 1: statically defined. Future phases load from DB.
 * Base stats are pre-rarity — computeEffectiveStats() applies tier multipliers.
 */

import type { ItemDefinition } from '@ellmud/shared';

// ─── Weapons ────────────────────────────────────────────────────────────────

export const RUSTY_BLADE: ItemDefinition = {
  id: 'rusty_blade',
  name: 'Rusty Blade',
  type: 'weapon',
  tier: 'scrap',
  baseStats: { damage: 8, speed: 1 },
  baseDurability: 30,
  weight: 5,
  description: 'A corroded shortsword. It cuts, barely.',
  soulbound: false,
};

export const IRON_SWORD: ItemDefinition = {
  id: 'iron_sword',
  name: 'Iron Sword',
  type: 'weapon',
  tier: 'common',
  baseStats: { damage: 12, speed: 1 },
  baseDurability: 50,
  weight: 6,
  description: 'A serviceable blade of hammered iron.',
  soulbound: false,
};

export const CORRODED_HALBERD: ItemDefinition = {
  id: 'corroded_halberd',
  name: 'Corroded Halberd',
  type: 'weapon',
  tier: 'sturdy',
  baseStats: { damage: 18, speed: 2 },
  baseDurability: 60,
  weight: 12,
  description: 'A polearm eaten by salt water, still dangerous.',
  soulbound: false,
};

export const SHARDSTEEL_SABRE: ItemDefinition = {
  id: 'shardsteel_sabre',
  name: 'Shardsteel Sabre',
  type: 'weapon',
  tier: 'refined',
  baseStats: { damage: 16, speed: 1 },
  baseDurability: 80,
  weight: 5,
  description: 'Forged from metal recovered deep within the shards.',
  soulbound: false,
};

export const VOIDFORGED_BLADE: ItemDefinition = {
  id: 'voidforged_blade',
  name: 'Voidforged Blade',
  type: 'weapon',
  tier: 'anomalous',
  baseStats: { damage: 20, speed: 1 },
  baseDurability: 120,
  weight: 4,
  description: 'A blade that shimmers between planes. Disturbingly light.',
  soulbound: false,
};

// ─── Armour ─────────────────────────────────────────────────────────────────

export const TATTERED_LEATHER: ItemDefinition = {
  id: 'tattered_leather',
  name: 'Tattered Leather',
  type: 'armour',
  tier: 'scrap',
  baseStats: { armour: 3, weight: 8 },
  baseDurability: 25,
  weight: 8,
  description: 'Barely held together with sinew and hope.',
  soulbound: false,
};

export const IRON_CHAINMAIL: ItemDefinition = {
  id: 'iron_chainmail',
  name: 'Iron Chainmail',
  type: 'armour',
  tier: 'common',
  baseStats: { armour: 6, weight: 15 },
  baseDurability: 50,
  weight: 15,
  description: 'Standard-issue chain links. Heavy but reliable.',
  soulbound: false,
};

export const CORRODED_SHIELD: ItemDefinition = {
  id: 'corroded_shield',
  name: 'Corroded Shield',
  type: 'armour',
  tier: 'scrap',
  baseStats: { armour: 4, weight: 10 },
  baseDurability: 20,
  weight: 10,
  description: 'A round shield covered in barnacles and rust.',
  soulbound: false,
};

export const REINFORCED_PLATE: ItemDefinition = {
  id: 'reinforced_plate',
  name: 'Reinforced Plate',
  type: 'armour',
  tier: 'sturdy',
  baseStats: { armour: 10, weight: 25 },
  baseDurability: 70,
  weight: 25,
  description: 'Thick plating bolted over hardened leather.',
  soulbound: false,
};

// ─── Consumables ────────────────────────────────────────────────────────────

export const WATERLOGGED_POTION: ItemDefinition = {
  id: 'waterlogged_potion',
  name: 'Waterlogged Potion',
  type: 'consumable',
  tier: 'scrap',
  baseStats: { heal: 20 },
  baseDurability: null,
  weight: 1,
  description: 'Murky liquid in a cracked flask. Probably drinkable.',
  soulbound: false,
};

export const HEALING_DRAUGHT: ItemDefinition = {
  id: 'healing_draught',
  name: 'Healing Draught',
  type: 'consumable',
  tier: 'common',
  baseStats: { heal: 40 },
  baseDurability: null,
  weight: 1,
  description: 'A reliable potion brewed in the Refuge.',
  soulbound: false,
};

export const STAMINA_TONIC: ItemDefinition = {
  id: 'stamina_tonic',
  name: 'Stamina Tonic',
  type: 'consumable',
  tier: 'common',
  baseStats: { staminaRestore: 30, duration: 5 },
  baseDurability: null,
  weight: 1,
  description: 'A bitter brew that quickens the limbs.',
  soulbound: false,
};

// ─── Materials (non-degradable, used for crafting) ──────────────────────────

export const REVENANT_BONE: ItemDefinition = {
  id: 'revenant_bone',
  name: 'Revenant Bone',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A bleached bone from a shard creature. Crafting material.',
  soulbound: false,
};

export const SHARDSTEEL_SHARD: ItemDefinition = {
  id: 'shardsteel_shard',
  name: 'Shardsteel Shard',
  type: 'material',
  tier: 'sturdy',
  baseStats: {},
  baseDurability: null,
  weight: 3,
  description: 'A fragment of metal infused with shard energy.',
  soulbound: false,
};

export const SODDEN_SCROLL: ItemDefinition = {
  id: 'sodden_scroll',
  name: 'Sodden Scroll',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'Barely legible parchment. Might be useful to scholars.',
  soulbound: false,
};

export const TARNISHED_AMULET: ItemDefinition = {
  id: 'tarnished_amulet',
  name: 'Tarnished Amulet',
  type: 'material',
  tier: 'sturdy',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'A faded trinket with faint inscriptions.',
  soulbound: false,
};

export const DROWNED_OFFERING: ItemDefinition = {
  id: 'drowned_offering',
  name: 'Drowned Offering',
  type: 'material',
  tier: 'refined',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A ritualistic token left at submerged altars.',
  soulbound: false,
};

// ─── Keys ───────────────────────────────────────────────────────────────────

export const CRYPT_KEY_FRAGMENT: ItemDefinition = {
  id: 'crypt_key_fragment',
  name: 'Crypt Key Fragment',
  type: 'key',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'Part of a shattered key. Collect all fragments to unlock deeper crypts.',
  soulbound: false,
};

// ─── Registry ───────────────────────────────────────────────────────────────

const ALL_ITEMS: ItemDefinition[] = [
  RUSTY_BLADE,
  IRON_SWORD,
  CORRODED_HALBERD,
  SHARDSTEEL_SABRE,
  VOIDFORGED_BLADE,
  TATTERED_LEATHER,
  IRON_CHAINMAIL,
  CORRODED_SHIELD,
  REINFORCED_PLATE,
  WATERLOGGED_POTION,
  HEALING_DRAUGHT,
  STAMINA_TONIC,
  REVENANT_BONE,
  SHARDSTEEL_SHARD,
  SODDEN_SCROLL,
  TARNISHED_AMULET,
  DROWNED_OFFERING,
  CRYPT_KEY_FRAGMENT,
];

/** Lookup map: item ID → definition. */
export const ITEM_REGISTRY = new Map<string, ItemDefinition>(
  ALL_ITEMS.map(item => [item.id, item]),
);

export function getItemDefinition(id: string): ItemDefinition | undefined {
  return ITEM_REGISTRY.get(id);
}

export function getAllItemDefinitions(): ItemDefinition[] {
  return ALL_ITEMS;
}

export function getItemsByType(type: ItemDefinition['type']): ItemDefinition[] {
  return ALL_ITEMS.filter(item => item.type === type);
}

export function getItemsByTier(tier: ItemDefinition['tier']): ItemDefinition[] {
  return ALL_ITEMS.filter(item => item.tier === tier);
}
