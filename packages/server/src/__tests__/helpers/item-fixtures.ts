/**
 * Item test fixtures — shared ItemDefinition objects for item/container tests.
 *
 * These replicate the DB-seeded item definitions so unit tests can run
 * without a live ContentRegistry. Values match 002_seed_content.sql and
 * 015_container_properties.sql exactly.
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
  name: 'Rebar Machete',
  type: 'weapon',
  tier: 'common',
  baseStats: { damage: 12, speed: 1 },
  baseDurability: 50,
  weight: 6,
  description: 'A length of construction rebar, one end wrapped in electrical tape for grip, the other hammered flat and ground to a crude edge. Ugly, heavy, effective.',
  soulbound: false,
};

export const CORRODED_HALBERD: ItemDefinition = {
  id: 'corroded_halberd',
  name: 'Corroded Fire Axe',
  type: 'weapon',
  tier: 'sturdy',
  baseStats: { damage: 18, speed: 2 },
  baseDurability: 60,
  weight: 12,
  description: 'A pre-extinction fire axe, its red paint long gone, its handle wrapped in waterlogged leather. The blade is pitted with rust but the weight behind it is still lethal. Someone etched tally marks into the haft.',
  soulbound: false,
};

export const VOIDFORGED_BLADE: ItemDefinition = {
  id: 'voidforged_blade',
  name: 'Drone-Core Blade',
  type: 'weapon',
  tier: 'anomalous',
  baseStats: { damage: 20, speed: 1 },
  baseDurability: 120,
  weight: 4,
  description: 'A blade forged from the alloy core of a military drone\'s reactor housing.',
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
  name: 'Scrap-Weave Vest',
  type: 'armour',
  tier: 'common',
  baseStats: { armour: 6, weight: 15 },
  baseDurability: 50,
  weight: 15,
  description: 'A vest stitched together from overlapping strips of salvaged sheet metal.',
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
  description: 'A thick, green paste sealed in a scavenged jar.',
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

// ─── Materials ──────────────────────────────────────────────────────────────

export const REVENANT_BONE: ItemDefinition = {
  id: 'revenant_bone',
  name: 'Revenant Bone',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A bleached bone from a dungeon creature. Crafting material.',
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

// ─── Containers ─────────────────────────────────────────────────────────────

export const TATTERED_SATCHEL: ItemDefinition = {
  id: 'tattered_satchel',
  name: 'Tattered Satchel',
  type: 'container',
  tier: 'scrap',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'A worn leather satchel with fraying straps. Holds a few small items.',
  soulbound: false,
  containerProperties: { maxSlots: 4, maxWeight: 10 },
};

export const EXPEDITION_PACK: ItemDefinition = {
  id: 'expedition_pack',
  name: 'Expedition Pack',
  type: 'container',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'A sturdy canvas pack issued to expeditioners. Increases carrying capacity.',
  soulbound: false,
  containerProperties: { maxSlots: 8, maxWeight: 30, carryBonus: 5 },
};

export const APOTHECARY_POUCH: ItemDefinition = {
  id: 'apothecary_pouch',
  name: "Apothecary's Pouch",
  type: 'container',
  tier: 'sturdy',
  baseStats: {},
  baseDurability: null,
  weight: 0.5,
  description: 'A small padded pouch designed for carrying potions and salves safely.',
  soulbound: false,
  containerProperties: { maxSlots: 6, maxWeight: 8, allowedItemTypes: ['consumable'] },
};

// ─── Aggregate ──────────────────────────────────────────────────────────────

export const ALL_FIXTURE_ITEMS: ItemDefinition[] = [
  RUSTY_BLADE, IRON_SWORD, CORRODED_HALBERD, VOIDFORGED_BLADE,
  TATTERED_LEATHER, IRON_CHAINMAIL,
  WATERLOGGED_POTION, HEALING_DRAUGHT, STAMINA_TONIC,
  REVENANT_BONE,
  CRYPT_KEY_FRAGMENT,
  TATTERED_SATCHEL, EXPEDITION_PACK, APOTHECARY_POUCH,
];

export function buildFixtureRegistry(): Map<string, ItemDefinition> {
  return new Map(ALL_FIXTURE_ITEMS.map(i => [i.id, i]));
}
