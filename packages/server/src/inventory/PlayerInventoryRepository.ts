/**
 * PlayerInventoryRepository — Persistent player inventory storage.
 *
 * Mirrors the StashRepository pattern. Stores InventoryItemEntry records
 * keyed by player ID. Used by ZoneRoom lifecycle to persist carried items
 * across sessions.
 *
 * Issue #409 — Container System Phase 1.
 */

import type { Item } from '../generator/RoomGraph.js';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single persisted inventory entry. */
export interface InventoryItemEntry {
  itemId: string;
  name: string;
  weight: number;
  description: string;
  quantity: number;
  durability: number | null;
  metadata: Record<string, unknown>;
}

/** Interface for inventory persistence — swap implementations for PG later. */
export interface PlayerInventoryRepository {
  /** Load all inventory entries for a player. */
  loadInventory(playerId: string): Promise<InventoryItemEntry[]>;

  /** Replace a player's entire inventory (bulk save). */
  saveInventory(playerId: string, items: InventoryItemEntry[]): Promise<void>;

  /** Add an item to a player's inventory. Stacks by itemId if matching. */
  addItem(playerId: string, item: InventoryItemEntry): Promise<void>;

  /**
   * Remove quantity of an item from inventory by itemId.
   * Returns the removed entry (with adjusted quantity), or null if not found.
   */
  removeItem(playerId: string, itemId: string, quantity?: number): Promise<InventoryItemEntry | null>;

  /** Clear all items from a player's inventory. */
  clearInventory(playerId: string): Promise<void>;

  /** Admin: list all player IDs that have inventory data. */
  listPlayerIds(): Promise<string[]>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

/**
 * In-memory inventory repository.
 * Uses a Map<playerId, Map<itemId, InventoryItemEntry>> for O(1) lookups.
 */
export class InMemoryPlayerInventoryRepository implements PlayerInventoryRepository {
  private inventories = new Map<string, Map<string, InventoryItemEntry>>();

  async loadInventory(playerId: string): Promise<InventoryItemEntry[]> {
    const inv = this.inventories.get(playerId);
    if (!inv) return [];
    return Array.from(inv.values()).map((e) => ({ ...e }));
  }

  async saveInventory(playerId: string, items: InventoryItemEntry[]): Promise<void> {
    const inv = new Map<string, InventoryItemEntry>();
    for (const item of items) {
      const existing = inv.get(item.itemId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        inv.set(item.itemId, { ...item });
      }
    }
    this.inventories.set(playerId, inv);
  }

  async addItem(playerId: string, item: InventoryItemEntry): Promise<void> {
    let inv = this.inventories.get(playerId);
    if (!inv) {
      inv = new Map();
      this.inventories.set(playerId, inv);
    }

    const existing = inv.get(item.itemId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      inv.set(item.itemId, { ...item });
    }
  }

  async removeItem(
    playerId: string,
    itemId: string,
    quantity = 1,
  ): Promise<InventoryItemEntry | null> {
    const inv = this.inventories.get(playerId);
    if (!inv) return null;

    const entry = inv.get(itemId);
    if (!entry) return null;

    if (quantity >= entry.quantity) {
      inv.delete(itemId);
      return { ...entry };
    }

    entry.quantity -= quantity;
    return { ...entry, quantity };
  }

  async clearInventory(playerId: string): Promise<void> {
    this.inventories.delete(playerId);
  }

  async listPlayerIds(): Promise<string[]> {
    return Array.from(this.inventories.keys());
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a PlayerState inventory Map to InventoryItemEntry array for persistence. */
export function inventoryToEntries(
  inventory: Map<string, { item: Item; quantity: number }>,
): InventoryItemEntry[] {
  const entries: InventoryItemEntry[] = [];
  for (const [, entry] of inventory) {
    const metadata: Record<string, unknown> = {};
    // Persist container contents in metadata if present
    if ('containerContents' in entry.item && Array.isArray(entry.item.containerContents)) {
      metadata.containerContents = entry.item.containerContents;
    }
    entries.push({
      itemId: entry.item.id,
      name: entry.item.name,
      weight: entry.item.weight,
      description: entry.item.description,
      quantity: entry.quantity,
      durability: null,
      metadata,
    });
  }
  return entries;
}
