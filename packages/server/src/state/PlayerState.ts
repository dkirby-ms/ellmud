/**
 * In-memory player state for a zone session.
 *
 * Tracks current room, inventory, weight budget, skills, and equipment per player.
 * This is server-authoritative — the client never sees this directly.
 */

import type { Item } from '../generator/RoomGraph.js';
import type { VisibleEquipment } from '@ellmud/shared';

export interface InventoryEntry {
  item: Item;
  quantity: number;
}

/** Skills relevant to awareness and stealth checks. */
export interface PlayerSkills {
  stealth: number;
  awareness: number;
  tracking?: number;
}

/** Active death penalty debuff applied after death. */
export interface DeathPenaltyDebuff {
  appliedAt: number;
  durationMs: number;
  attackPenalty: number;
  defencePenalty: number;
}

const DEFAULT_MAX_CARRY_WEIGHT = 20;
const DEFAULT_SKILLS: PlayerSkills = { stealth: 5, awareness: 5 };

export class PlayerState {
  /** Cross-room registry: tracks which player IDs have peaceful mode enabled. */
  private static peacefulRegistry = new Set<string>();

  static setPeaceful(playerId: string, value: boolean): void {
    if (value) PlayerState.peacefulRegistry.add(playerId);
    else PlayerState.peacefulRegistry.delete(playerId);
  }

  readonly sessionId: string;
  currentRoomId: string;
  readonly inventory: Map<string, InventoryEntry> = new Map();
  maxCarryWeight: number;
  disconnected: boolean = false;
  /** Dev mode: when true, hostile creatures ignore this player. */
  peaceful: boolean = false;
  skills: PlayerSkills;
  equipment: VisibleEquipment | undefined;
  deathPenalty: DeathPenaltyDebuff | null = null;

  constructor(
    sessionId: string,
    startRoomId: string,
    maxCarryWeight = DEFAULT_MAX_CARRY_WEIGHT,
    skills?: Partial<PlayerSkills>,
    equipment?: VisibleEquipment,
  ) {
    this.sessionId = sessionId;
    this.currentRoomId = startRoomId;
    this.maxCarryWeight = maxCarryWeight;
    this.skills = { ...DEFAULT_SKILLS, ...skills };
    this.equipment = equipment;
    // Restore peaceful flag from cross-room registry (survives zone transitions)
    this.peaceful = PlayerState.peacefulRegistry.has(sessionId);
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
