/**
 * Loadout Shard Tests — Shard entry validation + in-shard equipping.
 *
 * Tests shard entry requirements (key-only gating, weapons optional)
 * and the ability to equip/swap items found during a shard run.
 *
 * GDD §7.3: Players CAN swap equipment while in shards.
 * GDD §3: Shard entry requires key(s) only, weapons optional.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StashItem, EquipmentSlotType } from '@ellmud/shared';
import { EQUIPMENT_SLOT_ORDER } from '@ellmud/shared';
import { InMemoryStashRepository } from '../stash/StashRepository.js';
import { InMemoryLoadoutRepository } from '../loadout/LoadoutRepository.js';
import { LoadoutService } from '../loadout/LoadoutService.js';

import {
  PLAYER_A,
  RUSTY_SWORD,
  IRON_SWORD,
  IRON_HELM,
  STEEL_BREASTPLATE,
  COPPER_RING,
  CRYPT_KEY,
  HEALING_POTION,
  allTestItemDefs,
  makeInstanceFromDef,
  populateStash,
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

// ═══════════════════════════════════════════════════════════════════════════
// SHARD ENTRY VALIDATION
// These test the expected behavior for shard entry gating.
// The actual validation may live in RefugeRoom or a separate validator.
// We test the preconditions the loadout system must support.
// ═══════════════════════════════════════════════════════════════════════════

describe('Shard Entry — validateShardEntry', () => {
  it('player with key in stash can enter shard', async () => {
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player without key cannot enter shard', async () => {
    await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_HELM },
    ]);

    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('empty stash — cannot enter (no key)', async () => {
    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(false);
  });

  it('weapons are NOT required for shard entry', async () => {
    // Only key, no weapon — should be valid
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).toBeNull(); // No weapon equipped

    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player with empty loadout but key can enter', async () => {
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    for (const slot of EQUIPMENT_SLOT_ORDER) {
      expect(loadout[slot]).toBeNull();
    }

    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player with full loadout and key can enter shard', async () => {
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [
      { item: CRYPT_KEY },
      { item: RUSTY_SWORD },
      { item: IRON_HELM },
      { item: STEEL_BREASTPLATE },
      { item: COPPER_RING },
    ]);

    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(IRON_HELM.id)!, 'head');
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(STEEL_BREASTPLATE.id)!, 'chest');
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(COPPER_RING.id)!, 'ring1');

    const result = await loadoutService.validateShardEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IN-SHARD EQUIPPING VIA equipFromInventory
// ═══════════════════════════════════════════════════════════════════════════

describe('In-Shard Equipping — equipFromInventory', () => {
  it('equips a weapon found in shard to weapon slot', async () => {
    const shardSword = makeInstanceFromDef(IRON_SWORD, 'shard-found-sword');

    const result = await loadoutService.equipFromInventory(PLAYER_A, shardSword, 'weapon');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).not.toBeNull();
    expect(loadout.weapon!.instanceId).toBe('shard-found-sword');
  });

  it('swaps equipped item with shard-found item, returning displaced item', async () => {
    // Pre-equip a rusty sword from stash
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    // Find better sword in shard
    const shardSword = makeInstanceFromDef(IRON_SWORD, 'shard-found-iron');

    const result = await loadoutService.equipFromInventory(PLAYER_A, shardSword, 'weapon');

    expect(result.ok).toBe(true);

    // New sword equipped
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe('shard-found-iron');

    // Old sword returned as displaced
    expect(result.displaced).toBeDefined();
    expect(result.displaced!.itemId).toBe(RUSTY_SWORD.id);
  });

  it('equipping from shard does NOT add to stash', async () => {
    const stashBefore = await stashRepo.loadStash(PLAYER_A);
    const stashCountBefore = stashBefore.reduce((n, e) => n + e.quantity, 0);

    const shardSword = makeInstanceFromDef(IRON_SWORD, 'shard-sword');
    await loadoutService.equipFromInventory(PLAYER_A, shardSword, 'weapon');

    const stashAfter = await stashRepo.loadStash(PLAYER_A);
    const stashCountAfter = stashAfter.reduce((n, e) => n + e.quantity, 0);

    // Stash unchanged — item came from shard, not stash
    expect(stashCountAfter).toBe(stashCountBefore);
  });

  it('slot restrictions enforced when equipping from shard inventory', async () => {
    const shardHelm = makeInstanceFromDef(IRON_HELM, 'shard-helm');

    // Helm (armour) → weapon slot: rejected
    const result = await loadoutService.equipFromInventory(PLAYER_A, shardHelm, 'weapon');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('consumable from shard cannot be equipped to any slot', async () => {
    const shardPotion = makeInstanceFromDef(HEALING_POTION, 'shard-potion');

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipFromInventory(PLAYER_A, shardPotion, slot);
      expect(result.ok).toBe(false);
    }
  });

  it('key from shard cannot be equipped to any slot', async () => {
    const shardKey = makeInstanceFromDef(CRYPT_KEY, 'shard-key');

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipFromInventory(PLAYER_A, shardKey, slot);
      expect(result.ok).toBe(false);
    }
  });

  it('equipping unknown item ID from shard is rejected', async () => {
    const unknownItem = {
      instanceId: 'mystery-item',
      itemId: 'does-not-exist-in-defs',
      durability: null,
      maxDurability: null,
    };

    const result = await loadoutService.equipFromInventory(PLAYER_A, unknownItem, 'weapon');
    expect(result.ok).toBe(false);
  });
});

// ─── In-Shard Equipment Swapping (Live Combat Context) ──────────────────────

describe('In-Shard Equipment Swapping', () => {
  it('player can change weapon mid-shard (not locked on entry)', async () => {
    // Start with rusty sword equipped from stash
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    // Find and equip iron sword from shard
    const shardIronSword = makeInstanceFromDef(IRON_SWORD, 'shard-iron-sword');
    const result = await loadoutService.equipFromInventory(PLAYER_A, shardIronSword, 'weapon');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe('shard-iron-sword');
  });

  it('player can equip armour found in shard to empty slot', async () => {
    const shardBreastplate = makeInstanceFromDef(STEEL_BREASTPLATE, 'shard-plate');
    const result = await loadoutService.equipFromInventory(PLAYER_A, shardBreastplate, 'chest');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.chest).not.toBeNull();
    expect(loadout.chest!.instanceId).toBe('shard-plate');
  });

  it('multiple sequential swaps in shard return displaced items', async () => {
    const swords = [
      makeInstanceFromDef(RUSTY_SWORD, 'shard-sword-1'),
      makeInstanceFromDef(IRON_SWORD, 'shard-sword-2'),
      makeInstanceFromDef(RUSTY_SWORD, 'shard-sword-3'),
    ];

    const displaced: Array<{ instanceId: string }> = [];

    for (const sword of swords) {
      const result = await loadoutService.equipFromInventory(PLAYER_A, sword, 'weapon');
      expect(result.ok).toBe(true);
      if (result.displaced) {
        displaced.push(result.displaced);
      }
    }

    // First equip has no displaced item, subsequent ones do
    expect(displaced).toHaveLength(2);

    // Final equipped sword is the last one
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe('shard-sword-3');
  });

  it('shard equip does not interfere with stash state', async () => {
    // Put items in stash
    await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_HELM },
    ]);

    const stashBefore = await stashRepo.loadStash(PLAYER_A);
    const stashCountBefore = stashBefore.reduce((n, e) => n + e.quantity, 0);

    // Equip from shard
    const shardItem = makeInstanceFromDef(IRON_SWORD, 'shard-item');
    await loadoutService.equipFromInventory(PLAYER_A, shardItem, 'weapon');

    // Stash is unchanged
    const stashAfter = await stashRepo.loadStash(PLAYER_A);
    const stashCountAfter = stashAfter.reduce((n, e) => n + e.quantity, 0);
    expect(stashCountAfter).toBe(stashCountBefore);
  });
});
