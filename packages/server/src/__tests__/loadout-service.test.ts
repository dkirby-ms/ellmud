/**
 * LoadoutService Unit Tests — Core equip / unequip / swap operations.
 *
 * Tests the LoadoutService that moves items between a player's stash
 * and their equipment slots. Uses InMemoryStashRepository + InMemoryLoadoutRepository
 * as backing stores (same pattern as stash.test.ts).
 *
 * GDD §7.3: Stash & Loadout
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { EquipmentSlotType, StashItem } from '@ellmud/shared';
import { SLOT_ACCEPTS, EQUIPMENT_SLOT_ORDER } from '@ellmud/shared';
import { InMemoryStashRepository } from '../stash/StashRepository.js';
import { InMemoryLoadoutRepository } from '../loadout/LoadoutRepository.js';
import { LoadoutService } from '../loadout/LoadoutService.js';

import {
  PLAYER_A,
  PLAYER_B,
  IRON_HELM,
  STEEL_BREASTPLATE,
  LEATHER_LEGGINGS,
  IRON_BOOTS,
  CHAIN_GAUNTLETS,
  RUSTY_SWORD,
  IRON_SWORD,
  WOODEN_SHIELD,
  OFFHAND_DAGGER,
  COPPER_RING,
  SILVER_RING,
  JADE_AMULET,
  CRYPT_KEY,
  HEALING_POTION,
  allTestItemDefs,
  populateStash,
  getWrongItemForSlot,
  resetInstanceCounter,
} from './helpers/loadout-fixtures.js';

// ─── Test Setup ──────────────────────────────────────────────────────────────

let stashRepo: InMemoryStashRepository;
let loadoutRepo: InMemoryLoadoutRepository;
let loadoutService: LoadoutService;
let itemDefs: Map<string, StashItem>;

beforeEach(() => {
  resetInstanceCounter();
  stashRepo = new InMemoryStashRepository();
  loadoutRepo = new InMemoryLoadoutRepository();
  itemDefs = allTestItemDefs();
  loadoutService = new LoadoutService(loadoutRepo, stashRepo, itemDefs);
});

// ─── 1. Basic Equip Operations ──────────────────────────────────────────────

describe('LoadoutService — Equip Item', () => {
  it('equips a weapon from stash to the weapon slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const instanceId = instanceMap.get(RUSTY_SWORD.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');

    expect(result.ok).toBe(true);

    // Item removed from stash
    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === instanceId)).toBeUndefined();

    // Item now in loadout
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).not.toBeNull();
    expect(loadout.weapon!.instanceId).toBe(instanceId);
  });

  it('equips armour to the chest slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: STEEL_BREASTPLATE }]);
    const instanceId = instanceMap.get(STEEL_BREASTPLATE.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'chest');

    expect(result.ok).toBe(true);
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.chest).not.toBeNull();
  });

  it('equips a ring (material) to ring1 slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: COPPER_RING }]);
    const instanceId = instanceMap.get(COPPER_RING.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'ring1');

    expect(result.ok).toBe(true);
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.ring1).not.toBeNull();
  });

  it('equips an amulet (material) to the amulet slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: JADE_AMULET }]);
    const instanceId = instanceMap.get(JADE_AMULET.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'amulet');

    expect(result.ok).toBe(true);
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.amulet).not.toBeNull();
  });

  it('equips a shield (tool) to the offhand slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: WOODEN_SHIELD }]);
    const instanceId = instanceMap.get(WOODEN_SHIELD.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'offhand');

    expect(result.ok).toBe(true);
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.offhand).not.toBeNull();
  });

  it('equips a weapon to the offhand slot (dual-wield)', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: OFFHAND_DAGGER }]);
    const instanceId = instanceMap.get(OFFHAND_DAGGER.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'offhand');

    expect(result.ok).toBe(true);
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.offhand).not.toBeNull();
  });

  it('equips items to all armour slots independently', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: IRON_HELM },
      { item: STEEL_BREASTPLATE },
      { item: LEATHER_LEGGINGS },
      { item: IRON_BOOTS },
      { item: CHAIN_GAUNTLETS },
    ]);

    const armourSlots: EquipmentSlotType[] = ['head', 'chest', 'legs', 'feet', 'hands'];
    const items = [IRON_HELM, STEEL_BREASTPLATE, LEATHER_LEGGINGS, IRON_BOOTS, CHAIN_GAUNTLETS];

    for (let i = 0; i < armourSlots.length; i++) {
      const instanceId = instanceMap.get(items[i]!.id)!;
      const result = await loadoutService.equipItem(PLAYER_A, instanceId, armourSlots[i]!);
      expect(result.ok).toBe(true);
    }

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    for (const slot of armourSlots) {
      expect(loadout[slot]).not.toBeNull();
    }
  });
});

// ─── 2. Equip Item — Rejection Cases ────────────────────────────────────────

describe('LoadoutService — Equip Rejections', () => {
  it('rejects equipping to wrong slot type (weapon → head)', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const instanceId = instanceMap.get(RUSTY_SWORD.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'head');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    // Item remains in stash
    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === instanceId)).toBeDefined();
  });

  it('rejects equipping armour to weapon slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: IRON_HELM }]);
    const instanceId = instanceMap.get(IRON_HELM.id)!;

    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');

    expect(result.ok).toBe(false);
  });

  it('rejects equipping a key to any equipment slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);
    const instanceId = instanceMap.get(CRYPT_KEY.id)!;

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipItem(PLAYER_A, instanceId, slot);
      expect(result.ok).toBe(false);
    }

    // Key still in stash
    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === instanceId)).toBeDefined();
  });

  it('rejects equipping a consumable to any equipment slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: HEALING_POTION }]);
    const instanceId = instanceMap.get(HEALING_POTION.id)!;

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipItem(PLAYER_A, instanceId, slot);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects equipping a nonexistent item', async () => {
    const result = await loadoutService.equipItem(PLAYER_A, 'nonexistent-id', 'weapon');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects equipping an item that is already equipped', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const instanceId = instanceMap.get(RUSTY_SWORD.id)!;

    // First equip succeeds
    const first = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');
    expect(first.ok).toBe(true);

    // Second equip of same item fails (it's no longer in stash)
    const second = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');
    expect(second.ok).toBe(false);
  });

  it('rejects equipping item belonging to another player', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_B, [{ item: RUSTY_SWORD }]);
    const instanceId = instanceMap.get(RUSTY_SWORD.id)!;

    // Player A tries to equip Player B's item
    const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');

    expect(result.ok).toBe(false);

    // Item still in Player B's stash
    const stashB = await stashRepo.loadStash(PLAYER_B);
    expect(stashB.find((e) => e.instance.instanceId === instanceId)).toBeDefined();
  });

  it('rejects malformed instance IDs gracefully', async () => {
    const badIds = ['', '   ', '\x00\x01', 'undefined', 'null'];

    for (const badId of badIds) {
      const result = await loadoutService.equipItem(PLAYER_A, badId, 'weapon');
      expect(result.ok).toBe(false);
    }
  });
});

// ─── 3. Unequip Operations ──────────────────────────────────────────────────

describe('LoadoutService — Unequip Item', () => {
  it('unequips an item from slot back to stash', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const instanceId = instanceMap.get(RUSTY_SWORD.id)!;

    // Equip first
    await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');

    // Unequip
    const result = await loadoutService.unequipItem(PLAYER_A, 'weapon');

    expect(result.ok).toBe(true);

    // Slot is now empty
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).toBeNull();

    // Item back in stash
    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === instanceId)).toBeDefined();
  });

  it('unequipping an empty slot is a no-op success', async () => {
    const result = await loadoutService.unequipItem(PLAYER_A, 'weapon');

    // Empty unequip is a no-op — returns ok:true
    expect(result.ok).toBe(true);
  });

  it('rejects unequip when stash is at weight capacity', async () => {
    // Give player a sword and equip it
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const swordId = instanceMap.get(RUSTY_SWORD.id)!;
    await loadoutService.equipItem(PLAYER_A, swordId, 'weapon');

    // Fill stash to capacity: set capacity to 15, add breastplate (weight=15)
    await stashRepo.setCapacity(PLAYER_A, 15);
    const filler = await populateStash(stashRepo, PLAYER_A, [{ item: STEEL_BREASTPLATE }]);

    // Try to unequip sword (weight 5) — would exceed capacity (15 + 5 = 20 > 15)
    const result = await loadoutService.unequipItem(PLAYER_A, 'weapon');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();

    // Weapon stays equipped
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).not.toBeNull();
  });
});

// ─── 4. Swap Operations ─────────────────────────────────────────────────────

describe('LoadoutService — Swap (Equip to Occupied Slot)', () => {
  it('swaps old weapon with new weapon atomically', async () => {
    // Populate stash with two weapons
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_SWORD },
    ]);
    const rustyId = instanceMap.get(RUSTY_SWORD.id)!;
    const ironId = instanceMap.get(IRON_SWORD.id)!;

    // Equip rusty sword first
    await loadoutService.equipItem(PLAYER_A, rustyId, 'weapon');

    // Equip iron sword to same slot → triggers swap
    const result = await loadoutService.equipItem(PLAYER_A, ironId, 'weapon');

    expect(result.ok).toBe(true);
    expect(result.displaced).toBeDefined();
    expect(result.displaced!.instanceId).toBe(rustyId);

    // Iron sword now equipped
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).not.toBeNull();
    expect(loadout.weapon!.instanceId).toBe(ironId);

    // Rusty sword back in stash
    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === rustyId)).toBeDefined();
    // Iron sword NOT in stash
    expect(stash.find((e) => e.instance.instanceId === ironId)).toBeUndefined();
  });

  it('swap via swapItem() method is equivalent to equip on occupied slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_SWORD },
    ]);
    const rustyId = instanceMap.get(RUSTY_SWORD.id)!;
    const ironId = instanceMap.get(IRON_SWORD.id)!;

    await loadoutService.equipItem(PLAYER_A, rustyId, 'weapon');

    const result = await loadoutService.swapItem(PLAYER_A, ironId, 'weapon');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe(ironId);
  });

  it('swap is atomic — item count is preserved', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_SWORD },
    ]);
    const rustyId = instanceMap.get(RUSTY_SWORD.id)!;
    const ironId = instanceMap.get(IRON_SWORD.id)!;

    await loadoutService.equipItem(PLAYER_A, rustyId, 'weapon');

    // Count items before swap
    const stashBefore = await stashRepo.loadStash(PLAYER_A);
    const loadoutBefore = await loadoutService.getLoadout(PLAYER_A);
    const beforeCount = stashBefore.reduce((n, e) => n + e.quantity, 0)
      + EQUIPMENT_SLOT_ORDER.filter((s) => loadoutBefore[s] != null).length;

    await loadoutService.equipItem(PLAYER_A, ironId, 'weapon');

    // Count items after swap
    const stashAfter = await stashRepo.loadStash(PLAYER_A);
    const loadoutAfter = await loadoutService.getLoadout(PLAYER_A);
    const afterCount = stashAfter.reduce((n, e) => n + e.quantity, 0)
      + EQUIPMENT_SLOT_ORDER.filter((s) => loadoutAfter[s] != null).length;

    expect(afterCount).toBe(beforeCount);
  });

  it('swaps ring in ring1 slot', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: COPPER_RING },
      { item: SILVER_RING },
    ]);
    const copperId = instanceMap.get(COPPER_RING.id)!;
    const silverId = instanceMap.get(SILVER_RING.id)!;

    await loadoutService.equipItem(PLAYER_A, copperId, 'ring1');
    const swapResult = await loadoutService.equipItem(PLAYER_A, silverId, 'ring1');

    expect(swapResult.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.ring1).not.toBeNull();
    expect(loadout.ring1!.instanceId).toBe(silverId);

    const stash = await stashRepo.loadStash(PLAYER_A);
    expect(stash.find((e) => e.instance.instanceId === copperId)).toBeDefined();
  });
});

// ─── 5. Slot Restriction Matrix ─────────────────────────────────────────────

describe('LoadoutService — Slot Restrictions', () => {
  it('each slot rejects wrong item types per SLOT_ACCEPTS', async () => {
    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const wrongItem = getWrongItemForSlot(slot);
      const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: wrongItem }]);
      const instanceId = instanceMap.get(wrongItem.id)!;

      const result = await loadoutService.equipItem(PLAYER_A, instanceId, slot);
      expect(result.ok).toBe(false);

      await stashRepo.clearStash(PLAYER_A);
    }
  });

  it('weapon slot accepts only weapon items', async () => {
    const nonWeapons = [IRON_HELM, COPPER_RING, CRYPT_KEY, HEALING_POTION, JADE_AMULET];

    for (const item of nonWeapons) {
      const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item }]);
      const instanceId = instanceMap.get(item.id)!;

      const result = await loadoutService.equipItem(PLAYER_A, instanceId, 'weapon');
      expect(result.ok).toBe(false);

      await stashRepo.clearStash(PLAYER_A);
    }
  });

  it('offhand slot accepts weapons and tools (shields)', async () => {
    // Weapon in offhand
    const instanceMap1 = await populateStash(stashRepo, PLAYER_A, [{ item: OFFHAND_DAGGER }]);
    const daggerId = instanceMap1.get(OFFHAND_DAGGER.id)!;
    const r1 = await loadoutService.equipItem(PLAYER_A, daggerId, 'offhand');
    expect(r1.ok).toBe(true);

    // Unequip
    await loadoutService.unequipItem(PLAYER_A, 'offhand');

    // Tool (shield) in offhand
    const instanceMap2 = await populateStash(stashRepo, PLAYER_A, [{ item: WOODEN_SHIELD }]);
    const shieldId = instanceMap2.get(WOODEN_SHIELD.id)!;
    const r2 = await loadoutService.equipItem(PLAYER_A, shieldId, 'offhand');
    expect(r2.ok).toBe(true);
  });

  it('ring slots accept materials only', async () => {
    // Material (ring) works
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: COPPER_RING }]);
    const ringId = instanceMap.get(COPPER_RING.id)!;
    const r1 = await loadoutService.equipItem(PLAYER_A, ringId, 'ring1');
    expect(r1.ok).toBe(true);

    // Weapon doesn't work in ring slot
    const instanceMap2 = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const swordId = instanceMap2.get(RUSTY_SWORD.id)!;
    const r2 = await loadoutService.equipItem(PLAYER_A, swordId, 'ring1');
    expect(r2.ok).toBe(false);
  });

  it('validateSlotRestriction method works correctly', () => {
    expect(loadoutService.validateSlotRestriction('weapon', RUSTY_SWORD)).toBe(true);
    expect(loadoutService.validateSlotRestriction('weapon', IRON_HELM)).toBe(false);
    expect(loadoutService.validateSlotRestriction('head', IRON_HELM)).toBe(true);
    expect(loadoutService.validateSlotRestriction('offhand', WOODEN_SHIELD)).toBe(true);
    expect(loadoutService.validateSlotRestriction('offhand', OFFHAND_DAGGER)).toBe(true);
    expect(loadoutService.validateSlotRestriction('ring1', COPPER_RING)).toBe(true);
    expect(loadoutService.validateSlotRestriction('ring1', RUSTY_SWORD)).toBe(false);
    expect(loadoutService.validateSlotRestriction('amulet', JADE_AMULET)).toBe(true);
    expect(loadoutService.validateSlotRestriction('weapon', CRYPT_KEY)).toBe(false);
  });
});

// ─── 6. Get Loadout / View ──────────────────────────────────────────────────

describe('LoadoutService — getLoadout & getLoadoutView', () => {
  it('returns all empty slots for a new player', async () => {
    const loadout = await loadoutService.getLoadout(PLAYER_A);

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      expect(loadout[slot]).toBeNull();
    }
  });

  it('returns equipped items in correct slots after multiple equips', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: IRON_HELM },
      { item: RUSTY_SWORD },
      { item: COPPER_RING },
    ]);

    await loadoutService.equipItem(PLAYER_A, instanceMap.get(IRON_HELM.id)!, 'head');
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(COPPER_RING.id)!, 'ring1');

    const loadout = await loadoutService.getLoadout(PLAYER_A);

    expect(loadout.head).not.toBeNull();
    expect(loadout.weapon).not.toBeNull();
    expect(loadout.ring1).not.toBeNull();
    expect(loadout.chest).toBeNull();
    expect(loadout.ring2).toBeNull();
  });

  it('getLoadoutView returns DisplayItem with name and type', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    const view = await loadoutService.getLoadoutView(PLAYER_A);

    expect(view.slots.weapon).not.toBeNull();
    expect(view.slots.weapon!.name).toBe('Rusty Sword');
    expect(view.slots.weapon!.type).toBe('weapon');
    expect(view.slots.weapon!.weight).toBe(5);
    expect(view.slots.weapon!.allowedSlots).toContain('weapon');
  });

  it('getLoadoutSummary shows equipped items', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    const summary = await loadoutService.getLoadoutSummary(PLAYER_A);

    expect(summary).toContain('LOADOUT');
    expect(summary).toContain('Rusty Sword');
  });

  it('getLoadoutSummary shows nothing equipped for new player', async () => {
    const summary = await loadoutService.getLoadoutSummary(PLAYER_A);

    expect(summary).toContain('nothing equipped');
  });

  it('player loadouts are isolated from each other', async () => {
    const mapA = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    const mapB = await populateStash(stashRepo, PLAYER_B, [{ item: IRON_SWORD }]);

    await loadoutService.equipItem(PLAYER_A, mapA.get(RUSTY_SWORD.id)!, 'weapon');
    await loadoutService.equipItem(PLAYER_B, mapB.get(IRON_SWORD.id)!, 'weapon');

    const loadoutA = await loadoutService.getLoadout(PLAYER_A);
    const loadoutB = await loadoutService.getLoadout(PLAYER_B);

    expect(loadoutA.weapon!.instanceId).not.toBe(loadoutB.weapon!.instanceId);
    expect(loadoutA.weapon!.itemId).toBe(RUSTY_SWORD.id);
    expect(loadoutB.weapon!.itemId).toBe(IRON_SWORD.id);
  });

  it('validateLoadout detects invalid slot assignments', async () => {
    // Directly place wrong item type in a slot (bypassing service validation)
    const wrongItem = { instanceId: 'wrong-item', itemId: CRYPT_KEY.id, durability: null, maxDurability: null };
    await loadoutRepo.setSlot(PLAYER_A, 'weapon', wrongItem);

    const validation = await loadoutService.validateLoadout(PLAYER_A);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
