/**
 * Stash item types — minimal interface for stash persistence (Issue #11).
 *
 * Jarlaxle is building the full item system (Issue #16) in parallel.
 * This defines the minimum contract the stash needs. He will reconcile
 * these types with the full ItemDefinition/ItemInstance when both merge.
 *
 * GDD §7.3: Stash & Loadout
 */

import type { GearTier } from '../index.js';

/** The kind of item stored in the stash. */
export type StashItemType =
  | 'weapon'
  | 'armour'
  | 'consumable'
  | 'material'
  | 'tool'
  | 'key';

/** Minimal item definition — enough for stash display and weight checks. */
export interface StashItem {
  id: string;
  name: string;
  type: StashItemType;
  weight: number;
  rarity: GearTier;
  description: string;
  /** Base durability. Null for non-degradable items (materials, keys). */
  baseDurability: number | null;
}

/** A specific item instance in a player's stash. */
export interface StashItemInstance {
  instanceId: string;
  itemId: string;        // references StashItem.id
  durability: number | null;
  maxDurability: number | null;
}
