/**
 * In-memory player state for a zone session.
 *
 * Tracks current room, inventory, weight budget, skills, and equipment per player.
 * This is server-authoritative — the client never sees this directly.
 */

import type { Item } from '../generator/RoomGraph.js';
import type { VisibleEquipment, Posture } from '@ellmud/shared';
import { DEFAULT_POSTURE } from '@ellmud/shared';

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
  /** Current physical posture (#371). */
  posture: Posture = DEFAULT_POSTURE;
  /** Actual Item objects backing equipped slots (#390). */
  private readonly equippedItems = new Map<string, Item>();

  // ─── Follow System (#403 Phase 1) ──────────────────────────────────────
  /** Player ID (character ID) this player is following, or null. */
  followingPlayerId: string | null = null;
  /** Set of player IDs (character IDs) currently following this player. */
  readonly followers = new Set<string>();

  // ─── Consent System (#403 Phase 2) ─────────────────────────────────────
  /** Set of player IDs (character IDs) this player has granted consent to. */
  readonly consentedPlayers = new Set<string>();

  // ─── Group System (#403 Phase 3) ──────────────────────────────────────
  /** Group ID this player belongs to, or null. */
  groupId: string | null = null;

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

  /** Get the actual Item object backing an equipment slot (#390). */
  getEquippedItem(slot: string): Item | null {
    return this.equippedItems.get(slot) ?? null;
  }

  /** Store an Item object in an equipment slot (#390). */
  setEquippedItem(slot: string, item: Item): void {
    this.equippedItems.set(slot, item);
  }

  /** Remove the Item object from an equipment slot (#390). */
  clearEquippedItem(slot: string): void {
    this.equippedItems.delete(slot);
  }

  /** Return all equipped items as [slot, Item] pairs (#409 Phase 3). */
  getEquippedItems(): Array<[string, Item]> {
    return Array.from(this.equippedItems.entries());
  }

  /** Remove all equipped item objects (#409 Phase 3). */
  clearAllEquippedItems(): void {
    this.equippedItems.clear();
  }

  // ─── Follow helpers (#403) ─────────────────────────────────────────────

  /** Start following another player. Returns false if already following someone. */
  startFollowing(leaderId: string): boolean {
    if (this.followingPlayerId) return false;
    this.followingPlayerId = leaderId;
    return true;
  }

  /** Stop following the current leader. Returns the former leader ID or null. */
  stopFollowing(): string | null {
    const prev = this.followingPlayerId;
    this.followingPlayerId = null;
    return prev;
  }

  /** Add a follower to this player's follower set. */
  addFollower(followerId: string): void {
    this.followers.add(followerId);
  }

  /** Remove a follower from this player's follower set. */
  removeFollower(followerId: string): void {
    this.followers.delete(followerId);
  }
}
