/**
 * StashService — Business logic for player stash operations.
 *
 * Orchestrates weight checks, capacity enforcement, and item resolution.
 * The repository handles raw persistence; this service enforces game rules.
 *
 * GDD §7.3: Stash is persistent storage in the Refuge. Weight-limited,
 * capacity expandable via upgrades. Items survive server restarts.
 */

import type { StashItem, StashItemInstance } from '@ellmud/shared';
import type { StashRepository, StashEntry } from './StashRepository.js';

// ─── Result Types ───────────────────────────────────────────────────────────

export interface StashView {
  entries: StashViewEntry[];
  currentWeight: number;
  maxWeight: number;
}

export interface StashViewEntry {
  instance: StashItemInstance;
  definition: StashItem;
  quantity: number;
}

export interface StoreResult {
  ok: boolean;
  error?: string;
}

export interface TakeResult {
  ok: boolean;
  entry?: StashViewEntry;
  error?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class StashService {
  constructor(
    private readonly repo: StashRepository,
    private readonly itemDefs: Map<string, StashItem>,
  ) {}

  /** Load a player's stash with resolved item definitions. */
  async loadStash(playerId: string): Promise<StashView> {
    const entries = await this.repo.loadStash(playerId);
    const capacity = await this.repo.getCapacity(playerId);

    const viewEntries: StashViewEntry[] = [];
    let currentWeight = 0;

    for (const entry of entries) {
      const def = this.itemDefs.get(entry.instance.itemId);
      if (!def) continue; // orphaned entry — skip silently

      const weight = def.weight * entry.quantity;
      currentWeight += weight;

      viewEntries.push({
        instance: entry.instance,
        definition: def,
        quantity: entry.quantity,
      });
    }

    return { entries: viewEntries, currentWeight, maxWeight: capacity };
  }

  /** Store an item into the stash. Enforces weight capacity. */
  async storeItem(
    playerId: string,
    instance: StashItemInstance,
    quantity = 1,
  ): Promise<StoreResult> {
    const def = this.itemDefs.get(instance.itemId);
    if (!def) {
      return { ok: false, error: 'Unknown item type.' };
    }

    const addedWeight = def.weight * quantity;
    const currentWeight = await this.calculateWeight(playerId);
    const capacity = await this.repo.getCapacity(playerId);

    if (currentWeight + addedWeight > capacity) {
      return {
        ok: false,
        error: `Stash full. ${currentWeight.toFixed(1)}/${capacity} weight used. ` +
          `The ${def.name} would add ${addedWeight.toFixed(1)}.`,
      };
    }

    await this.repo.addItem(playerId, instance, quantity);
    return { ok: true };
  }

  /** Take an item from the stash by name or ID query. */
  async takeItem(playerId: string, query: string): Promise<TakeResult> {
    const entries = await this.repo.loadStash(playerId);
    const lower = query.toLowerCase();

    // Find matching entry: exact instanceId, then itemId, then partial name match
    let match: StashEntry | undefined;

    for (const entry of entries) {
      if (entry.instance.instanceId.toLowerCase() === lower) {
        match = entry;
        break;
      }
    }

    if (!match) {
      for (const entry of entries) {
        const def = this.itemDefs.get(entry.instance.itemId);
        if (def && def.id.toLowerCase() === lower) {
          match = entry;
          break;
        }
      }
    }

    if (!match) {
      for (const entry of entries) {
        const def = this.itemDefs.get(entry.instance.itemId);
        if (def && def.name.toLowerCase().includes(lower)) {
          match = entry;
          break;
        }
      }
    }

    if (!match) {
      return { ok: false, error: `No item matching "${query}" found in your stash.` };
    }

    const def = this.itemDefs.get(match.instance.itemId);
    if (!def) {
      return { ok: false, error: 'Item definition missing.' };
    }

    await this.repo.removeItem(playerId, match.instance.instanceId, 1);

    return {
      ok: true,
      entry: {
        instance: match.instance,
        definition: def,
        quantity: 1,
      },
    };
  }

  /** Calculate total weight of a player's stash. */
  async calculateWeight(playerId: string): Promise<number> {
    const entries = await this.repo.loadStash(playerId);
    let total = 0;
    for (const entry of entries) {
      const def = this.itemDefs.get(entry.instance.itemId);
      if (def) {
        total += def.weight * entry.quantity;
      }
    }
    return total;
  }

  /** Get a text summary of stash contents for narration. */
  async getStashSummary(playerId: string): Promise<string> {
    const view = await this.loadStash(playerId);

    if (view.entries.length === 0) {
      return `Your stash is empty. (${view.currentWeight.toFixed(1)}/${view.maxWeight} weight)`;
    }

    const lines: string[] = [
      `═══ STASH (${view.currentWeight.toFixed(1)}/${view.maxWeight} weight) ═══`,
    ];

    for (const entry of view.entries) {
      const qtyStr = entry.quantity > 1 ? ` x${entry.quantity}` : '';
      const durStr = entry.instance.durability != null
        ? ` [${entry.instance.durability}/${entry.instance.maxDurability}]`
        : '';
      const weightStr = `(${(entry.definition.weight * entry.quantity).toFixed(1)}w)`;
      lines.push(`  ${entry.definition.name}${qtyStr} ${weightStr}${durStr} — ${entry.definition.rarity}`);
    }

    return lines.join('\n');
  }

  /** Admin: get all stash data (for admin dashboard). */
  async listAllStashes(): Promise<Map<string, StashView>> {
    const playerIds = await this.repo.listPlayerIds();
    const result = new Map<string, StashView>();
    for (const playerId of playerIds) {
      result.set(playerId, await this.loadStash(playerId));
    }
    return result;
  }
}
