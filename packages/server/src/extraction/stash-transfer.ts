/**
 * Extraction Stash Transfer — moves shard inventory into persistent stash.
 *
 * Called at the end of a successful extraction. Converts shard Items to
 * StashItemInstances and stores them via StashService, respecting weight limits.
 * Items that exceed the stash capacity are lost.
 */

import type { StashItem, StashItemInstance } from '@ellmud/shared';
import type { StashService } from '../stash/index.js';
import type { InventoryEntry } from '../state/PlayerState.js';

export interface TransferResult {
  stored: number;
  lost: number;
}

/**
 * Transfer a player's shard inventory into their persistent stash.
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
  let lost = 0;

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

    for (let i = 0; i < entry.quantity; i++) {
      const instance: StashItemInstance = {
        instanceId: `${entry.item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        itemId: entry.item.id,
        durability: null,
        maxDurability: null,
      };

      const result = await stashService.storeItem(playerId, instance);
      if (result.ok) {
        stored++;
      } else {
        lost++;
      }
    }
  }

  return { stored, lost };
}
