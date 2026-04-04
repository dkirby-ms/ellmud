/**
 * CorpseSystem — Manages lootable corpse entities in zone rooms.
 *
 * When a player dies, a corpse is created containing their non-soulbound items.
 * Other players can loot items from corpses using the `loot` command.
 * Corpses decay after a configurable TTL; remaining items are destroyed.
 *
 * Storage: Map<roomId, Corpse[]> — zone-scoped, destroyed on zone collapse.
 * Tick: Called once per game tick to remove expired/empty corpses.
 *
 * GDD §6.5, §6.8 — Death & Corpse System
 */

import type { Item } from '../generator/RoomGraph.js';

export interface Corpse {
  id: string;
  roomId: string;
  /** Session ID of the dead player. */
  ownerId: string;
  /** Character name of the dead player. */
  ownerName: string;
  /** Lootable items inside the corpse. */
  items: Item[];
  createdAt: number;
  /** Time-to-live in seconds. After expiry, corpse and items are destroyed. */
  ttlSeconds: number;
}

let nextCorpseId = 0;

export class CorpseSystem {
  private corpses = new Map<string, Corpse[]>();

  /** Create a corpse in a room. Returns the created corpse. */
  addCorpse(
    roomId: string,
    ownerId: string,
    ownerName: string,
    items: Item[],
    ttlSeconds: number,
  ): Corpse {
    const corpse: Corpse = {
      id: `corpse-${nextCorpseId++}`,
      roomId,
      ownerId,
      ownerName,
      items: [...items],
      createdAt: Date.now(),
      ttlSeconds,
    };

    const roomCorpses = this.corpses.get(roomId);
    if (roomCorpses) {
      roomCorpses.push(corpse);
    } else {
      this.corpses.set(roomId, [corpse]);
    }

    return corpse;
  }

  /** Get all living corpses in a room. */
  getCorpsesInRoom(roomId: string): Corpse[] {
    const now = Date.now();
    return (this.corpses.get(roomId) ?? []).filter(c => this.isAlive(c, now));
  }

  /**
   * Find a corpse in a room by query string.
   * - "" or "corpse" → first corpse
   * - "corpse of Alice" or "Alice" → corpse belonging to Alice
   */
  findCorpse(roomId: string, query: string): Corpse | undefined {
    const corpses = this.getCorpsesInRoom(roomId);
    if (corpses.length === 0) return undefined;

    const lower = query.toLowerCase().trim();

    if (lower === 'corpse' || lower === '') {
      return corpses[0];
    }

    // Strip "corpse of " prefix if present
    const nameMatch = lower.replace(/^corpse\s+of\s+/, '');
    return corpses.find(c => c.ownerName.toLowerCase().includes(nameMatch)) ?? undefined;
  }

  /** Remove a specific item from a corpse. Returns the item or undefined. */
  lootItem(corpseId: string, itemQuery: string): { corpse: Corpse; item: Item } | undefined {
    for (const roomCorpses of this.corpses.values()) {
      const corpse = roomCorpses.find(c => c.id === corpseId);
      if (!corpse) continue;

      const lower = itemQuery.toLowerCase();
      const idx = corpse.items.findIndex(
        i => i.id.toLowerCase() === lower || i.name.toLowerCase().includes(lower),
      );
      if (idx === -1) return undefined;

      const item = corpse.items.splice(idx, 1)[0]!;
      return { corpse, item };
    }
    return undefined;
  }

  /** Remove all items from a corpse. Returns the items array. */
  lootAll(corpseId: string): { corpse: Corpse; items: Item[] } | undefined {
    for (const roomCorpses of this.corpses.values()) {
      const corpse = roomCorpses.find(c => c.id === corpseId);
      if (!corpse) continue;

      const items = corpse.items.splice(0);
      return { corpse, items };
    }
    return undefined;
  }

  /** Remove expired and empty corpses. Call once per tick. */
  tick(_deltaMs: number): void {
    const now = Date.now();

    for (const [roomId, roomCorpses] of this.corpses) {
      const alive = roomCorpses.filter(c => this.isAlive(c, now) && c.items.length > 0);
      if (alive.length === 0) {
        this.corpses.delete(roomId);
      } else {
        this.corpses.set(roomId, alive);
      }
    }
  }

  /** Total active corpses across all rooms. */
  get totalCorpseCount(): number {
    let count = 0;
    const now = Date.now();
    for (const roomCorpses of this.corpses.values()) {
      count += roomCorpses.filter(c => this.isAlive(c, now)).length;
    }
    return count;
  }

  /** Clear all corpses. Used on zone collapse. */
  clear(): void {
    this.corpses.clear();
  }

  private isAlive(corpse: Corpse, now: number): boolean {
    if (corpse.ttlSeconds === Infinity) return true;
    return (now - corpse.createdAt) < corpse.ttlSeconds * 1000;
  }
}

/** Reset the ID counter for deterministic tests. */
export function resetCorpseIdCounter(): void {
  nextCorpseId = 0;
}
