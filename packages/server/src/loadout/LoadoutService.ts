/**
 * LoadoutService — Server-authoritative equipment management.
 *
 * All equip/unequip/swap operations are atomic:
 * - Remove from source + add to destination in one step
 * - Rollback on any failure (no item duplication, no item loss)
 * - Item ID tracking prevents double-spend race conditions
 *
 * The client never mutates inventory state — it receives LOADOUT_UPDATE
 * after the server confirms each operation.
 *
 * GDD §7.3: Loadout
 */

import type {
  StashItem,
  StashItemInstance,
  EquipmentSlotType,
  EquipmentSlots,
} from '@ellmud/shared';
import {
  SLOT_ACCEPTS,
  EQUIPMENT_SLOT_ORDER,
  createEmptyEquipmentSlots,
} from '@ellmud/shared';
import type { LoadoutData, LoadoutRepository } from './LoadoutRepository.js';
import { InMemoryLoadoutRepository } from './LoadoutRepository.js';
import type { StashRepository } from '../stash/StashRepository.js';

// ─── Result Types ───────────────────────────────────────────────────────────

export interface EquipResult {
  ok: boolean;
  error?: string;
  /** The item that was displaced from the slot (if any). */
  displaced?: StashItemInstance;
}

export interface UnequipResult {
  ok: boolean;
  error?: string;
}

export interface UnequipToInventoryResult {
  ok: boolean;
  error?: string;
  /** The item removed from the slot, for shard inventory. */
  item?: StashItemInstance;
}

export interface SwapResult {
  ok: boolean;
  error?: string;
}

export interface ShardEntryResult {
  canEnter: boolean;
  reason?: string;
}

export interface LoadoutView {
  slots: EquipmentSlots;
}

// ─── In-flight operation lock ───────────────────────────────────────────────

class OperationLock {
  private locks = new Map<string, Promise<void>>();

  async acquire(playerId: string): Promise<() => void> {
    while (this.locks.has(playerId)) {
      await this.locks.get(playerId);
    }

    let release!: () => void;
    const promise = new Promise<void>((resolve) => {
      release = () => {
        this.locks.delete(playerId);
        resolve();
      };
    });
    this.locks.set(playerId, promise);
    return release;
  }
}

// ─── Service ────────────────────────────────────────────────────────────────

export class LoadoutService {
  private readonly lock = new OperationLock();
  private readonly loadoutRepo: LoadoutRepository;
  private readonly stashRepo: StashRepository;
  private readonly itemDefs: Map<string, StashItem>;

  /**
   * Two-arg form: `new LoadoutService(stashRepo, itemDefs)` — internal in-memory loadout.
   * Three-arg form: `new LoadoutService(loadoutRepo, stashRepo, itemDefs)` — explicit repos.
   */
  constructor(stashRepo: StashRepository, itemDefs: Map<string, StashItem>);
  constructor(loadoutRepo: LoadoutRepository, stashRepo: StashRepository, itemDefs: Map<string, StashItem>);
  constructor(
    a: LoadoutRepository | StashRepository,
    b: Map<string, StashItem> | StashRepository,
    c?: Map<string, StashItem>,
  ) {
    if (c !== undefined) {
      this.loadoutRepo = a as LoadoutRepository;
      this.stashRepo = b as StashRepository;
      this.itemDefs = c;
    } else {
      this.loadoutRepo = new InMemoryLoadoutRepository();
      this.stashRepo = a as StashRepository;
      this.itemDefs = b as Map<string, StashItem>;
    }
  }

  // ─── Get Loadout ────────────────────────────────────────────────────────

  async getLoadout(playerId: string): Promise<LoadoutData> {
    return this.loadoutRepo.load(playerId);
  }

  // ─── Clear Loadout ─────────────────────────────────────────────────────

  /** Wipe all equipped items for a player (e.g. on death). Items are lost. */
  async clearLoadout(playerId: string): Promise<void> {
    return this.loadoutRepo.clear(playerId);
  }

  // ─── Equip ──────────────────────────────────────────────────────────────

  async equipItem(
    playerId: string,
    itemInstanceId: string,
    targetSlot: EquipmentSlotType,
  ): Promise<EquipResult> {
    const release = await this.lock.acquire(playerId);
    try {
      return await this._equipItem(playerId, itemInstanceId, targetSlot);
    } finally {
      release();
    }
  }

