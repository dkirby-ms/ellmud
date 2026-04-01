/**
 * Seed item catalog — development & test items covering all equipment slots,
 * rarity tiers, shard keys, consumables, and stash-only materials.
 *
 * ~40 items. Enough to fill a stash, test every loadout slot, and push
 * against weight capacity (default 200). Every word earns its place.
 *
 * Usage:
 *   import { SEED_ITEMS, seedItemDefs, populateDevStash } from './seed-items.js';
 */

import type { StashItem, StashItemInstance, GearTier } from '@ellmud/shared';

// ─── Weapons (slot: weapon) ─────────────────────────────────────────────────

export const RUSTY_SHIV: StashItem = {
  id: 'rusty-shiv',
  name: 'Rusty Shiv',
  type: 'weapon',
  weight: 2,
  rarity: 'scrap',
  description: 'A jagged shard of metal wrapped in sinew. Better than bare fists.',
  baseDurability: 20,
};

export const ASH_FORGED_AXE: StashItem = {
  id: 'ash-forged-axe',
  name: 'Ash-Forged Axe',
  type: 'weapon',
  weight: 7,
  rarity: 'common',
  description: 'A heavy hatchet blackened by cinder. Splits bone and wood alike.',
  baseDurability: 45,
};

export const BONECLEAVER: StashItem = {
  id: 'bonecleaver',
  name: 'Bonecleaver',
  type: 'weapon',
  weight: 9,
  rarity: 'sturdy',
  description: 'A brutal falchion edged with riveted bone. It does not cut clean.',
  baseDurability: 60,
};

export const SHARDSTEEL_GLAIVE: StashItem = {
  id: 'shardsteel-glaive',
  name: 'Shardsteel Glaive',
  type: 'weapon',
  weight: 10,
  rarity: 'refined',
  description: 'A polearm of shard-infused metal. Hums faintly in the dark.',
  baseDurability: 80,
};

export const THE_PALE_EDGE: StashItem = {
  id: 'the-pale-edge',
  name: 'The Pale Edge',
  type: 'weapon',
  weight: 5,
  rarity: 'masterwork',
  description: 'A longsword white as drowned bone. The edge never dulls.',
  baseDurability: 120,
};

export const ENTROPYS_MAW: StashItem = {
  id: 'entropys-maw',
  name: "Entropy's Maw",
  type: 'weapon',
  weight: 4,
  rarity: 'anomalous',
  description: 'A blade that unravels what it touches. Looking at it hurts.',
  baseDurability: 150,
};

// ─── Armour — Head (slot: head) ─────────────────────────────────────────────

export const DENTED_SKULLCAP: StashItem = {
  id: 'dented-skullcap',
  name: 'Dented Skullcap',
  type: 'armour',
  weight: 3,
  rarity: 'scrap',
  description: 'A bent iron cap. Stops one hit, maybe two.',
  baseDurability: 20,
};

export const IRON_CASQUE: StashItem = {
  id: 'iron-casque',
  name: 'Iron Casque',
  type: 'armour',
  weight: 5,
  rarity: 'common',
  description: 'Standard helm with a narrow visor. Limits sight, saves skulls.',
  baseDurability: 40,
};

export const WARDENS_HALFHELM: StashItem = {
  id: 'wardens-halfhelm',
  name: "Warden's Halfhelm",
  type: 'armour',
  weight: 6,
  rarity: 'sturdy',
  description: 'Open-faced helm from the old Refuge guard. Still bears their crest.',
  baseDurability: 55,
};

// ─── Armour — Chest (slot: chest) ───────────────────────────────────────────

export const SCAVENGERS_VEST: StashItem = {
  id: 'scavengers-vest',
  name: "Scavenger's Vest",
  type: 'armour',
  weight: 6,
  rarity: 'scrap',
  description: 'Layers of scrap leather stitched over rags. Smells of rot.',
  baseDurability: 25,
};

