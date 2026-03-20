/**
 * Stash persistence tests — Issue #11.
 *
 * Covers: StashRepository CRUD, StashService business logic (weight limits,
 * capacity, item resolution, take/store), RefugeRoom stash integration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StashItem, StashItemInstance } from '@ellmud/shared';
import {
  InMemoryStashRepository,
  StashService,
  DEFAULT_STASH_CAPACITY,
} from '../stash/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

function createTestItemDefs(): Map<string, StashItem> {
  const defs = new Map<string, StashItem>();

  defs.set('rusty-sword', {
    id: 'rusty-sword',
    name: 'Rusty Sword',
    type: 'weapon',
    rarity: 'scrap',
    weight: 3.0,
    description: 'A blade that has seen better days.',
    baseDurability: 50,
  });

  defs.set('iron-shield', {
    id: 'iron-shield',
    name: 'Iron Shield',
    type: 'armour',
    rarity: 'common',
    weight: 5.0,
    description: 'A heavy shield of beaten iron.',
    baseDurability: 80,
  });

  defs.set('healing-potion', {
    id: 'healing-potion',
    name: 'Healing Potion',
    type: 'consumable',
    rarity: 'common',
    weight: 0.5,
    description: 'A vial of restorative liquid.',
    baseDurability: null,
  });

  defs.set('void-shard', {
    id: 'void-shard',
    name: 'Void Shard',
    type: 'material',
    rarity: 'anomalous',
    weight: 0.1,
    description: 'A fragment of crystallised void-stuff.',
    baseDurability: null,
  });

  defs.set('heavy-anvil', {
    id: 'heavy-anvil',
    name: 'Heavy Anvil',
    type: 'tool',
    rarity: 'common',
    weight: 150.0,
    description: 'An impossibly heavy anvil.',
    baseDurability: null,
  });

  return defs;
}

function makeInstance(defId: string, instanceId?: string): StashItemInstance {
  const defs = createTestItemDefs();
  const def = defs.get(defId)!;
  const maxDur = def.baseDurability;
  return {
    instanceId: instanceId ?? `${defId}-inst-1`,
    itemId: defId,
    durability: maxDur,
    maxDurability: maxDur,
  };
}

const PLAYER_ID = 'player-001';
const PLAYER_ID_2 = 'player-002';

// ─── StashRepository Tests ──────────────────────────────────────────────────

describe('InMemoryStashRepository', () => {
  let repo: InMemoryStashRepository;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
  });

  it('returns empty array for unknown player', async () => {
    const stash = await repo.loadStash('nonexistent');
    expect(stash).toEqual([]);
  });

  it('adds and loads a single item', async () => {
    const sword = makeInstance('rusty-sword');
    await repo.addItem(PLAYER_ID, sword, 1);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(1);
    expect(stash[0]!.instance.instanceId).toBe(sword.instanceId);
    expect(stash[0]!.quantity).toBe(1);
  });

  it('stacks items with the same instanceId', async () => {
    const potion = makeInstance('healing-potion');
    await repo.addItem(PLAYER_ID, potion, 3);
    await repo.addItem(PLAYER_ID, potion, 2);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(1);
    expect(stash[0]!.quantity).toBe(5);
  });

  it('stores multiple different items', async () => {
    const sword = makeInstance('rusty-sword');
    const shield = makeInstance('iron-shield');
    await repo.addItem(PLAYER_ID, sword);
    await repo.addItem(PLAYER_ID, shield);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(2);
  });

  it('removes item fully when quantity matches', async () => {
    const sword = makeInstance('rusty-sword');
    await repo.addItem(PLAYER_ID, sword, 1);

    const removed = await repo.removeItem(PLAYER_ID, sword.instanceId, 1);
    expect(removed).not.toBeNull();
    expect(removed!.quantity).toBe(1);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(0);
  });

  it('decrements quantity when removing partial stack', async () => {
    const potion = makeInstance('healing-potion');
    await repo.addItem(PLAYER_ID, potion, 5);

    const removed = await repo.removeItem(PLAYER_ID, potion.instanceId, 2);
    expect(removed!.quantity).toBe(2);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash[0]!.quantity).toBe(3);
  });

  it('removes entire stack when removing more than available', async () => {
    const potion = makeInstance('healing-potion');
    await repo.addItem(PLAYER_ID, potion, 3);

    const removed = await repo.removeItem(PLAYER_ID, potion.instanceId, 10);
    expect(removed!.quantity).toBe(3);

    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(0);
  });

  it('returns null when removing from nonexistent player', async () => {
    const removed = await repo.removeItem('nobody', 'fake-id');
    expect(removed).toBeNull();
  });

  it('returns null when removing nonexistent item', async () => {
    const sword = makeInstance('rusty-sword');
    await repo.addItem(PLAYER_ID, sword);
    const removed = await repo.removeItem(PLAYER_ID, 'fake-id');
    expect(removed).toBeNull();
  });

  it('isolates stashes between players', async () => {
    const sword = makeInstance('rusty-sword');
    const shield = makeInstance('iron-shield');
    await repo.addItem(PLAYER_ID, sword);
    await repo.addItem(PLAYER_ID_2, shield);

    const stash1 = await repo.loadStash(PLAYER_ID);
    const stash2 = await repo.loadStash(PLAYER_ID_2);
    expect(stash1).toHaveLength(1);
    expect(stash2).toHaveLength(1);
    expect(stash1[0]!.instance.itemId).toBe('rusty-sword');
    expect(stash2[0]!.instance.itemId).toBe('iron-shield');
  });

  it('clears stash for a player', async () => {
    const sword = makeInstance('rusty-sword');
    const shield = makeInstance('iron-shield');
    await repo.addItem(PLAYER_ID, sword);
    await repo.addItem(PLAYER_ID, shield);

    await repo.clearStash(PLAYER_ID);
    const stash = await repo.loadStash(PLAYER_ID);
    expect(stash).toHaveLength(0);
  });

  it('returns default capacity', async () => {
    const cap = await repo.getCapacity(PLAYER_ID);
    expect(cap).toBe(DEFAULT_STASH_CAPACITY);
  });

  it('sets and retrieves custom capacity', async () => {
    await repo.setCapacity(PLAYER_ID, 500);
    const cap = await repo.getCapacity(PLAYER_ID);
    expect(cap).toBe(500);
  });

  it('lists player IDs with stash data', async () => {
    const sword = makeInstance('rusty-sword');
    await repo.addItem(PLAYER_ID, sword);
    await repo.addItem(PLAYER_ID_2, sword);

    const ids = await repo.listPlayerIds();
    expect(ids).toContain(PLAYER_ID);
    expect(ids).toContain(PLAYER_ID_2);
    expect(ids).toHaveLength(2);
  });
});

// ─── StashService Tests ─────────────────────────────────────────────────────

describe('StashService', () => {
  let repo: InMemoryStashRepository;
  let defs: Map<string, StashItem>;
  let service: StashService;

  beforeEach(() => {
    repo = new InMemoryStashRepository();
    defs = createTestItemDefs();
    service = new StashService(repo, defs);
  });

  describe('loadStash', () => {
    it('returns empty stash for new player', async () => {
      const view = await service.loadStash(PLAYER_ID);
      expect(view.entries).toHaveLength(0);
      expect(view.currentWeight).toBe(0);
      expect(view.maxWeight).toBe(DEFAULT_STASH_CAPACITY);
    });

    it('resolves item definitions when loading', async () => {
      const sword = makeInstance('rusty-sword');
      await repo.addItem(PLAYER_ID, sword);

      const view = await service.loadStash(PLAYER_ID);
      expect(view.entries).toHaveLength(1);
      expect(view.entries[0]!.definition.name).toBe('Rusty Sword');
      expect(view.entries[0]!.definition.weight).toBe(3.0);
    });

    it('calculates total weight correctly', async () => {
      const sword = makeInstance('rusty-sword'); // 3.0
      const shield = makeInstance('iron-shield'); // 5.0
      await repo.addItem(PLAYER_ID, sword, 2);
      await repo.addItem(PLAYER_ID, shield, 1);

      const view = await service.loadStash(PLAYER_ID);
      expect(view.currentWeight).toBeCloseTo(11.0); // 3*2 + 5*1
    });

    it('skips orphaned entries with missing definitions', async () => {
      const orphan: StashItemInstance = {
        instanceId: 'orphan-1',
        itemId: 'deleted-item',
        durability: null,
        maxDurability: null,
      };
      await repo.addItem(PLAYER_ID, orphan);

      const view = await service.loadStash(PLAYER_ID);
      expect(view.entries).toHaveLength(0);
    });
  });

  describe('storeItem', () => {
    it('stores item successfully', async () => {
      const sword = makeInstance('rusty-sword');
      const result = await service.storeItem(PLAYER_ID, sword);
      expect(result.ok).toBe(true);

      const stash = await repo.loadStash(PLAYER_ID);
      expect(stash).toHaveLength(1);
    });

    it('rejects unknown item definition', async () => {
      const unknown: StashItemInstance = {
        instanceId: 'unknown-1',
        itemId: 'nonexistent',
        durability: null,
        maxDurability: null,
      };
      const result = await service.storeItem(PLAYER_ID, unknown);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Unknown item type');
    });

    it('rejects item when stash would exceed capacity', async () => {
      await repo.setCapacity(PLAYER_ID, 10);

      const sword = makeInstance('rusty-sword'); // 3.0 each
      await service.storeItem(PLAYER_ID, sword, 3); // 9.0 total

      const shield = makeInstance('iron-shield'); // 5.0
      const result = await service.storeItem(PLAYER_ID, shield, 1);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Stash full');
    });

    it('allows storing up to exact capacity', async () => {
      await repo.setCapacity(PLAYER_ID, 3.0);

      const sword = makeInstance('rusty-sword'); // 3.0
      const result = await service.storeItem(PLAYER_ID, sword, 1);
      expect(result.ok).toBe(true);
    });

    it('stores multiple quantities', async () => {
      const potion = makeInstance('healing-potion');
      await service.storeItem(PLAYER_ID, potion, 5);

      const view = await service.loadStash(PLAYER_ID);
      expect(view.entries[0]!.quantity).toBe(5);
      expect(view.currentWeight).toBeCloseTo(2.5); // 0.5 * 5
    });
  });

  describe('takeItem', () => {
    it('takes item by exact name match', async () => {
      const sword = makeInstance('rusty-sword');
      await repo.addItem(PLAYER_ID, sword);

      const result = await service.takeItem(PLAYER_ID, 'Rusty Sword');
      expect(result.ok).toBe(true);
      expect(result.entry!.definition.name).toBe('Rusty Sword');
    });

    it('takes item by partial name match', async () => {
      const sword = makeInstance('rusty-sword');
      await repo.addItem(PLAYER_ID, sword);

      const result = await service.takeItem(PLAYER_ID, 'rusty');
      expect(result.ok).toBe(true);
      expect(result.entry!.definition.name).toBe('Rusty Sword');
    });

    it('takes item by instanceId', async () => {
      const sword = makeInstance('rusty-sword', 'my-sword-id');
      await repo.addItem(PLAYER_ID, sword);

      const result = await service.takeItem(PLAYER_ID, 'my-sword-id');
      expect(result.ok).toBe(true);
    });

    it('takes item by itemId', async () => {
      const sword = makeInstance('rusty-sword');
      await repo.addItem(PLAYER_ID, sword);

      const result = await service.takeItem(PLAYER_ID, 'rusty-sword');
      expect(result.ok).toBe(true);
    });

    it('decrements quantity when taking from stack', async () => {
      const potion = makeInstance('healing-potion');
      await repo.addItem(PLAYER_ID, potion, 5);

      const result = await service.takeItem(PLAYER_ID, 'potion');
      expect(result.ok).toBe(true);
      expect(result.entry!.quantity).toBe(1);

      const view = await service.loadStash(PLAYER_ID);
      expect(view.entries[0]!.quantity).toBe(4);
    });

    it('returns error for nonexistent item', async () => {
      const result = await service.takeItem(PLAYER_ID, 'phantom blade');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('No item matching');
    });

    it('returns error for empty stash', async () => {
      const result = await service.takeItem(PLAYER_ID, 'anything');
      expect(result.ok).toBe(false);
    });
  });

  describe('calculateWeight', () => {
    it('returns 0 for empty stash', async () => {
      const weight = await service.calculateWeight(PLAYER_ID);
      expect(weight).toBe(0);
    });

    it('sums weights correctly with quantities', async () => {
      const sword = makeInstance('rusty-sword');  // 3.0 each
      const potion = makeInstance('healing-potion'); // 0.5 each
      await repo.addItem(PLAYER_ID, sword, 2);
      await repo.addItem(PLAYER_ID, potion, 10);

      const weight = await service.calculateWeight(PLAYER_ID);
      expect(weight).toBeCloseTo(11.0); // 3*2 + 0.5*10
    });
  });

  describe('getStashSummary', () => {
    it('shows empty message for empty stash', async () => {
      const summary = await service.getStashSummary(PLAYER_ID);
      expect(summary).toContain('empty');
    });

    it('lists items with weight and tier', async () => {
      const sword = makeInstance('rusty-sword');
      const potion = makeInstance('healing-potion');
      await repo.addItem(PLAYER_ID, sword, 1);
      await repo.addItem(PLAYER_ID, potion, 3);

      const summary = await service.getStashSummary(PLAYER_ID);
      expect(summary).toContain('STASH');
      expect(summary).toContain('Rusty Sword');
      expect(summary).toContain('Healing Potion');
      expect(summary).toContain('x3');
      expect(summary).toContain('scrap');
      expect(summary).toContain('common');
    });

    it('shows durability for degradable items', async () => {
      const sword = makeInstance('rusty-sword');
      await repo.addItem(PLAYER_ID, sword, 1);

      const summary = await service.getStashSummary(PLAYER_ID);
      // Rusty Sword has durability
      expect(summary).toMatch(/\[\d+\/\d+\]/);
    });
  });

  describe('capacity upgrades', () => {
    it('uses default capacity initially', async () => {
      const view = await service.loadStash(PLAYER_ID);
      expect(view.maxWeight).toBe(DEFAULT_STASH_CAPACITY);
    });

    it('respects upgraded capacity', async () => {
      await repo.setCapacity(PLAYER_ID, 500);
      const view = await service.loadStash(PLAYER_ID);
      expect(view.maxWeight).toBe(500);
    });

    it('allows more items after capacity upgrade', async () => {
      await repo.setCapacity(PLAYER_ID, 5);

      const sword = makeInstance('rusty-sword'); // 3.0
      await service.storeItem(PLAYER_ID, sword, 1); // 3.0 total

      // Attempt to store another — should fail at capacity 5
      const shield = makeInstance('iron-shield'); // 5.0
      const result1 = await service.storeItem(PLAYER_ID, shield);
      expect(result1.ok).toBe(false);

      // Upgrade and retry
      await repo.setCapacity(PLAYER_ID, 50);
      const result2 = await service.storeItem(PLAYER_ID, shield);
      expect(result2.ok).toBe(true);
    });
  });

  describe('admin operations', () => {
    it('lists all player stashes', async () => {
      const sword = makeInstance('rusty-sword');
      const shield = makeInstance('iron-shield');
      await service.storeItem(PLAYER_ID, sword);
      await service.storeItem(PLAYER_ID_2, shield);

      const all = await service.listAllStashes();
      expect(all.size).toBe(2);
      expect(all.get(PLAYER_ID)!.entries[0]!.definition.name).toBe('Rusty Sword');
      expect(all.get(PLAYER_ID_2)!.entries[0]!.definition.name).toBe('Iron Shield');
    });
  });

  describe('persistence across operations', () => {
    it('stash survives multiple add/remove cycles', async () => {
      const sword = makeInstance('rusty-sword');
      const potion = makeInstance('healing-potion');

      // Store items
      await service.storeItem(PLAYER_ID, sword, 2);
      await service.storeItem(PLAYER_ID, potion, 5);

      // Take some
      await service.takeItem(PLAYER_ID, 'sword');
      await service.takeItem(PLAYER_ID, 'potion');
      await service.takeItem(PLAYER_ID, 'potion');

      // Verify remaining
      const view = await service.loadStash(PLAYER_ID);
      const swordEntry = view.entries.find(e => e.definition.id === 'rusty-sword');
      const potionEntry = view.entries.find(e => e.definition.id === 'healing-potion');

      expect(swordEntry!.quantity).toBe(1);
      expect(potionEntry!.quantity).toBe(3);
    });

    it('stash data accessible with new service instance (same repo)', async () => {
      const sword = makeInstance('rusty-sword');
      await service.storeItem(PLAYER_ID, sword, 3);

      // Create new service with same repo (simulates server restart with persisted data)
      const service2 = new StashService(repo, defs);
      const view = await service2.loadStash(PLAYER_ID);
      expect(view.entries).toHaveLength(1);
      expect(view.entries[0]!.quantity).toBe(3);
    });
  });

  describe('weight edge cases', () => {
    it('handles zero-weight items', async () => {
      const material: StashItem = {
        id: 'dust',
        name: 'Shimmer Dust',
        type: 'material',
        rarity: 'common',
        baseDurability: null,
        weight: 0,
        description: 'Weightless dust.',
      };
      defs.set('dust', material);

      const inst: StashItemInstance = {
        instanceId: 'dust-1',
        itemId: 'dust',
        durability: null,
        maxDurability: null,
      };
      const result = await service.storeItem(PLAYER_ID, inst, 1000);
      expect(result.ok).toBe(true);

      const weight = await service.calculateWeight(PLAYER_ID);
      expect(weight).toBe(0);
    });

    it('handles fractional weights', async () => {
      const shard = makeInstance('void-shard'); // 0.1 weight
      await service.storeItem(PLAYER_ID, shard, 7);

      const weight = await service.calculateWeight(PLAYER_ID);
      expect(weight).toBeCloseTo(0.7);
    });
  });
});
