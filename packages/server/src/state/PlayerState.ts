/**
 * In-memory player state for a shard session.
 *
 * Tracks current room, inventory, and weight budget per player.
 * This is server-authoritative — the client never sees this directly.
 */

import type { Item } from '../shard/RoomGraph.js';

export interface InventoryEntry {
  item: Item;
  quantity: number;
}

const DEFAULT_MAX_CARRY_WEIGHT = 20;

export class PlayerState {
  readonly sessionId: string;
  currentRoomId: string;
  readonly inventory: Map<string, InventoryEntry> = new Map();
  maxCarryWeight: number;

  constructor(sessionId: string, startRoomId: string, maxCarryWeight = DEFAULT_MAX_CARRY_WEIGHT) {
    this.sessionId = sessionId;
    this.currentRoomId = startRoomId;
    this.maxCarryWeight = maxCarryWeight;
  }

  get currentWeight(): number {
    let total = 0;
    for (const entry of this.inventory.values()) {
      total += entry.item.weight * entry.quantity;
    }
    return total;
  }

  /** Returns true if the item can be carried without exceeding weight limit. */
  canCarry(item: Item): boolean {
    return this.currentWeight + item.weight <= this.maxCarryWeight;
  }

  /** Add item to inventory. Returns false if over weight. */
  addItem(item: Item): boolean {
    if (!this.canCarry(item)) return false;

    const existing = this.inventory.get(item.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.inventory.set(item.id, { item, quantity: 1 });
    }
    return true;
  }

  /** Remove one of an item from inventory. Returns the item or null if not found. */
  removeItem(itemId: string): Item | null {
    const entry = this.inventory.get(itemId);
    if (!entry) return null;

    entry.quantity--;
    if (entry.quantity <= 0) {
      this.inventory.delete(itemId);
    }
    return entry.item;
  }

  /** Check if player has an item (by id or partial name match). */
  findItem(query: string): InventoryEntry | null {
    const lower = query.toLowerCase();
    // Exact id match first
    const byId = this.inventory.get(lower);
    if (byId) return byId;

    // Partial name match
    for (const entry of this.inventory.values()) {
      if (entry.item.name.toLowerCase().includes(lower) || entry.item.id.toLowerCase().includes(lower)) {
        return entry;
      }
    }
    return null;
  }
}