export const BOILED_LEATHER_CUIRASS: StashItem = {
  id: 'boiled-leather-cuirass',
  name: 'Boiled Leather Cuirass',
  type: 'armour',
  weight: 12,
  rarity: 'common',
  description: 'Hardened leather torso armour. Reliable, if unlovely.',
  baseDurability: 50,
};

export const SHARDWEAVE_HAUBERK: StashItem = {
  id: 'shardweave-hauberk',
  name: 'Shardweave Hauberk',
  type: 'armour',
  weight: 14,
  rarity: 'refined',
  description: 'Chain links woven with shard-metal threads. Light for its strength.',
  baseDurability: 75,
};

// ─── Armour — Legs (slot: legs) ─────────────────────────────────────────────

export const PATCHED_BREECHES: StashItem = {
  id: 'patched-breeches',
  name: 'Patched Breeches',
  type: 'armour',
  weight: 3,
  rarity: 'scrap',
  description: 'More patch than cloth. They hold together, mostly.',
  baseDurability: 15,
};

export const CHAINMAIL_GREAVES: StashItem = {
  id: 'chainmail-greaves',
  name: 'Chainmail Greaves',
  type: 'armour',
  weight: 8,
  rarity: 'common',
  description: 'Chain leggings buckled over padded linen.',
  baseDurability: 45,
};

export const MASTERWORK_CUISSES: StashItem = {
  id: 'masterwork-cuisses',
  name: 'Masterwork Cuisses',
  type: 'armour',
  weight: 10,
  rarity: 'masterwork',
  description: 'Articulated thigh plates of flawless craft. Move like a second skin.',
  baseDurability: 100,
};

// ─── Armour — Feet (slot: feet) ─────────────────────────────────────────────

export const RAG_WRAPPED_BOOTS: StashItem = {
  id: 'rag-wrapped-boots',
  name: 'Rag-Wrapped Boots',
  type: 'armour',
  weight: 2,
  rarity: 'scrap',
  description: 'Strips of cloth over cracked soles. Better than barefoot in the zones.',
  baseDurability: 10,
};

export const IRONSHOD_TREADS: StashItem = {
  id: 'ironshod-treads',
  name: 'Ironshod Treads',
  type: 'armour',
  weight: 5,
  rarity: 'common',
  description: 'Sturdy boots with iron-capped toes. Good on wet stone.',
  baseDurability: 40,
};

export const VOIDWALKER_SABATONS: StashItem = {
  id: 'voidwalker-sabatons',
  name: 'Voidwalker Sabatons',
  type: 'armour',
  weight: 4,
  rarity: 'anomalous',
  description: 'Footwear from beyond the collapse. They leave no prints.',
  baseDurability: 130,
};

// ─── Armour — Hands (slot: hands) ───────────────────────────────────────────

export const FINGERLESS_WRAPS: StashItem = {
  id: 'fingerless-wraps',
  name: 'Fingerless Wraps',
  type: 'armour',
  weight: 1,
  rarity: 'scrap',
  description: 'Frayed linen wound tight around the knuckles.',
  baseDurability: 10,
};

export const RIVETED_GAUNTLETS: StashItem = {
  id: 'riveted-gauntlets',
  name: 'Riveted Gauntlets',
  type: 'armour',
  weight: 4,
  rarity: 'common',
  description: 'Iron-studded leather gloves. Grip like a vice.',
  baseDurability: 35,
};

export const FLAYED_HIDE_GRIPS: StashItem = {
  id: 'flayed-hide-grips',
  name: 'Flayed-Hide Grips',
  type: 'armour',
  weight: 3,
  rarity: 'sturdy',
  description: 'Cured from something that once lived in the zones. Supple and warm.',
  baseDurability: 50,
};

// ─── Tools & Offhand Weapons (slot: offhand) ────────────────────────────────

export const RUSTED_LANTERN: StashItem = {
  id: 'rusted-lantern',
  name: 'Rusted Lantern',
  type: 'tool',
  weight: 3,
  rarity: 'common',
  description: 'A battered oil lantern. Throws weak light but it beats the dark.',
  baseDurability: 30,
};

