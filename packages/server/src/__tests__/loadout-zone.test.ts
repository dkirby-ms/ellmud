/**
 * Loadout Zone Tests — Zone entry validation + in-zone equipping.
 *
 * Tests zone entry requirements (key-only gating, weapons optional)
 * and the ability to equip/swap items found during a zone run.
 *
 * GDD §7.3: Players CAN swap equipment while in zones.
 * GDD §3: Zone entry requires key(s) only, weapons optional.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StashItem } from '@ellmud/shared';
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
// ZONE ENTRY VALIDATION
// These test the expected behavior for zone entry gating.
// The actual validation may live in zone-mode ZoneRoom or a separate validator.
// We test the preconditions the loadout system must support.
// ═══════════════════════════════════════════════════════════════════════════

describe('Zone Entry — validateZoneEntry', () => {
  it('player with key in stash can enter zone', async () => {
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player without key cannot enter zone', async () => {
    await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_HELM },
    ]);

    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('empty stash — cannot enter (no key)', async () => {
    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(false);
  });

  it('weapons are NOT required for zone entry', async () => {
    // Only key, no weapon — should be valid
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).toBeNull(); // No weapon equipped

    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player with empty loadout but key can enter', async () => {
    await populateStash(stashRepo, PLAYER_A, [{ item: CRYPT_KEY }]);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    for (const slot of EQUIPMENT_SLOT_ORDER) {
      expect(loadout[slot]).toBeNull();
    }

    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });

  it('player with full loadout and key can enter zone', async () => {
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

    const result = await loadoutService.validateZoneEntry(PLAYER_A);
    expect(result.canEnter).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// IN-ZONE EQUIPPING VIA equipFromInventory
// ═══════════════════════════════════════════════════════════════════════════

describe('In-Zone Equipping — equipFromInventory', () => {
  it('equips a weapon found in zone to weapon slot', async () => {
    const zoneSword = makeInstanceFromDef(IRON_SWORD, 'zone-found-sword');

    const result = await loadoutService.equipFromInventory(PLAYER_A, zoneSword, 'weapon');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon).not.toBeNull();
    expect(loadout.weapon!.instanceId).toBe('zone-found-sword');
  });

  it('swaps equipped item with zone-found item, returning displaced item', async () => {
    // Pre-equip a rusty sword from stash
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    // Find better sword in zone
    const zoneSword = makeInstanceFromDef(IRON_SWORD, 'zone-found-iron');

    const result = await loadoutService.equipFromInventory(PLAYER_A, zoneSword, 'weapon');

    expect(result.ok).toBe(true);

    // New sword equipped
    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe('zone-found-iron');

    // Old sword returned as displaced
    expect(result.displaced).toBeDefined();
    expect(result.displaced!.itemId).toBe(RUSTY_SWORD.id);
  });

  it('equipping from zone does NOT add to stash', async () => {
    const stashBefore = await stashRepo.loadStash(PLAYER_A);
    const stashCountBefore = stashBefore.reduce((n, e) => n + e.quantity, 0);

    const zoneSword = makeInstanceFromDef(IRON_SWORD, 'zone-sword');
    await loadoutService.equipFromInventory(PLAYER_A, zoneSword, 'weapon');

    const stashAfter = await stashRepo.loadStash(PLAYER_A);
    const stashCountAfter = stashAfter.reduce((n, e) => n + e.quantity, 0);

    // Stash unchanged — item came from zone, not stash
    expect(stashCountAfter).toBe(stashCountBefore);
  });

  it('slot restrictions enforced when equipping from zone inventory', async () => {
    const zoneHelm = makeInstanceFromDef(IRON_HELM, 'zone-helm');

    // Helm (armour) → weapon slot: rejected
    const result = await loadoutService.equipFromInventory(PLAYER_A, zoneHelm, 'weapon');

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('consumable from zone cannot be equipped to any slot', async () => {
    const zonePotion = makeInstanceFromDef(HEALING_POTION, 'zone-potion');

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipFromInventory(PLAYER_A, zonePotion, slot);
      expect(result.ok).toBe(false);
    }
  });

  it('key from zone cannot be equipped to any slot', async () => {
    const zoneKey = makeInstanceFromDef(CRYPT_KEY, 'zone-key');

    for (const slot of EQUIPMENT_SLOT_ORDER) {
      const result = await loadoutService.equipFromInventory(PLAYER_A, zoneKey, slot);
      expect(result.ok).toBe(false);
    }
  });

  it('equipping unknown item ID from zone is rejected', async () => {
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

// ─── In-Zone Equipment Swapping (Live Combat Context) ──────────────────────

describe('In-Zone Equipment Swapping', () => {
  it('player can change weapon mid-zone (not locked on entry)', async () => {
    // Start with rusty sword equipped from stash
    const instanceMap = await populateStash(stashRepo, PLAYER_A, [{ item: RUSTY_SWORD }]);
    await loadoutService.equipItem(PLAYER_A, instanceMap.get(RUSTY_SWORD.id)!, 'weapon');

    // Find and equip iron sword from zone
    const zoneIronSword = makeInstanceFromDef(IRON_SWORD, 'zone-iron-sword');
    const result = await loadoutService.equipFromInventory(PLAYER_A, zoneIronSword, 'weapon');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.weapon!.instanceId).toBe('zone-iron-sword');
  });

  it('player can equip armour found in zone to empty slot', async () => {
    const zoneBreastplate = makeInstanceFromDef(STEEL_BREASTPLATE, 'zone-plate');
    const result = await loadoutService.equipFromInventory(PLAYER_A, zoneBreastplate, 'chest');

    expect(result.ok).toBe(true);

    const loadout = await loadoutService.getLoadout(PLAYER_A);
    expect(loadout.chest).not.toBeNull();
    expect(loadout.chest!.instanceId).toBe('zone-plate');
  });

  it('multiple sequential swaps in zone return displaced items', async () => {
    const swords = [
      makeInstanceFromDef(RUSTY_SWORD, 'zone-sword-1'),
      makeInstanceFromDef(IRON_SWORD, 'zone-sword-2'),
      makeInstanceFromDef(RUSTY_SWORD, 'zone-sword-3'),
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
    expect(loadout.weapon!.instanceId).toBe('zone-sword-3');
  });

  it('zone equip does not interfere with stash state', async () => {
    // Put items in stash
    await populateStash(stashRepo, PLAYER_A, [
      { item: RUSTY_SWORD },
      { item: IRON_HELM },
    ]);

    const stashBefore = await stashRepo.loadStash(PLAYER_A);
    const stashCountBefore = stashBefore.reduce((n, e) => n + e.quantity, 0);

    // Equip from zone
    const zoneItem = makeInstanceFromDef(IRON_SWORD, 'zone-item');
    await loadoutService.equipFromInventory(PLAYER_A, zoneItem, 'weapon');

    // Stash is unchanged
    const stashAfter = await stashRepo.loadStash(PLAYER_A);
    const stashCountAfter = stashAfter.reduce((n, e) => n + e.quantity, 0);
    expect(stashCountAfter).toBe(stashCountBefore);
  });
});
