/**
 * Player Inventory Persistence tests — Issue #409.
 *
 * Covers: PlayerInventoryRepository CRUD, save/load lifecycle,
 * player isolation, edge cases, and helper utilities.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPlayerInventoryRepository,
  inventoryToEntries,
} from '../inventory/index.js';
import type {
  PlayerInventoryRepository,
  InventoryItemEntry,
} from '../inventory/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';

function makeSword(): InventoryItemEntry {
  return {
    itemId: 'rusty-sword',
    name: 'Rusty Sword',
    weight: 3.0,
    description: 'A blade that has seen better days.',
    quantity: 1,
    durability: 50,
    metadata: {},
  };
}

function makePotion(quantity = 1): InventoryItemEntry {
  return {
    itemId: 'healing-potion',
    name: 'Healing Potion',
    weight: 0.5,
    description: 'A vial of restorative liquid.',
    quantity,
    durability: null,
    metadata: {},
  };
}

function makeShield(): InventoryItemEntry {
  return {
    itemId: 'iron-shield',
    name: 'Iron Shield',
    weight: 5.0,
    description: 'A heavy shield of beaten iron.',
    quantity: 1,
    durability: 80,
    metadata: {},
  };
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

function inventoryRepositoryContractTests(createRepo: () => PlayerInventoryRepository) {
  let repo: PlayerInventoryRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── Basic CRUD ──

  describe('loadInventory', () => {
    it('returns empty array for new player', async () => {
      expect(await repo.loadInventory(PLAYER_A)).toEqual([]);
    });

    it('returns empty array for nonexistent player', async () => {
      expect(await repo.loadInventory('ghost-player')).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('adds a single item', async () => {
      await repo.addItem(PLAYER_A, makeSword());

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.itemId).toBe('rusty-sword');
      expect(inv[0]!.quantity).toBe(1);
    });

    it('stacks same itemId — quantity accumulates', async () => {
      await repo.addItem(PLAYER_A, makePotion(3));
      await repo.addItem(PLAYER_A, makePotion(7));

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.quantity).toBe(10);
    });

    it('stores multiple different items', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion());
      await repo.addItem(PLAYER_A, makeShield());

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(3);
    });
  });

  describe('saveInventory', () => {
    it('replaces entire inventory', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makeShield());

      // Replace with just a potion
      await repo.saveInventory(PLAYER_A, [makePotion(5)]);
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.itemId).toBe('healing-potion');
      expect(inv[0]!.quantity).toBe(5);
    });

    it('clears inventory when saving empty array', async () => {
      await repo.addItem(PLAYER_A, makeSword());

      await repo.saveInventory(PLAYER_A, []);
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(0);
    });

    it('saves multiple items at once', async () => {
      await repo.saveInventory(PLAYER_A, [makeSword(), makePotion(3), makeShield()]);
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(3);
    });
  });

  // ── removeItem ──

  describe('removeItem', () => {
    it('removes single item from inventory', async () => {
      await repo.addItem(PLAYER_A, makeSword());

      const removed = await repo.removeItem(PLAYER_A, 'rusty-sword', 1);
      expect(removed).not.toBeNull();
      expect(removed!.itemId).toBe('rusty-sword');
      expect(removed!.quantity).toBe(1);

      expect(await repo.loadInventory(PLAYER_A)).toHaveLength(0);
    });

    it('decrements quantity for partial removal', async () => {
      await repo.addItem(PLAYER_A, makePotion(10));

      const removed = await repo.removeItem(PLAYER_A, 'healing-potion', 3);
      expect(removed!.quantity).toBe(3);

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.quantity).toBe(7);
    });

    it('removes entire stack when removing >= available quantity', async () => {
      await repo.addItem(PLAYER_A, makePotion(5));

      const removed = await repo.removeItem(PLAYER_A, 'healing-potion', 100);
      expect(removed!.quantity).toBe(5);
      expect(await repo.loadInventory(PLAYER_A)).toHaveLength(0);
    });

    it('defaults to removing 1 when quantity not specified', async () => {
      await repo.addItem(PLAYER_A, makePotion(5));

      const removed = await repo.removeItem(PLAYER_A, 'healing-potion');
      expect(removed!.quantity).toBe(1);

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.quantity).toBe(4);
    });

    it('returns null for nonexistent player', async () => {
      expect(await repo.removeItem('ghost', 'fake-id')).toBeNull();
    });

    it('returns null for nonexistent itemId', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      expect(await repo.removeItem(PLAYER_A, 'nonexistent-id')).toBeNull();
    });

    it('does not affect other items when removing one', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion(3));

      await repo.removeItem(PLAYER_A, 'rusty-sword');
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.itemId).toBe('healing-potion');
      expect(inv[0]!.quantity).toBe(3);
    });
  });

  // ── clearInventory ──

  describe('clearInventory', () => {
    it('removes all items for a player', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion(5));
      await repo.addItem(PLAYER_A, makeShield());

      await repo.clearInventory(PLAYER_A);
      expect(await repo.loadInventory(PLAYER_A)).toEqual([]);
    });

    it('does not affect other players', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion());

      await repo.clearInventory(PLAYER_A);
      expect(await repo.loadInventory(PLAYER_A)).toHaveLength(0);
      expect(await repo.loadInventory(PLAYER_B)).toHaveLength(1);
    });

    it('is safe to call on empty inventory', async () => {
      await repo.clearInventory('nobody');
      expect(await repo.loadInventory('nobody')).toEqual([]);
    });
  });

  // ── listPlayerIds ──

  describe('listPlayerIds', () => {
    it('returns empty list when no inventories exist', async () => {
      expect(await repo.listPlayerIds()).toEqual([]);
    });

    it('lists all players with inventory data', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion());

      const ids = await repo.listPlayerIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(PLAYER_A);
      expect(ids).toContain(PLAYER_B);
    });

    it('does not duplicate player IDs', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion());

      const ids = await repo.listPlayerIds();
      expect(ids).toHaveLength(1);
      expect(ids[0]).toBe(PLAYER_A);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('inventories are completely isolated between players', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion(5));

      const invA = await repo.loadInventory(PLAYER_A);
      const invB = await repo.loadInventory(PLAYER_B);
      expect(invA).toHaveLength(1);
      expect(invA[0]!.itemId).toBe('rusty-sword');
      expect(invB).toHaveLength(1);
      expect(invB[0]!.itemId).toBe('healing-potion');
    });

    it('removing from one player does not affect another', async () => {
      await repo.addItem(PLAYER_A, makePotion(2));
      await repo.addItem(PLAYER_B, makePotion(3));

      await repo.removeItem(PLAYER_A, 'healing-potion', 1);

      const invA = await repo.loadInventory(PLAYER_A);
      const invB = await repo.loadInventory(PLAYER_B);
      expect(invA[0]!.quantity).toBe(1);
      expect(invB[0]!.quantity).toBe(3);
    });
  });

  // ── Persistence Across Operations ──

  describe('persistence across operations', () => {
    it('inventory survives multiple add/remove cycles', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion(5));

      await repo.removeItem(PLAYER_A, 'rusty-sword');
      await repo.removeItem(PLAYER_A, 'healing-potion', 2);

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.itemId).toBe('healing-potion');
      expect(inv[0]!.quantity).toBe(3);
    });

    it('saveInventory then loadInventory round-trips correctly', async () => {
      const items = [makeSword(), makePotion(3), makeShield()];
      await repo.saveInventory(PLAYER_A, items);

      const loaded = await repo.loadInventory(PLAYER_A);
      expect(loaded).toHaveLength(3);

      const sword = loaded.find(e => e.itemId === 'rusty-sword');
      const potion = loaded.find(e => e.itemId === 'healing-potion');
      const shield = loaded.find(e => e.itemId === 'iron-shield');
      expect(sword!.quantity).toBe(1);
      expect(potion!.quantity).toBe(3);
      expect(shield!.quantity).toBe(1);
    });

    it('handles re-adding an item after full removal', async () => {
      await repo.addItem(PLAYER_A, makePotion(2));
      await repo.removeItem(PLAYER_A, 'healing-potion', 2);
      expect(await repo.loadInventory(PLAYER_A)).toHaveLength(0);

      await repo.addItem(PLAYER_A, makePotion(1));
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(1);
      expect(inv[0]!.quantity).toBe(1);
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles large quantity stacks', async () => {
      await repo.addItem(PLAYER_A, makePotion(999999));
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.quantity).toBe(999999);
    });

    it('handles many different items', async () => {
      for (let i = 0; i < 50; i++) {
        await repo.addItem(PLAYER_A, {
          itemId: `item-${i}`,
          name: `Item ${i}`,
          weight: 1,
          description: '',
          quantity: 1,
          durability: null,
          metadata: {},
        });
      }
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv).toHaveLength(50);
    });

    it('preserves item metadata through save/load', async () => {
      const item = makeSword();
      item.metadata = { enchantment: 'fire', level: 3 };
      await repo.addItem(PLAYER_A, item);

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.metadata).toEqual({ enchantment: 'fire', level: 3 });
    });

    it('preserves durability values through save/load', async () => {
      const item = makeSword();
      item.durability = 25;
      await repo.addItem(PLAYER_A, item);

      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.durability).toBe(25);
    });

    it('preserves null durability through save/load', async () => {
      await repo.addItem(PLAYER_A, makePotion());
      const inv = await repo.loadInventory(PLAYER_A);
      expect(inv[0]!.durability).toBeNull();
    });
  });

  // ── Concurrent-like Operations ──

  describe('concurrent-like operations', () => {
    it('parallel adds to different players do not interfere', async () => {
      await Promise.all([
        repo.addItem(PLAYER_A, makeSword()),
        repo.addItem(PLAYER_B, makePotion(2)),
      ]);

      expect((await repo.loadInventory(PLAYER_A))[0]!.quantity).toBe(1);
      expect((await repo.loadInventory(PLAYER_B))[0]!.quantity).toBe(2);
    });

    it('parallel reads return consistent data', async () => {
      await repo.addItem(PLAYER_A, makePotion(5));

      const [r1, r2, r3] = await Promise.all([
        repo.loadInventory(PLAYER_A),
        repo.loadInventory(PLAYER_A),
        repo.loadInventory(PLAYER_A),
      ]);
      expect(r1[0]!.quantity).toBe(5);
      expect(r2[0]!.quantity).toBe(5);
      expect(r3[0]!.quantity).toBe(5);
    });
  });
}

// ─── Run Against InMemoryPlayerInventoryRepository ──────────────────────────

describe('InMemoryPlayerInventoryRepository — persistence contract', () => {
  inventoryRepositoryContractTests(() => new InMemoryPlayerInventoryRepository());
});

// ─── inventoryToEntries Helper Tests ────────────────────────────────────────

describe('inventoryToEntries', () => {
  it('converts empty inventory to empty array', () => {
    const inv = new Map();
    expect(inventoryToEntries(inv)).toEqual([]);
  });

  it('converts inventory entries to persistence format', () => {
    const inv = new Map<string, { item: { id: string; name: string; weight: number; description: string }; quantity: number }>();
    inv.set('rusty-sword', {
      item: { id: 'rusty-sword', name: 'Rusty Sword', weight: 3.0, description: 'A blade.' },
      quantity: 2,
    });

    const entries = inventoryToEntries(inv);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.itemId).toBe('rusty-sword');
    expect(entries[0]!.name).toBe('Rusty Sword');
    expect(entries[0]!.weight).toBe(3.0);
    expect(entries[0]!.quantity).toBe(2);
  });

  it('converts multiple items', () => {
    const inv = new Map<string, { item: { id: string; name: string; weight: number; description: string }; quantity: number }>();
    inv.set('sword', {
      item: { id: 'sword', name: 'Sword', weight: 3, description: '' },
      quantity: 1,
    });
    inv.set('potion', {
      item: { id: 'potion', name: 'Potion', weight: 0.5, description: '' },
      quantity: 5,
    });

    const entries = inventoryToEntries(inv);
    expect(entries).toHaveLength(2);
  });
});