export const IRON_BUCKLER: StashItem = {
  id: 'iron-buckler',
  name: 'Iron Buckler',
  type: 'tool',
  weight: 6,
  rarity: 'sturdy',
  description: 'A small round shield. Won\'t stop a halberd, but deflects the rest.',
  baseDurability: 55,
};

export const BONE_STILETTO: StashItem = {
  id: 'bone-stiletto',
  name: 'Bone Stiletto',
  type: 'weapon',
  weight: 1,
  rarity: 'common',
  description: 'A needle of sharpened femur. Offhand favourite of the desperate.',
  baseDurability: 25,
};

// ─── Materials — Rings (slot: ring1, ring2) ─────────────────────────────────

export const TARNISHED_BAND: StashItem = {
  id: 'tarnished-band',
  name: 'Tarnished Band',
  type: 'material',
  weight: 0.5,
  rarity: 'scrap',
  description: 'A corroded ring of unknown metal. Might be copper. Might be worse.',
  baseDurability: null,
};

export const WHISPERING_RING: StashItem = {
  id: 'whispering-ring',
  name: 'Whispering Ring',
  type: 'material',
  weight: 0.5,
  rarity: 'sturdy',
  description: 'Faint voices leak from the stone. You learn to ignore them.',
  baseDurability: null,
};

export const BLIGHTSTONE_RING: StashItem = {
  id: 'blightstone-ring',
  name: 'Blightstone Ring',
  type: 'material',
  weight: 0.5,
  rarity: 'refined',
  description: 'Cut from cursed quartzite. Warm to the touch, always.',
  baseDurability: null,
};

// ─── Materials — Amulets (slot: amulet) ─────────────────────────────────────

export const HOLLOW_EYE_PENDANT: StashItem = {
  id: 'hollow-eye-pendant',
  name: 'Hollow-Eye Pendant',
  type: 'material',
  weight: 1,
  rarity: 'common',
  description: 'A bone disc with a hole bored through centre. Ward against the deep.',
  baseDurability: null,
};

export const SHARD_TOUCHED_MEDALLION: StashItem = {
  id: 'shard-touched-medallion',
  name: 'Shard-Touched Medallion',
  type: 'material',
  weight: 1,
  rarity: 'masterwork',
  description: 'Metal fused with crystallised shard-energy. Pulses like a heartbeat.',
  baseDurability: null,
};

// ─── Zone Keys ─────────────────────────────────────────────────────────────

export const BONE_SHARD_KEY: StashItem = {
  id: 'bone-shard-key',
  name: 'Bone Zone Key',
  type: 'key',
  weight: 1,
  rarity: 'common',
  description: 'A key carved from revenant bone. Opens Tier 1 zones.',
  baseDurability: null,
};

export const IRON_SHARD_KEY: StashItem = {
  id: 'iron-shard-key',
  name: 'Iron Zone Key',
  type: 'key',
  weight: 1,
  rarity: 'sturdy',
  description: 'A blackened iron key etched with shard-glyphs. Opens Tier 2 zones.',
  baseDurability: null,
};

export const CRYSTAL_SHARD_KEY: StashItem = {
  id: 'crystal-shard-key',
  name: 'Crystal Zone Key',
  type: 'key',
  weight: 1,
  rarity: 'refined',
  description: 'A translucent key that refracts light wrong. Opens Tier 3 zones.',
  baseDurability: null,
};

// ─── Consumables ────────────────────────────────────────────────────────────

export const STALE_RATION: StashItem = {
  id: 'stale-ration',
  name: 'Stale Ration',
  type: 'consumable',
  weight: 1,
  rarity: 'scrap',
  description: 'Hard bread and salt meat. Tastes like regret. Heals a little.',
  baseDurability: null,
};

export const BLACKMOSS_SALVE: StashItem = {
  id: 'blackmoss-salve',
  name: 'Blackmoss Salve',
  type: 'consumable',
  weight: 1,
  rarity: 'common',
  description: 'A poultice brewed from shard-grown moss. Stings, but mends flesh.',
  baseDurability: null,
};

