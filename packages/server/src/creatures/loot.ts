/**
 * Loot generation — deterministic drops from creature loot tables.
 *
 * Phase 1: all loot table entries drop on death (no random drops).
 * Items are placed in the room where the creature died.
 */

import type { Creature } from './types.js';

// ─── Loot Item (matches RoomGraph.Item for dev fixture compat) ───────────────

export interface LootItem {
  id: string;
  name: string;
  weight: number;
  description: string;
}

/**
 * Generate loot from a creature's loot table.
 * Phase 1: deterministic — every entry in the table drops.
 * Item IDs are namespaced by creature ID to ensure uniqueness.
 */
export function generateLoot(creature: Creature): LootItem[] {
  return creature.lootTable.map((entry, index) => ({
    id: `${creature.id}-loot-${index}`,
    name: entry.name,
    weight: entry.weight,
    description: entry.description,
  }));
}
