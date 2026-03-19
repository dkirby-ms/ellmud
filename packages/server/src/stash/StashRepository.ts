/**
 * StashRepository — Persistent stash (inventory) storage per player.
 *
 * Phase 1: In-memory Map (no PostgreSQL dependency).
 * Phase 2+: PostgreSQL implementation using the stash table from db/migrations/002.
 *
 * The stash stores StashItemInstance entries with quantities, keyed by player ID.
 * Weight calculations are delegated to StashService which holds StashItem refs.
 */

import type { StashItemInstance } from '@ellmud/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single stash slot: an item instance plus a stack count. */
export interface StashEntry {
  instance: StashItemInstance;
  quantity: number;
}

/** Interface for stash persistence — swap implementations for PG later. */
export interface StashRepository {
  /** Load all stash entries for a player. */
  loadStash(playerId: string): Promise<StashEntry[]>;

  /** Add an item to a player's stash. Stacks by instanceId if matching. */
  addItem(playerId: string, instance: StashItemInstance, quantity?: number): Promise<void>;

  /**
   * Remove quantity of an item from stash by instanceId.
   * Returns the removed entry (with adjusted quantity), or null if not found.
   */
  removeItem(playerId: string, instanceId: string, quantity?: number): Promise<StashEntry | null>;

  /** Get the max weight capacity for a player's stash. */
  getCapacity(playerId: string): Promise<number>;

  /** Set or upgrade the max weight capacity for a player's stash. */
  setCapacity(playerId: string, maxWeight: number): Promise<void>;

  /** Clear all items from a player's stash. */
  clearStash(playerId: string): Promise<void>;

  /** Admin: list all player IDs that have stash data. */
  listPlayerIds(): Promise<string[]>;
}

// ─── Default Capacity ───────────────────────────────────────────────────────

/** Default stash weight capacity (GDD §7.3 — expandable via upgrades). */
export const DEFAULT_STASH_CAPACITY = 200;

// ─── In-Memory Implementation ───────────────────────────────────────────────

/**
 * In-memory stash repository for Phase 1.
 * Uses a Map<playerId, Map<instanceId, StashEntry>> for O(1) lookups.
 * Secondary map tracks per-player capacity.
 */
export class InMemoryStashRepository implements StashRepository {
  private stashes = new Map<string, Map<string, StashEntry>>();
  private capacities = new Map<string, number>();

  async loadStash(playerId: string): Promise<StashEntry[]> {
    const playerStash = this.stashes.get(playerId);
    if (!playerStash) return [];
    return Array.from(playerStash.values());
  }

  async addItem(playerId: string, instance: StashItemInstance, quantity = 1): Promise<void> {
    let playerStash = this.stashes.get(playerId);
    if (!playerStash) {
      playerStash = new Map();
      this.stashes.set(playerId, playerStash);
    }

    const existing = playerStash.get(instance.instanceId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      playerStash.set(instance.instanceId, { instance, quantity });
    }
  }

  async removeItem(
    playerId: string,
    instanceId: string,
    quantity = 1,
  ): Promise<StashEntry | null> {
    const playerStash = this.stashes.get(playerId);
    if (!playerStash) return null;

    const entry = playerStash.get(instanceId);
    if (!entry) return null;

    if (quantity >= entry.quantity) {
      playerStash.delete(instanceId);
      return { instance: entry.instance, quantity: entry.quantity };
    }

    entry.quantity -= quantity;
    return { instance: entry.instance, quantity };
  }

  async getCapacity(playerId: string): Promise<number> {
    return this.capacities.get(playerId) ?? DEFAULT_STASH_CAPACITY;
  }

  async setCapacity(playerId: string, maxWeight: number): Promise<void> {
    this.capacities.set(playerId, maxWeight);
  }

  async clearStash(playerId: string): Promise<void> {
    this.stashes.delete(playerId);
  }

  async listPlayerIds(): Promise<string[]> {
    return Array.from(this.stashes.keys());
  }
}