export const BOTTLED_VIGOUR: StashItem = {
  id: 'bottled-vigour',
  name: 'Bottled Vigour',
  type: 'consumable',
  weight: 1,
  rarity: 'sturdy',
  description: 'Amber liquid that burns going down. Restores stamina fast.',
  baseDurability: null,
};

export const ELIXIR_OF_MENDING: StashItem = {
  id: 'elixir-of-mending',
  name: 'Elixir of Mending',
  type: 'consumable',
  weight: 2,
  rarity: 'refined',
  description: 'A rare draught from Refuge alchemists. Knits wounds shut in seconds.',
  baseDurability: null,
};

// ─── Stash-Only Materials (crafting, junk, bulk) ────────────────────────────

export const CORRODED_NAILS: StashItem = {
  id: 'corroded-nails',
  name: 'Corroded Nails',
  type: 'material',
  weight: 1,
  rarity: 'scrap',
  description: 'A fistful of bent nails scavenged from a collapsed doorframe.',
  baseDurability: null,
};

export const REVENANT_MARROW: StashItem = {
  id: 'revenant-marrow',
  name: 'Revenant Marrow',
  type: 'material',
  weight: 2,
  rarity: 'common',
  description: 'Viscous black marrow from a zone creature. Alchemists pay well.',
  baseDurability: null,
};

export const VOID_RESIDUE: StashItem = {
  id: 'void-residue',
  name: 'Void Residue',
  type: 'material',
  weight: 1,
  rarity: 'anomalous',
  description: 'A shimmering dust that floats upward. Handle with extreme care.',
  baseDurability: null,
};

export const WATERLOGGED_CRATE: StashItem = {
  id: 'waterlogged-crate',
  name: 'Waterlogged Crate',
  type: 'material',
  weight: 40,
  rarity: 'scrap',
  description: 'A heavy salvage crate. Contents unknown. Too stubborn to abandon.',
  baseDurability: null,
};

// ─── Full Catalog ───────────────────────────────────────────────────────────

export const SEED_ITEMS: readonly StashItem[] = [
  // Weapons
  RUSTY_SHIV,
  ASH_FORGED_AXE,
  BONECLEAVER,
  SHARDSTEEL_GLAIVE,
  THE_PALE_EDGE,
  ENTROPYS_MAW,
  // Head armour
  DENTED_SKULLCAP,
  IRON_CASQUE,
  WARDENS_HALFHELM,
  // Chest armour
  SCAVENGERS_VEST,
  BOILED_LEATHER_CUIRASS,
  SHARDWEAVE_HAUBERK,
  // Legs armour
  PATCHED_BREECHES,
  CHAINMAIL_GREAVES,
  MASTERWORK_CUISSES,
  // Feet armour
  RAG_WRAPPED_BOOTS,
  IRONSHOD_TREADS,
  VOIDWALKER_SABATONS,
  // Hands armour
  FINGERLESS_WRAPS,
  RIVETED_GAUNTLETS,
  FLAYED_HIDE_GRIPS,
  // Offhand (tools + weapon)
  RUSTED_LANTERN,
  IRON_BUCKLER,
  BONE_STILETTO,
  // Rings
  TARNISHED_BAND,
  WHISPERING_RING,
  BLIGHTSTONE_RING,
  // Amulets
  HOLLOW_EYE_PENDANT,
  SHARD_TOUCHED_MEDALLION,
  // Shard keys
  BONE_SHARD_KEY,
  IRON_SHARD_KEY,
  CRYSTAL_SHARD_KEY,
  // Consumables
  STALE_RATION,
  BLACKMOSS_SALVE,
  BOTTLED_VIGOUR,
  ELIXIR_OF_MENDING,
  // Materials / Junk
  CORRODED_NAILS,
  REVENANT_MARROW,
  VOID_RESIDUE,
  WATERLOGGED_CRATE,
] as const;

/** Lookup map: item ID → StashItem definition. */
export function seedItemDefs(): Map<string, StashItem> {
  return new Map(SEED_ITEMS.map((item) => [item.id, item]));
}

