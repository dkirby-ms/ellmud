/**
 * Item system types — shared between server and client.
 *
 * Defines the item schema, gear stats, rarity tiers, durability,
 * loadout structure, and loot drop interfaces.
 *
 * GDD §7.2 Gear, §7.3 Stash & Loadout
 */

// GearTier is defined in index.ts — we duplicate the type here to avoid
// circular dependency (index.ts re-exports from this file).
type GearTier =
  | 'scrap'
  | 'common'
  | 'sturdy'
  | 'refined'
  | 'masterwork'
  | 'anomalous';

// ─── Item Types ──────────────────────────────────────────────────────────────

export type ItemType =
  | 'weapon'
  | 'armour'
  | 'consumable'
  | 'material'
  | 'tool'
  | 'key';

// ─── Item Stats ──────────────────────────────────────────────────────────────

export interface WeaponStats {
  damage: number;
  speed: number;    // ticks between strikes (lower = faster)
}

export interface ArmourStats {
  armour: number;
  weight: number;   // heavier armour = more encumbrance
}

export interface ConsumableStats {
  heal?: number;
  staminaRestore?: number;
  duration?: number; // ticks the effect lasts
}

/** Union of all stat shapes, keyed by item type. */
export type ItemStats = WeaponStats | ArmourStats | ConsumableStats | Record<string, never>;

// ─── Rarity Tier Configuration ──────────────────────────────────────────────

export interface RarityConfig {
  tier: GearTier;
  /** Stat multiplier applied to base stats. */
  statMultiplier: number;
  /** Max durability multiplier (higher tier = more durable). */
  durabilityMultiplier: number;
  /** Relative drop weight (lower = rarer). */
  dropWeight: number;
}

/** Rarity configs ordered ascending. */
export const RARITY_TIERS: readonly RarityConfig[] = [
  { tier: 'scrap',       statMultiplier: 0.6,  durabilityMultiplier: 0.5, dropWeight: 40 },
  { tier: 'common',      statMultiplier: 1.0,  durabilityMultiplier: 1.0, dropWeight: 30 },
  { tier: 'sturdy',      statMultiplier: 1.2,  durabilityMultiplier: 1.3, dropWeight: 15 },
  { tier: 'refined',     statMultiplier: 1.5,  durabilityMultiplier: 1.6, dropWeight: 10 },
  { tier: 'masterwork',  statMultiplier: 1.8,  durabilityMultiplier: 2.0, dropWeight: 4 },
  { tier: 'anomalous',   statMultiplier: 2.5,  durabilityMultiplier: 3.0, dropWeight: 1 },
] as const;

export function getRarityConfig(tier: GearTier): RarityConfig {
  return RARITY_TIERS.find(r => r.tier === tier)!;
}

/** Ordered tier list for comparison. */
export const GEAR_TIER_ORDER: readonly GearTier[] = [
  'scrap', 'common', 'sturdy', 'refined', 'masterwork', 'anomalous',
] as const;

export function compareTiers(a: GearTier, b: GearTier): number {
  return GEAR_TIER_ORDER.indexOf(a) - GEAR_TIER_ORDER.indexOf(b);
}

// ─── Item Definition (template for all items of a kind) ─────────────────────

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  tier: GearTier;
  baseStats: ItemStats;
  /** Base durability before tier multiplier. Null for non-degradable (materials, keys). */
  baseDurability: number | null;
  weight: number;
  description: string;
  soulbound: boolean;
}

// ─── Item Instance (a specific item in a stash or loadout) ──────────────────

export interface ItemInstance {
  instanceId: string;
  definitionId: string;
  /** Current durability. Null if item type has no durability. */
  durability: number | null;
  /** Max durability (tier-adjusted). */
  maxDurability: number | null;
}

// ─── Computed Stats (after rarity multiplier) ───────────────────────────────

export function computeEffectiveStats(def: ItemDefinition): ItemStats {
  const rarity = getRarityConfig(def.tier);
  const mult = rarity.statMultiplier;

  if (def.type === 'weapon') {
    const base = def.baseStats as WeaponStats;
    return { damage: Math.floor(base.damage * mult), speed: base.speed };
  }
  if (def.type === 'armour') {
    const base = def.baseStats as ArmourStats;
    return { armour: Math.floor(base.armour * mult), weight: base.weight };
  }
  if (def.type === 'consumable') {
    const base = def.baseStats as ConsumableStats;
    return {
      ...(base.heal != null ? { heal: Math.floor(base.heal * mult) } : {}),
      ...(base.staminaRestore != null ? { staminaRestore: Math.floor(base.staminaRestore * mult) } : {}),
      ...(base.duration != null ? { duration: base.duration } : {}),
    };
  }

  return {};
}

