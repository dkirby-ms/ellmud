/**
 * Extraction Stash Transfer — moves shard inventory into persistent stash.
 *
 * Called at the end of a successful extraction. Converts shard Items to
 * StashItemInstances and stores them via StashService, respecting weight limits.
 * Items that exceed the stash capacity are retained in the player's carried
 * inventory (never silently lost).
 */

import type { StashItem, StashItemInstance } from '@ellmud/shared';
import type { StashService } from '../stash/index.js';
import type { InventoryEntry } from '../state/PlayerState.js';

/** An item type that could not be fully transferred due to stash capacity. */
export interface RetainedItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

export interface TransferResult {
  stored: number;
  retained: number;
  retainedItems: RetainedItem[];
  narrations: string[];
}

/**
 * Transfer a player's shard inventory into their persistent stash.
 *
 * Items that fit are stored; overflow items are tracked as retained so the
 * caller can keep them in the player's carried inventory and notify them.
 *
 * @param playerId   Stable player identifier for stash ownership
 * @param inventory  The player's current shard inventory entries
 * @param stashService  StashService for weight-checked storage
 * @param itemDefs  Shared item definition registry (mutated to register new defs)
 */
export async function transferInventoryToStash(
  playerId: string,
  inventory: Map<string, InventoryEntry>,
  stashService: StashService,
  itemDefs: Map<string, StashItem>,
): Promise<TransferResult> {
  let stored = 0;
  let retained = 0;
  const retainedItems: RetainedItem[] = [];
  const narrations: string[] = [];

  for (const [, entry] of inventory) {
    // Register item definition if not already known
    if (!itemDefs.has(entry.item.id)) {
      itemDefs.set(entry.item.id, {
        id: entry.item.id,
        name: entry.item.name,
        type: 'material',
        weight: entry.item.weight,
        rarity: 'common',
        description: entry.item.description,
        baseDurability: null,
      });
    }

    let storedForEntry = 0;
    let retainedForEntry = 0;

    for (let i = 0; i < entry.quantity; i++) {
      const instance: StashItemInstance = {
        instanceId: `${entry.item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId: entry.item.id,
        durability: null,
        maxDurability: null,
      };

      const result = await stashService.storeItem(playerId, instance);
      if (result.ok) {
        storedForEntry++;
        stored++;
      } else {
        retainedForEntry++;
        retained++;
      }
    }

    if (retainedForEntry > 0) {
      retainedItems.push({
        itemId: entry.item.id,
        itemName: entry.item.name,
        quantity: retainedForEntry,
      });

      const itemLabel = retainedForEntry > 1
        ? `${entry.item.name} (x${retainedForEntry})`
        : entry.item.name;

      if (storedForEntry > 0) {
        narrations.push(
          `Your stash is full! The ${itemLabel} could not be transferred. Carry it out manually or drop it.`,
        );
      } else {
        narrations.push(
          `Your stash is full! The ${itemLabel} could not be transferred. Carry it out manually or drop it.`,
        );
      }
    }
  }

  return { stored, retained, retainedItems, narrations };
}
