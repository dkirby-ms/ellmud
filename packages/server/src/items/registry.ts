/**
 * Item registry — all known item definitions for the game.
 *
 * Phase 1: statically defined. When ContentRegistry is initialized (DB mode),
 * lookups delegate to it. Otherwise, falls back to the hardcoded registry.
 * Base stats are pre-rarity — computeEffectiveStats() applies tier multipliers.
 */

import type { ItemDefinition } from '@ellmud/shared';
import { getContentRegistry } from '../content/index.js';

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
  description: 'Forged from metal recovered deep within the zones.',
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
  description: 'A bleached bone from a zone creature. Crafting material.',
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
  containerProperties: {
    maxSlots: 4,
    maxWeight: 10,
  },
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
  containerProperties: {
    maxSlots: 8,
    maxWeight: 30,
    carryBonus: 5,
  },
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
  containerProperties: {
    maxSlots: 6,
    maxWeight: 8,
    allowedItemTypes: ['consumable'],
  },
};

export const MUNITIONS_WRAP: ItemDefinition = {
  id: 'munitions_wrap',
  name: 'Munitions Wrap',
  type: 'container',
  tier: 'sturdy',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: 'A length of oiled canvas, rolled tight and cinched with copper wire. Keeps blades dry and edges true.',
  soulbound: false,
  containerProperties: {
    maxSlots: 4,
    maxWeight: 20,
    allowedItemTypes: ['weapon'],
  },
};

export const IRONBOUND_COFFER: ItemDefinition = {
  id: 'ironbound_coffer',
  name: '[bold]Ironbound Coffer[reset]',
  type: 'container',
  tier: 'refined',
  baseStats: {},
  baseDurability: null,
  weight: 4,
  description: 'Heavy iron banding reinforces this salt-stained chest. Whatever it once held, it held securely. The lock has long since rusted open.',
  soulbound: false,
  containerProperties: {
    maxSlots: 10,
    maxWeight: 50,
    carryBonus: 10,
  },
};

export const SALVAGERS_HAVERSACK: ItemDefinition = {
  id: 'salvagers_haversack',
  name: "Salvager's Haversack",
  type: 'container',
  tier: 'refined',
  baseStats: {},
  baseDurability: null,
  weight: 2,
  description: 'Dozens of interior pockets, each sized for ore chunks and bone fragments. A salvager who knew their trade stitched this.',
  soulbound: false,
  containerProperties: {
    maxSlots: 12,
    maxWeight: 25,
    allowedItemTypes: ['material'],
  },
};

export const WARDENS_LOCKBOX: ItemDefinition = {
  id: 'wardens_lockbox',
  name: "[cyan]Warden's Lockbox[reset]",
  type: 'container',
  tier: 'masterwork',
  baseStats: {},
  baseDurability: null,
  weight: 3,
  description: '[dim]Rune-etched steel, cold to the touch. The interior is lined with a material that drinks light. Whatever the wardens guarded, they guarded it well.[reset]',
  soulbound: false,
  containerProperties: {
    maxSlots: 12,
    maxWeight: 60,
    carryBonus: 15,
  },
};

export const FLESHKNIT_SATCHEL: ItemDefinition = {
  id: 'fleshknit_satchel',
  name: '[magenta]Fleshknit Satchel[reset]',
  type: 'container',
  tier: 'masterwork',
  baseStats: {},
  baseDurability: null,
  weight: 1,
  description: '[dim]The leather breathes. Faintly. Stitched from something that was alive more recently than you\'d like, its interior shifts to accommodate whatever you feed it.[reset]',
  soulbound: false,
  containerProperties: {
    maxSlots: 8,
    maxWeight: 15,
    allowedItemTypes: ['consumable', 'key'],
  },
};

export const HOLLOW_OF_THE_FORGOTTEN: ItemDefinition = {
  id: 'hollow_of_the_forgotten',
  name: '[bold][yellow]Hollow of the Forgotten[reset]',
  type: 'container',
  tier: 'anomalous',
  baseStats: {},
  baseDurability: null,
  weight: 0,
  description: '[bold]It shouldn\'t be able to hold this much. The opening is no wider than your fist, yet your arm slides in to the shoulder. Things placed inside do not rattle. Things placed inside do not weigh anything at all.[reset]',
  soulbound: false,
  containerProperties: {
    maxSlots: 16,
    carryBonus: 25,
  },
};

// ─── Warrens Items ──────────────────────────────────────────────────────────

