/**
 * Wave 4 — Stash Persistence Wiring (#11) anticipatory tests.
 *
 * Tests the integration between stash persistence and the zone-mode
 * ZoneRoom stash-load-on-entry flow. Covers:
 *   - Stash transfer pipeline
 *   - Weight enforcement during deposits
 *   - Capacity upgrades through the full pipeline
 *   - Server restart durability (StashService recreation)
 *   - Zone ZoneRoom stash-load-on-join wiring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StashItem, StashItemInstance } from '@ellmud/shared';
import {
  InMemoryStashRepository,
  StashService,
  DEFAULT_STASH_CAPACITY,
} from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';
import { transferInventoryToStash } from '../systems/stash-transfer.js';
import { PlayerState, type InventoryEntry } from '../state/PlayerState.js';

// ─── Shared Fixtures ────────────────────────────────────────────────────────

const PLAYER_ID = 'player-wave4';
const PLAYER_ID_2 = 'player-wave4-b';

function createItemDefs(): Map<string, StashItem> {
  const defs = new Map<string, StashItem>();
  defs.set('rusty_blade', {
    id: 'rusty_blade',
    name: 'Rusty Blade',
    type: 'weapon',
    rarity: 'scrap',
    weight: 5.0,
    description: 'A corroded shortsword.',
    baseDurability: 30,
  });
  defs.set('waterlogged_potion', {
    id: 'waterlogged_potion',
    name: 'Waterlogged Potion',
    type: 'consumable',
    rarity: 'scrap',
    weight: 1.0,
    description: 'Murky liquid in a cracked flask.',
    baseDurability: null,
  });
  defs.set('revenant_bone', {
    id: 'revenant_bone',
    name: 'Revenant Bone',
    type: 'material',
    rarity: 'common',
    weight: 2.0,
    description: 'A bleached bone from a zone creature.',
    baseDurability: null,
  });
  defs.set('heavy_anvil', {
    id: 'heavy_anvil',
    name: 'Heavy Anvil',
    type: 'tool',
    rarity: 'common',
    weight: 150.0,
    description: 'An impossibly heavy anvil.',
    baseDurability: null,
  });
  return defs;
}

function buildInventory(
  items: Array<{ id: string; name: string; weight: number; description: string; qty: number }>,
): Map<string, InventoryEntry> {
  const inv = new Map<string, InventoryEntry>();
  for (const item of items) {
    inv.set(item.id, {
      item: { id: item.id, name: item.name, weight: item.weight, description: item.description },
      quantity: item.qty,
    });
  }
  return inv;
}

// ─── Stash Transfer Pipeline ─────────────────────────────────────────────────

describe('Stash Transfer (Issue #11)', () => {
  let repo: StashRepository;
  let defs: Map<string, StashItem>;
  let service: StashService;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    defs = createItemDefs();
    service = new StashService(repo, defs);
  });

  it('transfers zone inventory items into persistent stash', async () => {
    const inventory = buildInventory([
      { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Sword', qty: 1 },
      { id: 'waterlogged_potion', name: 'Waterlogged Potion', weight: 1, description: 'Potion', qty: 3 },
    ]);

    const result = await transferInventoryToStash(PLAYER_ID, inventory, service, defs);

    expect(result.stored).toBe(4); // 1 blade + 3 potions
    expect(result.retained).toBe(0);

    const view = await service.loadStash(PLAYER_ID);
    expect(view.entries.length).toBeGreaterThanOrEqual(1);
    expect(view.currentWeight).toBeCloseTo(8.0); // 5 + 3×1
  });

  it('retains items that exceed stash weight capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 10);

    const inventory = buildInventory([
      { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Sword', qty: 3 },
    ]);

    const result = await transferInventoryToStash(PLAYER_ID, inventory, service, defs);

    // Capacity 10 / weight 5 each → can fit 2, third is retained
    expect(result.stored).toBe(2);
    expect(result.retained).toBe(1);
    expect(result.retainedItems).toHaveLength(1);
    expect(result.retainedItems[0]!.itemId).toBe('rusty_blade');
    expect(result.retainedItems[0]!.quantity).toBe(1);
  });

  it('handles empty inventory gracefully', async () => {
    const emptyInv = new Map<string, InventoryEntry>();
    const result = await transferInventoryToStash(PLAYER_ID, emptyInv, service, defs);

    expect(result.stored).toBe(0);
    expect(result.retained).toBe(0);
  });

  it('registers unknown item definitions during transfer', async () => {
    const unknownItemInv = buildInventory([
      { id: 'mystery_gem', name: 'Mystery Gem', weight: 0.5, description: 'Shimmering gem', qty: 1 },
    ]);

    expect(defs.has('mystery_gem')).toBe(false);

    await transferInventoryToStash(PLAYER_ID, unknownItemInv, service, defs);

    // The transfer should register the definition
    expect(defs.has('mystery_gem')).toBe(true);
    expect(defs.get('mystery_gem')!.name).toBe('Mystery Gem');
    expect(defs.get('mystery_gem')!.weight).toBe(0.5);
  });

  it('transfers items from multiple distinct item types', async () => {
    const inventory = buildInventory([
      { id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Sword', qty: 1 },
      { id: 'waterlogged_potion', name: 'Waterlogged Potion', weight: 1, description: 'Potion', qty: 2 },
      { id: 'revenant_bone', name: 'Revenant Bone', weight: 2, description: 'Bone', qty: 1 },
    ]);

    const result = await transferInventoryToStash(PLAYER_ID, inventory, service, defs);
    expect(result.stored).toBe(4);
    expect(result.retained).toBe(0);

    const view = await service.loadStash(PLAYER_ID);
    // 5 + 2×1 + 2 = 9 weight
    expect(view.currentWeight).toBeCloseTo(9.0);
  });

  it('all items retained when stash has zero remaining capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 5);

    // Fill stash to capacity
    const sword: StashItemInstance = {
      instanceId: 'existing-sword',
      itemId: 'rusty_blade',
      durability: 30,
      maxDurability: 30,
    };
    await repo.addItem(PLAYER_ID, sword, 1); // 5.0 weight, at capacity

    const inventory = buildInventory([
      { id: 'waterlogged_potion', name: 'Waterlogged Potion', weight: 1, description: 'Potion', qty: 3 },
    ]);

    const result = await transferInventoryToStash(PLAYER_ID, inventory, service, defs);
    expect(result.stored).toBe(0);
    expect(result.retained).toBe(3);
    expect(result.retainedItems).toHaveLength(1);
    expect(result.retainedItems[0]!.itemId).toBe('waterlogged_potion');
    expect(result.retainedItems[0]!.quantity).toBe(3);
    expect(result.narrations).toHaveLength(1);
    expect(result.narrations[0]).toContain('stash is full');
    expect(result.narrations[0]).toContain('Waterlogged Potion');
  });
});

// ─── Stash Weight Enforcement ───────────────────────────────────────────────

describe('Stash Weight Enforcement (Issue #11)', () => {
  let repo: StashRepository;
  let defs: Map<string, StashItem>;
  let service: StashService;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    defs = createItemDefs();
    service = new StashService(repo, defs);
  });

  it('rejects store when single item exceeds remaining capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 4);

    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade', // weight 5
      durability: 30,
      maxDurability: 30,
    };

    const result = await service.storeItem(PLAYER_ID, sword);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Stash full');
  });

  it('allows storing exactly at capacity boundary', async () => {
    await repo.setCapacity(PLAYER_ID, 5);

    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade', // weight 5
      durability: 30,
      maxDurability: 30,
    };

    const result = await service.storeItem(PLAYER_ID, sword);
    expect(result.ok).toBe(true);
  });

  it('rejects adding second item that would overflow', async () => {
    await repo.setCapacity(PLAYER_ID, 6);

    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade', // weight 5
      durability: 30,
      maxDurability: 30,
    };
    await service.storeItem(PLAYER_ID, sword);

    const potion: StashItemInstance = {
      instanceId: 'potion-1',
      itemId: 'waterlogged_potion', // weight 1 → total 6, at capacity
      durability: null,
      maxDurability: null,
    };
    const r1 = await service.storeItem(PLAYER_ID, potion);
    expect(r1.ok).toBe(true);

    const potion2: StashItemInstance = {
      instanceId: 'potion-2',
      itemId: 'waterlogged_potion', // would be 7, exceeds 6
      durability: null,
      maxDurability: null,
    };
    const r2 = await service.storeItem(PLAYER_ID, potion2);
    expect(r2.ok).toBe(false);
  });

  it('quantity multiplied by weight when checking capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 5);

    const potion: StashItemInstance = {
      instanceId: 'potion-batch',
      itemId: 'waterlogged_potion', // weight 1 each
      durability: null,
      maxDurability: null,
    };

    const r1 = await service.storeItem(PLAYER_ID, potion, 5);
    expect(r1.ok).toBe(true);

    const r2 = await service.storeItem(PLAYER_ID, potion, 1);
    expect(r2.ok).toBe(false);
  });
});

// ─── Stash Capacity Upgrade ─────────────────────────────────────────────────

describe('Stash Capacity Upgrade (Issue #11)', () => {
  let repo: StashRepository;
  let defs: Map<string, StashItem>;
  let service: StashService;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    defs = createItemDefs();
    service = new StashService(repo, defs);
  });

  it('default capacity is DEFAULT_STASH_CAPACITY', async () => {
    const view = await service.loadStash(PLAYER_ID);
    expect(view.maxWeight).toBe(DEFAULT_STASH_CAPACITY);
  });

  it('setCapacity updates the limit seen by loadStash', async () => {
    await repo.setCapacity(PLAYER_ID, 500);
    const view = await service.loadStash(PLAYER_ID);
    expect(view.maxWeight).toBe(500);
  });

  it('upgrade enables storing items that previously failed', async () => {
    await repo.setCapacity(PLAYER_ID, 3);

    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade', // weight 5
      durability: 30,
      maxDurability: 30,
    };

    const fail = await service.storeItem(PLAYER_ID, sword);
    expect(fail.ok).toBe(false);

    await repo.setCapacity(PLAYER_ID, 10);
    const success = await service.storeItem(PLAYER_ID, sword);
    expect(success.ok).toBe(true);
  });

  it('capacity is per-player — one upgrade does not affect others', async () => {
    await repo.setCapacity(PLAYER_ID, 999);

    const capA = await repo.getCapacity(PLAYER_ID);
    const capB = await repo.getCapacity(PLAYER_ID_2);

    expect(capA).toBe(999);
    expect(capB).toBe(DEFAULT_STASH_CAPACITY);
  });
});

// ─── Server Restart Durability ──────────────────────────────────────────────

describe('Server Restart Durability (Issue #11)', () => {
  it('data survives StashService recreation (same repo)', async () => {
    const repo = new InMemoryStashRepository();
    const defs = createItemDefs();

    // First service instance: store items
    const service1 = new StashService(repo, defs);
    const sword: StashItemInstance = {
      instanceId: 'durable-sword',
      itemId: 'rusty_blade',
      durability: 30,
      maxDurability: 30,
    };
    await service1.storeItem(PLAYER_ID, sword, 2);
    await repo.setCapacity(PLAYER_ID, 500);

    // Simulate restart: new service, same backing repo
    const service2 = new StashService(repo, defs);

    const view = await service2.loadStash(PLAYER_ID);
    expect(view.entries.length).toBeGreaterThanOrEqual(1);
    expect(view.maxWeight).toBe(500);

    // Data is accessible and correct
    const totalWeight = view.currentWeight;
    expect(totalWeight).toBeCloseTo(10.0); // 2 × 5.0
  });

  it('capacity upgrade persists through service recreation', async () => {
    const repo = new InMemoryStashRepository();
    const defs = createItemDefs();

    new StashService(repo, defs); // first instance sets up
    await repo.setCapacity(PLAYER_ID, 1000);

    const service2 = new StashService(repo, defs);
    const view = await service2.loadStash(PLAYER_ID);
    expect(view.maxWeight).toBe(1000);
  });

  it('multiple players survive service restart independently', async () => {
    const repo = new InMemoryStashRepository();
    const defs = createItemDefs();

    const service1 = new StashService(repo, defs);
    const swordA: StashItemInstance = {
      instanceId: 'blade-a',
      itemId: 'rusty_blade',
      durability: 30,
      maxDurability: 30,
    };
    const potionB: StashItemInstance = {
      instanceId: 'potion-b',
      itemId: 'waterlogged_potion',
      durability: null,
      maxDurability: null,
    };
    await service1.storeItem(PLAYER_ID, swordA);
    await service1.storeItem(PLAYER_ID_2, potionB, 5);

    // Restart
    const service2 = new StashService(repo, defs);

    const viewA = await service2.loadStash(PLAYER_ID);
    const viewB = await service2.loadStash(PLAYER_ID_2);

    expect(viewA.entries.length).toBe(1);
    expect(viewA.entries[0]!.definition.id).toBe('rusty_blade');

    expect(viewB.entries.length).toBe(1);
    expect(viewB.entries[0]!.definition.id).toBe('waterlogged_potion');
    expect(viewB.entries[0]!.quantity).toBe(5);
  });
});

// ─── Stash Load on Refuge Entry ─────────────────────────────────────────────

describe('Stash Load on Refuge Entry (Issue #11)', () => {
  let repo: StashRepository;
  let defs: Map<string, StashItem>;
  let service: StashService;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    defs = createItemDefs();
    service = new StashService(repo, defs);
  });

  it('getStashSummary returns empty message for new player', async () => {
    const summary = await service.getStashSummary(PLAYER_ID);
    expect(summary).toContain('empty');
  });

  it('getStashSummary includes item names after deposit', async () => {
    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade',
      durability: 30,
      maxDurability: 30,
    };
    await service.storeItem(PLAYER_ID, sword);

    const summary = await service.getStashSummary(PLAYER_ID);
    expect(summary).toContain('STASH');
    expect(summary).toContain('Rusty Blade');
  });

  it('stash summary shows weight and capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 100);
    const sword: StashItemInstance = {
      instanceId: 'blade-1',
      itemId: 'rusty_blade',
      durability: 30,
      maxDurability: 30,
    };
    await service.storeItem(PLAYER_ID, sword, 2);

    const summary = await service.getStashSummary(PLAYER_ID);
    // Should contain weight info: "10.0/100"
    expect(summary).toContain('10.0');
    expect(summary).toContain('100');
  });

  it('full stash→zone-load pipeline works end to end', async () => {
    // Simulate a zone run: player picks up items
    const player = new PlayerState(PLAYER_ID, 'entry');
    player.addItem({ id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'Sword' });
    player.addItem({ id: 'revenant_bone', name: 'Revenant Bone', weight: 2, description: 'Bone' });

    // Transfer to stash
    const result = await transferInventoryToStash(
      PLAYER_ID,
      player.inventory,
      service,
      defs,
    );
    expect(result.stored).toBe(2);
    expect(result.retained).toBe(0);

    // Player returns to Refuge → stash summary is loaded
    const summary = await service.getStashSummary(PLAYER_ID);
    expect(summary).toContain('STASH');
    expect(summary).toContain('Rusty Blade');
    expect(summary).toContain('Revenant Bone');

    // Weight is tracked
    const view = await service.loadStash(PLAYER_ID);
    expect(view.currentWeight).toBeCloseTo(7.0); // 5 + 2
  });
});
