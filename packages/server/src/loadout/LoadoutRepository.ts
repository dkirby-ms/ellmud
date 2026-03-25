/**
 * LoadoutRepository — Persistent equipment loadout storage per player.
 *
 * Phase 1: In-memory Map (no PostgreSQL dependency).
 * Phase 2+: PostgreSQL implementation.
 *
 * Stores per-slot equipment keyed by player ID.
 * Each slot maps to a StashItemInstance (or null if empty).
 *
 * GDD §7.3: Loadout
 */

import type { StashItemInstance } from '@ellmud/shared';
import type { EquipmentSlotType } from '@ellmud/shared';
import { EQUIPMENT_SLOT_ORDER } from '@ellmud/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A full loadout: every slot mapped to an item instance or null. */
export type LoadoutData = Record<EquipmentSlotType, StashItemInstance | null>;

/** Create an empty loadout with all slots null. */
export function createEmptyLoadoutData(): LoadoutData {
  const data = {} as LoadoutData;
  for (const slot of EQUIPMENT_SLOT_ORDER) {
    data[slot] = null;
  }
  return data;
}

/** Interface for loadout persistence — swap implementations for PG later. */
export interface LoadoutRepository {
  /** Load a player's full loadout. Returns empty loadout if none saved. */
  load(playerId: string): Promise<LoadoutData>;

  /** Save a player's full loadout (overwrites). */
  save(playerId: string, loadout: LoadoutData): Promise<void>;

  /** Set a single slot's item. */
  setSlot(playerId: string, slot: EquipmentSlotType, item: StashItemInstance | null): Promise<void>;

  /** Get a single slot's item. */
  getSlot(playerId: string, slot: EquipmentSlotType): Promise<StashItemInstance | null>;

  /** Clear all equipment for a player. */
  clear(playerId: string): Promise<void>;

  /** Admin: list all player IDs that have loadout data. */
  listPlayerIds(): Promise<string[]>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryLoadoutRepository implements LoadoutRepository {
  private loadouts = new Map<string, LoadoutData>();

  async load(playerId: string): Promise<LoadoutData> {
    const existing = this.loadouts.get(playerId);
    if (!existing) return createEmptyLoadoutData();
    // Return a shallow copy to prevent external mutation
    return { ...existing };
  }

  async save(playerId: string, loadout: LoadoutData): Promise<void> {
    this.loadouts.set(playerId, { ...loadout });
  }

  async setSlot(playerId: string, slot: EquipmentSlotType, item: StashItemInstance | null): Promise<void> {
    let data = this.loadouts.get(playerId);
    if (!data) {
      data = createEmptyLoadoutData();
      this.loadouts.set(playerId, data);
    }
    data[slot] = item;
  }

  async getSlot(playerId: string, slot: EquipmentSlotType): Promise<StashItemInstance | null> {
    const data = this.loadouts.get(playerId);
    if (!data) return null;
    return data[slot] ?? null;
  }

  async clear(playerId: string): Promise<void> {
    this.loadouts.delete(playerId);
  }

  async listPlayerIds(): Promise<string[]> {
    return Array.from(this.loadouts.keys());
  }
}