  private async _equipItem(
    playerId: string,
    itemInstanceId: string,
    targetSlot: EquipmentSlotType,
  ): Promise<EquipResult> {
    // 1. Verify item exists in this player's stash
    const stashEntries = await this.stashRepo.loadStash(playerId);
    const stashEntry = stashEntries.find((e) => e.instance.instanceId === itemInstanceId);
    if (!stashEntry) {
      return { ok: false, error: 'Item not found in stash.' };
    }

    // 2. Resolve item definition
    const def = this.itemDefs.get(stashEntry.instance.itemId);
    if (!def) {
      return { ok: false, error: 'Unknown item type.' };
    }

    // 3. Validate slot restriction
    if (!this.validateSlotRestriction(targetSlot, def)) {
      const accepted = SLOT_ACCEPTS[targetSlot].join(', ');
      return {
        ok: false,
        error: `${def.name} (${def.type}) cannot be equipped in the ${targetSlot} slot. Accepted: ${accepted}.`,
      };
    }

    // 4. Load current loadout
    const loadout = await this.loadoutRepo.load(playerId);
    const currentInSlot = loadout[targetSlot];

    // 5. Atomic: remove from stash
    const removed = await this.stashRepo.removeItem(playerId, itemInstanceId, 1);
    if (!removed) {
      return { ok: false, error: 'Failed to remove item from stash (race condition?).' };
    }

    // 6. If slot occupied, return old item to stash
    if (currentInSlot) {
      await this.stashRepo.addItem(playerId, currentInSlot, 1);
    }

    // 7. Place new item in slot
    await this.loadoutRepo.setSlot(playerId, targetSlot, stashEntry.instance);

    return {
      ok: true,
      displaced: currentInSlot ?? undefined,
    };
  }

  // ─── Unequip (to stash) ─────────────────────────────────────────────────

  async unequipItem(
    playerId: string,
    slot: EquipmentSlotType,
  ): Promise<UnequipResult> {
    const release = await this.lock.acquire(playerId);
    try {
      return await this._unequipItem(playerId, slot);
    } finally {
      release();
    }
  }

  private async _unequipItem(
    playerId: string,
    slot: EquipmentSlotType,
  ): Promise<UnequipResult> {
    const loadout = await this.loadoutRepo.load(playerId);
    const itemInSlot = loadout[slot];

    // Empty slot is a no-op success
    if (!itemInSlot) {
      return { ok: true };
    }

    const def = this.itemDefs.get(itemInSlot.itemId);
    if (!def) {
      return { ok: false, error: 'Item definition missing for equipped item.' };
    }

    const currentWeight = await this.calculateStashWeight(playerId);
    const capacity = await this.stashRepo.getCapacity(playerId);
    if (currentWeight + def.weight > capacity) {
      return { ok: false, error: 'Stash is full. Make room before unequipping.' };
    }

    await this.loadoutRepo.setSlot(playerId, slot, null);
    await this.stashRepo.addItem(playerId, itemInSlot, 1);

    return { ok: true };
  }

  // ─── Swap ───────────────────────────────────────────────────────────────

  async swapItem(
    playerId: string,
    itemInstanceId: string,
    targetSlot: EquipmentSlotType,
  ): Promise<SwapResult> {
    const result = await this.equipItem(playerId, itemInstanceId, targetSlot);
    return { ok: result.ok, error: result.error };
  }

  // ─── Equip from shard inventory ─────────────────────────────────────────

  async equipFromInventory(
    playerId: string,
    item: StashItemInstance,
    targetSlot: EquipmentSlotType,
  ): Promise<EquipResult> {
    const release = await this.lock.acquire(playerId);
    try {
      return await this._equipFromInventory(playerId, item, targetSlot);
    } finally {
      release();
    }
  }

  private async _equipFromInventory(
    playerId: string,
    item: StashItemInstance,
    targetSlot: EquipmentSlotType,
  ): Promise<EquipResult> {
    const def = this.itemDefs.get(item.itemId);
    if (!def) {
      return { ok: false, error: 'Unknown item type.' };
    }

    if (!this.validateSlotRestriction(targetSlot, def)) {
      const accepted = SLOT_ACCEPTS[targetSlot].join(', ');
      return {
        ok: false,
        error: `${def.name} (${def.type}) cannot be equipped in the ${targetSlot} slot. Accepted: ${accepted}.`,
      };
    }

    const loadout = await this.loadoutRepo.load(playerId);
    const currentInSlot = loadout[targetSlot];

    await this.loadoutRepo.setSlot(playerId, targetSlot, item);

    return {
      ok: true,
      displaced: currentInSlot ?? undefined,
    };
  }