export const BENT_REBAR: ItemDefinition = {
  id: 'bent_rebar',
  name: 'Bent Rebar',
  type: 'weapon',
  tier: 'scrap',
  baseStats: { damage: 4, speed: 0.8 },
  baseDurability: 20,
  weight: 3,
  description: 'A corroded length of rebar, wrenched from a collapsed wall. One end is bent into a rough hook. Heavy, slow, and ugly — but better than bare hands.',
  soulbound: false,
};

export const SCAVENGER_SHIV: ItemDefinition = {
  id: 'scavenger_shiv',
  name: "Scavenger's Shiv",
  type: 'weapon',
  tier: 'common',
  baseStats: { damage: 7, speed: 1.2 },
  baseDurability: 30,
  weight: 2,
  description: 'A shard of plate glass, its base wrapped in copper wire for a grip. The edge is wickedly sharp but fragile.',
  soulbound: false,
};

export const RUBBLE_CRUSTED_VEST: ItemDefinition = {
  id: 'rubble_crusted_vest',
  name: 'Rubble-Crusted Vest',
  type: 'armour',
  tier: 'common',
  baseStats: { armour: 3, weight: 5 },
  baseDurability: 40,
  weight: 5,
  description: 'A padded leather vest with chunks of masonry and tile lashed to its surface. Improvised but effective.',
  soulbound: false,
};

export const TARNISHED_MEDALLION: ItemDefinition = {
  id: 'tarnished_medallion',
  name: 'Tarnished Medallion',
  type: 'material',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 0.5,
  description: 'An ornate disc of tarnished metal, stamped with a sigil that might once have been a face or a sun or a wheel.',
  soulbound: false,
};

export const GUTTERSPAWN_FANG: ItemDefinition = {
  id: 'gutterspawn_fang',
  name: 'Gutterspawn Fang',
  type: 'material',
  tier: 'scrap',
  baseStats: {},
  baseDurability: null,
  weight: 0.2,
  description: 'A hollow, yellowed fang pulled from a gutterspawn maw. The interior canal still glistens with venom.',
  soulbound: false,
};

export const SANCTUARY_KEY: ItemDefinition = {
  id: 'sanctuary_key',
  name: 'Sanctuary Key',
  type: 'key',
  tier: 'common',
  baseStats: {},
  baseDurability: null,
  weight: 0.3,
  description: 'A heavy iron key, its shaft thick with verdigris but its teeth still sharp. Fits the reinforced door between the Broken Sanctuary and the Sunken Square.',
  soulbound: false,
};

export const CHARRED_STREET_MAP: ItemDefinition = {
  id: 'charred_street_map',
  name: 'Charred Street Map',
  type: 'material',
  tier: 'sturdy',
  baseStats: {},
  baseDurability: null,
  weight: 0.5,
  description: 'A fragment of vellum, edges blackened by fire, showing a street grid that matches the ruins around you. Landmarks are annotated in a precise, alien script.',
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
  // Containers
  TATTERED_SATCHEL,
  EXPEDITION_PACK,
  APOTHECARY_POUCH,
  MUNITIONS_WRAP,
  IRONBOUND_COFFER,
  SALVAGERS_HAVERSACK,
  WARDENS_LOCKBOX,
  FLESHKNIT_SATCHEL,
  HOLLOW_OF_THE_FORGOTTEN,
  // Warrens items
  BENT_REBAR,
  SCAVENGER_SHIV,
  RUBBLE_CRUSTED_VEST,
  TARNISHED_MEDALLION,
  GUTTERSPAWN_FANG,
  SANCTUARY_KEY,
  CHARRED_STREET_MAP,
];

/** Lookup map: item ID → definition. */
export const ITEM_REGISTRY = new Map<string, ItemDefinition>(
  ALL_ITEMS.map(item => [item.id, item]),
);

export function getItemDefinition(id: string): ItemDefinition | undefined {
  const registry = getContentRegistry();
  if (registry?.isInitialized()) {
    return registry.getItem(id);
  }
  return ITEM_REGISTRY.get(id);
}

export function getAllItemDefinitions(): ItemDefinition[] {
  const registry = getContentRegistry();
  if (registry?.isInitialized()) {
    return registry.getAllItems();
  }
  return ALL_ITEMS;
}

export function getItemsByType(type: ItemDefinition['type']): ItemDefinition[] {
  return ALL_ITEMS.filter(item => item.type === type);
}

export function getItemsByTier(tier: ItemDefinition['tier']): ItemDefinition[] {
  return ALL_ITEMS.filter(item => item.tier === tier);
}
