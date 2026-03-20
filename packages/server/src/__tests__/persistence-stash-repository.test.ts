/**
 * StashRepository persistence tests — proactive for Issue #3.
 *
 * Contract tests for StashRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers CRUD, quantity
 * constraints, durability tracking, capacity management, and edge cases.
 *
 * Separate from stash.test.ts which tests StashService business logic.
 * These focus purely on the repository contract that any PG implementation
 * must also satisfy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { StashItemInstance } from '@ellmud/shared';
import {
  InMemoryStashRepository,
  DEFAULT_STASH_CAPACITY,
} from '../stash/index.js';
import type { StashRepository } from '../stash/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';
const PLAYER_C = 'player-ccc';

function makeSword(instanceId = 'sword-inst-1'): StashItemInstance {
  return {
    instanceId,
    itemId: 'rusty-sword',
    durability: 50,
    maxDurability: 50,
  };
}

function makePotion(instanceId = 'potion-inst-1'): StashItemInstance {
  return {
    instanceId,
    itemId: 'healing-potion',
    durability: null,
    maxDurability: null,
  };
}

function makeShield(instanceId = 'shield-inst-1'): StashItemInstance {
  return {
    instanceId,
    itemId: 'iron-shield',
    durability: 80,
    maxDurability: 80,
  };
}

function makeKeyItem(instanceId = 'key-inst-1'): StashItemInstance {
  return {
    instanceId,
    itemId: 'dungeon-key',
    durability: null,
    maxDurability: null,
  };
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

function stashRepositoryContractTests(createRepo: () => StashRepository) {
  let repo: StashRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── Basic CRUD ──

  describe('loadStash', () => {
    it('returns empty array for new player', async () => {
      expect(await repo.loadStash(PLAYER_A)).toEqual([]);
    });

    it('returns empty array for nonexistent player', async () => {
      expect(await repo.loadStash('ghost-player')).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('adds a single item with default quantity 1', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(1);
      expect(stash[0]!.instance.instanceId).toBe(sword.instanceId);
      expect(stash[0]!.quantity).toBe(1);
    });

    it('adds item with explicit quantity', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 10);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.quantity).toBe(10);
    });

    it('stacks same instanceId — quantity accumulates', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 3);
      await repo.addItem(PLAYER_A, potion, 7);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(1);
      expect(stash[0]!.quantity).toBe(10);
    });

    it('does NOT stack different instanceIds of same itemId', async () => {
      const potion1 = makePotion('potion-a');
      const potion2 = makePotion('potion-b');
      await repo.addItem(PLAYER_A, potion1, 1);
      await repo.addItem(PLAYER_A, potion2, 1);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(2);
    });

    it('stores multiple different items', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion());
      await repo.addItem(PLAYER_A, makeShield());

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(3);
    });
  });

  // ── Durability Tracking ──

  describe('durability tracking', () => {
    it('preserves durability on degradable items', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.instance.durability).toBe(50);
      expect(stash[0]!.instance.maxDurability).toBe(50);
    });

    it('preserves null durability on non-degradable items', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.instance.durability).toBeNull();
      expect(stash[0]!.instance.maxDurability).toBeNull();
    });

    it('stores partially damaged items (durability < maxDurability)', async () => {
      const damaged: StashItemInstance = {
        instanceId: 'damaged-sword',
        itemId: 'rusty-sword',
        durability: 25,
        maxDurability: 50,
      };
      await repo.addItem(PLAYER_A, damaged);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.instance.durability).toBe(25);
      expect(stash[0]!.instance.maxDurability).toBe(50);
    });

    it('stores zero-durability items (broken)', async () => {
      const broken: StashItemInstance = {
        instanceId: 'broken-sword',
        itemId: 'rusty-sword',
        durability: 0,
        maxDurability: 50,
      };
      await repo.addItem(PLAYER_A, broken);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.instance.durability).toBe(0);
    });
  });

  // ── removeItem ──

  describe('removeItem', () => {
    it('removes single item from stash', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword);

      const removed = await repo.removeItem(PLAYER_A, sword.instanceId, 1);
      expect(removed).not.toBeNull();
      expect(removed!.instance.instanceId).toBe(sword.instanceId);
      expect(removed!.quantity).toBe(1);

      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);
    });

    it('decrements quantity for partial removal', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 10);

      const removed = await repo.removeItem(PLAYER_A, potion.instanceId, 3);
      expect(removed!.quantity).toBe(3);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.quantity).toBe(7);
    });

    it('removes entire stack when removing >= available quantity', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 5);

      const removed = await repo.removeItem(PLAYER_A, potion.instanceId, 100);
      expect(removed!.quantity).toBe(5);
      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);
    });

    it('removes exact stack when removing exactly available quantity', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 5);

      const removed = await repo.removeItem(PLAYER_A, potion.instanceId, 5);
      expect(removed!.quantity).toBe(5);
      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);
    });

    it('defaults to removing 1 when quantity not specified', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 5);

      const removed = await repo.removeItem(PLAYER_A, potion.instanceId);
      expect(removed!.quantity).toBe(1);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.quantity).toBe(4);
    });

    it('returns null for nonexistent player', async () => {
      expect(await repo.removeItem('ghost', 'fake-id')).toBeNull();
    });

    it('returns null for nonexistent instanceId', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      expect(await repo.removeItem(PLAYER_A, 'nonexistent-id')).toBeNull();
    });

    it('does not affect other items when removing one', async () => {
      const sword = makeSword();
      const potion = makePotion();
      await repo.addItem(PLAYER_A, sword);
      await repo.addItem(PLAYER_A, potion, 3);

      await repo.removeItem(PLAYER_A, sword.instanceId);
      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(1);
      expect(stash[0]!.instance.itemId).toBe('healing-potion');
      expect(stash[0]!.quantity).toBe(3);
    });
  });

  // ── Capacity ──

  describe('capacity management', () => {
    it('returns default capacity for new player', async () => {
      expect(await repo.getCapacity(PLAYER_A)).toBe(DEFAULT_STASH_CAPACITY);
    });

    it('sets and retrieves custom capacity', async () => {
      await repo.setCapacity(PLAYER_A, 500);
      expect(await repo.getCapacity(PLAYER_A)).toBe(500);
    });

    it('overwrites previous capacity', async () => {
      await repo.setCapacity(PLAYER_A, 300);
      await repo.setCapacity(PLAYER_A, 600);
      expect(await repo.getCapacity(PLAYER_A)).toBe(600);
    });

    it('capacity is per-player', async () => {
      await repo.setCapacity(PLAYER_A, 100);
      await repo.setCapacity(PLAYER_B, 999);
      expect(await repo.getCapacity(PLAYER_A)).toBe(100);
      expect(await repo.getCapacity(PLAYER_B)).toBe(999);
      expect(await repo.getCapacity(PLAYER_C)).toBe(DEFAULT_STASH_CAPACITY);
    });
  });

  // ── clearStash ──

  describe('clearStash', () => {
    it('removes all items for a player', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_A, makePotion(), 5);
      await repo.addItem(PLAYER_A, makeShield());

      await repo.clearStash(PLAYER_A);
      expect(await repo.loadStash(PLAYER_A)).toEqual([]);
    });

    it('does not affect other players', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion());

      await repo.clearStash(PLAYER_A);
      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);
      expect(await repo.loadStash(PLAYER_B)).toHaveLength(1);
    });

    it('is safe to call on empty stash', async () => {
      await repo.clearStash('nobody');
      expect(await repo.loadStash('nobody')).toEqual([]);
    });

    it('is safe to call twice', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.clearStash(PLAYER_A);
      await repo.clearStash(PLAYER_A);
      expect(await repo.loadStash(PLAYER_A)).toEqual([]);
    });
  });

  // ── listPlayerIds ──

  describe('listPlayerIds', () => {
    it('returns empty list when no stashes exist', async () => {
      expect(await repo.listPlayerIds()).toEqual([]);
    });

    it('lists all players with stash data', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion());
      await repo.addItem(PLAYER_C, makeShield());

      const ids = await repo.listPlayerIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain(PLAYER_A);
      expect(ids).toContain(PLAYER_B);
      expect(ids).toContain(PLAYER_C);
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
    it('stashes are completely isolated between players', async () => {
      await repo.addItem(PLAYER_A, makeSword());
      await repo.addItem(PLAYER_B, makePotion(), 5);

      const stashA = await repo.loadStash(PLAYER_A);
      const stashB = await repo.loadStash(PLAYER_B);
      expect(stashA).toHaveLength(1);
      expect(stashA[0]!.instance.itemId).toBe('rusty-sword');
      expect(stashB).toHaveLength(1);
      expect(stashB[0]!.instance.itemId).toBe('healing-potion');
    });

    it('removing from one player does not affect another', async () => {
      const sharedSword = makeSword('shared-sword');
      await repo.addItem(PLAYER_A, sharedSword, 2);
      await repo.addItem(PLAYER_B, makeSword('other-sword'), 3);

      await repo.removeItem(PLAYER_A, 'shared-sword', 1);

      const stashA = await repo.loadStash(PLAYER_A);
      const stashB = await repo.loadStash(PLAYER_B);
      expect(stashA[0]!.quantity).toBe(1);
      expect(stashB[0]!.quantity).toBe(3);
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles adding then immediately removing same item', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword);
      const removed = await repo.removeItem(PLAYER_A, sword.instanceId);
      expect(removed).not.toBeNull();
      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);
    });

    it('handles re-adding an item after it was fully removed', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword, 2);
      await repo.removeItem(PLAYER_A, sword.instanceId, 2);
      expect(await repo.loadStash(PLAYER_A)).toHaveLength(0);

      await repo.addItem(PLAYER_A, sword, 1);
      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(1);
      expect(stash[0]!.quantity).toBe(1);
    });

    it('handles large quantity stacks', async () => {
      const potion = makePotion();
      await repo.addItem(PLAYER_A, potion, 999999);

      const stash = await repo.loadStash(PLAYER_A);
      expect(stash[0]!.quantity).toBe(999999);
    });

    it('handles many different items in one stash', async () => {
      for (let i = 0; i < 100; i++) {
        await repo.addItem(PLAYER_A, makePotion(`potion-${i}`));
      }
      const stash = await repo.loadStash(PLAYER_A);
      expect(stash).toHaveLength(100);
    });

    it('handles add with quantity 0 (degenerately)', async () => {
      const sword = makeSword();
      await repo.addItem(PLAYER_A, sword, 0);
      const stash = await repo.loadStash(PLAYER_A);
      // Adding 0 should still create an entry (implementation-defined)
      // but the quantity should reflect what was added
      if (stash.length > 0) {
        expect(stash[0]!.quantity).toBe(0);
      }
    });
  });

  // ── Concurrent-like Operations ──

  describe('concurrent-like operations', () => {
    it('parallel adds to different players do not interfere', async () => {
      await Promise.all([
        repo.addItem(PLAYER_A, makeSword(), 1),
        repo.addItem(PLAYER_B, makePotion(), 2),
        repo.addItem(PLAYER_C, makeShield(), 3),
      ]);

      expect((await repo.loadStash(PLAYER_A))[0]!.quantity).toBe(1);
      expect((await repo.loadStash(PLAYER_B))[0]!.quantity).toBe(2);
      expect((await repo.loadStash(PLAYER_C))[0]!.quantity).toBe(3);
    });

    it('parallel reads return consistent data', async () => {
      await repo.addItem(PLAYER_A, makeSword(), 5);

      const [r1, r2, r3] = await Promise.all([
        repo.loadStash(PLAYER_A),
        repo.loadStash(PLAYER_A),
        repo.loadStash(PLAYER_A),
      ]);
      expect(r1[0]!.quantity).toBe(5);
      expect(r2[0]!.quantity).toBe(5);
      expect(r3[0]!.quantity).toBe(5);
    });
  });
}

// ─── Run against InMemoryStashRepository ────────────────────────────────────

describe('InMemoryStashRepository — persistence contract', () => {
  stashRepositoryContractTests(() => new InMemoryStashRepository());
});