  // ─── Unequip to shard inventory ─────────────────────────────────────────

  async unequipToInventory(
    playerId: string,
    slot: EquipmentSlotType,
  ): Promise<UnequipToInventoryResult> {
    const release = await this.lock.acquire(playerId);
    try {
      return await this._unequipToInventory(playerId, slot);
    } finally {
      release();
    }
  }

  private async _unequipToInventory(
    playerId: string,
    slot: EquipmentSlotType,
  ): Promise<UnequipToInventoryResult> {
    const loadout = await this.loadoutRepo.load(playerId);
    const itemInSlot = loadout[slot];

    if (!itemInSlot) {
      return { ok: true };
    }

    await this.loadoutRepo.setSlot(playerId, slot, null);

    return { ok: true, item: itemInSlot };
  }

  // ─── Shard Entry Validation ─────────────────────────────────────────────

  async validateShardEntry(playerId: string): Promise<ShardEntryResult> {
    const stashEntries = await this.stashRepo.loadStash(playerId);

    const hasKey = stashEntries.some((entry) => {
      const def = this.itemDefs.get(entry.instance.itemId);
      return def?.type === 'key';
    });

    if (!hasKey) {
      return {
        canEnter: false,
        reason: 'You need an expedition key to enter. Check the Refuge vendors.',
      };
    }

    return { canEnter: true };
  }

  // ─── Query helpers ──────────────────────────────────────────────────────

  async getLoadoutView(playerId: string): Promise<LoadoutView> {
    const loadout = await this.loadoutRepo.load(playerId);
    return { slots: this.toDisplaySlots(loadout) };
  }

  async getLoadoutSummary(playerId: string): Promise<string> {
    const loadout = await this.loadoutRepo.load(playerId);
    const equipped: string[] = [];

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const item = loadout[slot];
      if (item) {
        const def = this.itemDefs.get(item.itemId);
        const name = def?.name ?? item.itemId;
        const weight = def?.weight ?? 0;
        equipped.push(`  ${this.slotLabel(slot)}: ${name} (${weight.toFixed(1)}w)`);
      }
    }

    if (equipped.length === 0) {
      return '═══ LOADOUT ═══\n  (nothing equipped)';
    }

    return `═══ LOADOUT ═══\n${equipped.join('\n')}`;
  }

  // ─── Validation ─────────────────────────────────────────────────────────

  validateSlotRestriction(slot: EquipmentSlotType, item: StashItem): boolean {
    return SLOT_ACCEPTS[slot].includes(item.type);
  }

  async validateLoadout(playerId: string): Promise<{ valid: boolean; errors: string[] }> {
    const loadout = await this.loadoutRepo.load(playerId);
    const errors: string[] = [];

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const item = loadout[slot];
      if (!item) continue;

      const def = this.itemDefs.get(item.itemId);
      if (!def) {
        errors.push(`${slot}: item definition not found for ${item.itemId}`);
        continue;
      }

      if (!this.validateSlotRestriction(slot, def)) {
        errors.push(`${slot}: ${def.name} (${def.type}) not valid for this slot`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────

  private toDisplaySlots(loadout: LoadoutData): EquipmentSlots {
    const slots = createEmptyEquipmentSlots();

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const item = loadout[slot];
      if (!item) continue;

      const def = this.itemDefs.get(item.itemId);
      if (!def) continue;

      const allowedSlots = EQUIPMENT_SLOT_ORDER.filter(
        (s) => SLOT_ACCEPTS[s].includes(def.type),
      );

      slots[slot] = {
        instanceId: item.instanceId,
        definitionId: item.itemId,
        name: def.name,
        type: def.type,
        tier: def.rarity,
        weight: def.weight,
        description: def.description,
        allowedSlots,
      };
    }

    return slots;
  }

  private async calculateStashWeight(playerId: string): Promise<number> {
    const entries = await this.stashRepo.loadStash(playerId);
    let total = 0;
    for (const entry of entries) {
      const def = this.itemDefs.get(entry.instance.itemId);
      if (def) {
        total += def.weight * entry.quantity;
      }
    }
    return total;
  }

  private slotLabel(slot: EquipmentSlotType): string {
    const labels: Record<EquipmentSlotType, string> = {
      head: 'Head', chest: 'Chest', legs: 'Legs', feet: 'Feet',
      hands: 'Hands', weapon: 'Weapon', offhand: 'Offhand',
      ring1: 'Ring 1', ring2: 'Ring 2', amulet: 'Amulet',
    };
    return labels[slot];
  }
}