export function computeMaxDurability(def: ItemDefinition): number | null {
  if (def.baseDurability == null) return null;
  const rarity = getRarityConfig(def.tier);
  return Math.floor(def.baseDurability * rarity.durabilityMultiplier);
}

/** Create a fresh item instance from a definition. */
export function createItemInstance(def: ItemDefinition, instanceId: string): ItemInstance {
  const maxDur = computeMaxDurability(def);
  return {
    instanceId,
    definitionId: def.id,
    durability: maxDur,
    maxDurability: maxDur,
  };
}

// ─── Durability ─────────────────────────────────────────────────────────────

/** Deplete durability by amount. Returns updated instance (immutable). */
export function depleteDurability(item: ItemInstance, amount: number): ItemInstance {
  if (item.durability == null) return item;
  return {
    ...item,
    durability: Math.max(0, item.durability - amount),
  };
}

export function isBroken(item: ItemInstance): boolean {
  return item.durability != null && item.durability <= 0;
}

// ─── Loadout ────────────────────────────────────────────────────────────────

export interface Loadout {
  weapon: ItemInstance | null;
  armour: ItemInstance | null;
  consumables: ItemInstance[];
}

/** Maximum total weight a player can carry in a loadout. */
export const MAX_LOADOUT_WEIGHT = 100;
/** Maximum consumable slots. */
export const MAX_CONSUMABLE_SLOTS = 5;

export interface LoadoutValidationResult {
  valid: boolean;
  errors: string[];
}

/** Resolve weight of an item instance given a definition lookup. */
export function getItemWeight(instance: ItemInstance, defs: Map<string, ItemDefinition>): number {
  const def = defs.get(instance.definitionId);
  return def?.weight ?? 0;
}

/** Calculate total loadout weight. */
export function calculateLoadoutWeight(
  loadout: Loadout,
  defs: Map<string, ItemDefinition>,
): number {
  let total = 0;
  if (loadout.weapon) total += getItemWeight(loadout.weapon, defs);
  if (loadout.armour) total += getItemWeight(loadout.armour, defs);
  for (const c of loadout.consumables) total += getItemWeight(c, defs);
  return total;
}

/** Validate a loadout for zone entry. */
export function validateLoadout(
  loadout: Loadout,
  defs: Map<string, ItemDefinition>,
): LoadoutValidationResult {
  const errors: string[] = [];

  // Check weapon type
  if (loadout.weapon) {
    const def = defs.get(loadout.weapon.definitionId);
    if (!def) {
      errors.push('Weapon definition not found');
    } else if (def.type !== 'weapon') {
      errors.push(`${def.name} is not a weapon`);
    } else if (isBroken(loadout.weapon)) {
      errors.push(`${def.name} is broken and cannot be equipped`);
    }
  }

  // Check armour type
  if (loadout.armour) {
    const def = defs.get(loadout.armour.definitionId);
    if (!def) {
      errors.push('Armour definition not found');
    } else if (def.type !== 'armour') {
      errors.push(`${def.name} is not armour`);
    } else if (isBroken(loadout.armour)) {
      errors.push(`${def.name} is broken and cannot be equipped`);
    }
  }

  // Check consumable slots
  if (loadout.consumables.length > MAX_CONSUMABLE_SLOTS) {
    errors.push(`Too many consumables: ${loadout.consumables.length}/${MAX_CONSUMABLE_SLOTS}`);
  }

  // Validate each consumable
  for (const c of loadout.consumables) {
    const def = defs.get(c.definitionId);
    if (!def) {
      errors.push('Consumable definition not found');
    } else if (def.type !== 'consumable') {
      errors.push(`${def.name} is not a consumable`);
    }
  }

  // Weight check
  const totalWeight = calculateLoadoutWeight(loadout, defs);
  if (totalWeight > MAX_LOADOUT_WEIGHT) {
    errors.push(`Loadout too heavy: ${totalWeight}/${MAX_LOADOUT_WEIGHT}`);
  }

  return { valid: errors.length === 0, errors };
}