// ─── Instance Factory ───────────────────────────────────────────────────────

let seedInstanceCounter = 0;

/** Create a StashItemInstance from a seed item definition. */
export function createSeedInstance(item: StashItem, suffix?: string): StashItemInstance {
  seedInstanceCounter++;
  return {
    instanceId: suffix ? `${item.id}-${suffix}` : `${item.id}-seed-${seedInstanceCounter}`,
    itemId: item.id,
    durability: item.baseDurability,
    maxDurability: item.baseDurability,
  };
}

/** Reset the instance counter (useful between test runs). */
export function resetSeedCounter(): void {
  seedInstanceCounter = 0;
}

// ─── Dev Stash Population ───────────────────────────────────────────────────

/**
 * Populate a player's stash with the full seed catalog.
 * Returns the total weight added (for capacity testing).
 *
 * Pass `includeOverweight: true` to also add bulk items that push past
 * the default 200-weight capacity — useful for testing rejection flows.
 */
export async function populateDevStash(
  repo: {
    addItem(playerId: string, instance: StashItemInstance, quantity?: number): Promise<void>;
  },
  playerId: string,
  options: { includeOverweight?: boolean } = {},
): Promise<{ totalWeight: number; itemCount: number }> {
  resetSeedCounter();

  const overweightIds = new Set(['waterlogged-crate']);
  let totalWeight = 0;
  let itemCount = 0;

  for (const item of SEED_ITEMS) {
    if (!options.includeOverweight && overweightIds.has(item.id)) continue;

    const instance = createSeedInstance(item);
    await repo.addItem(playerId, instance, 1);
    totalWeight += item.weight;
    itemCount++;
  }

  // Add a few stackables for quantity testing
  const nailsInstance = createSeedInstance(CORRODED_NAILS, 'stack');
  await repo.addItem(playerId, nailsInstance, 5);
  totalWeight += CORRODED_NAILS.weight * 5;
  itemCount += 5;

  const rationInstance = createSeedInstance(STALE_RATION, 'stack');
  await repo.addItem(playerId, rationInstance, 3);
  totalWeight += STALE_RATION.weight * 3;
  itemCount += 3;

  return { totalWeight, itemCount };
}

// ─── Slot-Specific Helpers ──────────────────────────────────────────────────

/** Get seed items that fit a given equipment slot, for targeted testing. */
export function getSeedItemsForSlot(slot: string): StashItem[] {
  const slotItemMap: Record<string, StashItem[]> = {
    weapon: [RUSTY_SHIV, ASH_FORGED_AXE, BONECLEAVER, SHARDSTEEL_GLAIVE, THE_PALE_EDGE, ENTROPYS_MAW],
    head: [DENTED_SKULLCAP, IRON_CASQUE, WARDENS_HALFHELM],
    chest: [SCAVENGERS_VEST, BOILED_LEATHER_CUIRASS, SHARDWEAVE_HAUBERK],
    legs: [PATCHED_BREECHES, CHAINMAIL_GREAVES, MASTERWORK_CUISSES],
    feet: [RAG_WRAPPED_BOOTS, IRONSHOD_TREADS, VOIDWALKER_SABATONS],
    hands: [FINGERLESS_WRAPS, RIVETED_GAUNTLETS, FLAYED_HIDE_GRIPS],
    offhand: [RUSTED_LANTERN, IRON_BUCKLER, BONE_STILETTO],
    ring1: [TARNISHED_BAND, WHISPERING_RING, BLIGHTSTONE_RING],
    ring2: [TARNISHED_BAND, WHISPERING_RING, BLIGHTSTONE_RING],
    amulet: [HOLLOW_EYE_PENDANT, SHARD_TOUCHED_MEDALLION],
  };
  return slotItemMap[slot] ?? [];
}

/** Get seed items by rarity tier. */
export function getSeedItemsByTier(tier: GearTier): StashItem[] {
  return SEED_ITEMS.filter((item) => item.rarity === tier);
}
