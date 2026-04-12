/**
 * Loot drop system — determines what items drop from creatures and spawn in rooms.
 *
 * Phase 1: Deterministic loot based on PRNG seed.
 * Drop tables use weighted selection — rarity affects drop probability.
 *
 * GDD §7.2, §10.2 (loot tiers scale with zone tier)
 */

import type { GearTier, ZoneTier, ItemDefinition, ItemInstance } from '@ellmud/shared';
import { RARITY_TIERS, createItemInstance } from '@ellmud/shared';
import { getItemDefinitionsMap } from './registry.js';

// ─── Drop Table ─────────────────────────────────────────────────────────────

export interface DropTableEntry {
  itemId: string;
  /** Relative weight in the drop pool. */
  weight: number;
}

export interface DropTable {
  entries: DropTableEntry[];
  /** Number of items to drop (Phase 1: fixed count). */
  dropCount: number;
}

// ─── Tier-Based Loot Pools ──────────────────────────────────────────────────

/** Zone tier determines maximum rarity of drops. */
const ZONE_TIER_MAX_RARITY: Record<ZoneTier, GearTier> = {
  1: 'sturdy',
  2: 'refined',
  3: 'anomalous',
};

/** Get all items eligible to drop in a given zone tier. */
export function getEligibleItems(zoneTier: ZoneTier): ItemDefinition[] {
  const maxTierIndex = RARITY_TIERS.findIndex(
    r => r.tier === ZONE_TIER_MAX_RARITY[zoneTier],
  );
  const eligible: ItemDefinition[] = [];
  for (const item of getItemDefinitionsMap().values()) {
    const tierIndex = RARITY_TIERS.findIndex(r => r.tier === item.tier);
    if (tierIndex <= maxTierIndex) {
      eligible.push(item);
    }
  }
  return eligible;
}

// ─── Deterministic Weighted Selection ───────────────────────────────────────

/**
 * Select an item from a weighted pool using a deterministic value (0–1).
 * Uses cumulative weight thresholds.
 */
export function weightedSelect(
  items: ItemDefinition[],
  rollValue: number,
): ItemDefinition {
  // Build weights: item weight × rarity drop weight
  const weights: number[] = items.map(item => {
    const rarity = RARITY_TIERS.find(r => r.tier === item.tier);
    return rarity ? rarity.dropWeight : 1;
  });

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const threshold = rollValue * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (cumulative >= threshold) return items[i];
  }

  return items[items.length - 1];
}

// ─── Room Loot Spawning ─────────────────────────────────────────────────────

export interface SpawnedLoot {
  instanceId: string;
  item: ItemInstance;
  definition: ItemDefinition;
}

/**
 * Generate loot items for a room during zone seeding.
 * Uses a deterministic roll sequence.
 */
export function spawnRoomLoot(
  roomId: string,
  zoneTier: ZoneTier,
  rollValues: number[],
): SpawnedLoot[] {
  const eligible = getEligibleItems(zoneTier);
  if (eligible.length === 0) return [];

  return rollValues.map((roll, index) => {
    const def = weightedSelect(eligible, roll);
    const instanceId = `${roomId}-loot-${index}`;
    return {
      instanceId,
      item: createItemInstance(def, instanceId),
      definition: def,
    };
  });
}

// ─── Creature Death Loot ────────────────────────────────────────────────────

export interface CreatureLootConfig {
  creatureId: string;
  creatureType: string;
  zoneTier: ZoneTier;
  /** PRNG roll values for selecting drops. */
  rollValues: number[];
  /** Number of items to drop. */
  dropCount: number;
}

/**
 * Generate loot from a creature death.
 * Drop count and quality scale with zone tier.
 */
export function generateCreatureLoot(config: CreatureLootConfig): SpawnedLoot[] {
  const eligible = getEligibleItems(config.zoneTier);
  if (eligible.length === 0) return [];

  const drops: SpawnedLoot[] = [];

  for (let i = 0; i < config.dropCount && i < config.rollValues.length; i++) {
    const roll = config.rollValues[i];
    const def = weightedSelect(eligible, roll);
    const instanceId = `${config.creatureId}-drop-${i}`;
    drops.push({
      instanceId,
      item: createItemInstance(def, instanceId),
      definition: def,
    });
  }

  return drops;
}

// ─── Drop Count by Zone Tier ───────────────────────────────────────────────

/** Base creature drop count by zone tier. */
export const CREATURE_DROP_COUNTS: Record<ZoneTier, { min: number; max: number }> = {
  1: { min: 1, max: 2 },
  2: { min: 1, max: 3 },
  3: { min: 2, max: 4 },
};

/** Determine drop count from a roll value. */
export function rollDropCount(zoneTier: ZoneTier, rollValue: number): number {
  const { min, max } = CREATURE_DROP_COUNTS[zoneTier];
  return min + Math.floor(rollValue * (max - min + 1));
}
