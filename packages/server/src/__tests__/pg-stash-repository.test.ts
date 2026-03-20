/**
 * PgStashRepository — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgStashRepository } from '../stash/PgStashRepository.js';
import { DEFAULT_STASH_CAPACITY } from '../stash/StashRepository.js';
import type { StashItemInstance } from '@ellmud/shared';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(async () => mockClient),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

describe('PgStashRepository', () => {
  let repo: PgStashRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PgStashRepository();
  });

  // ─── loadStash ─────────────────────────────────────────────────────────────

  describe('loadStash', () => {
    it('should load and map stash entries', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [
          {
            id: 'entry-1',
            item_id: 'iron-ore',
            quantity: 5,
            durability: null,
            metadata: {},
          },
          {
            id: 'entry-2',
            item_id: 'sword-1',
            quantity: 1,
            durability: 80,
            metadata: { maxDurability: 100 },
          },
        ],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const entries = await repo.loadStash('player-1');

      expect(entries).toHaveLength(2);
      expect(entries[0].instance.instanceId).toBe('entry-1');
      expect(entries[0].instance.itemId).toBe('iron-ore');
      expect(entries[0].quantity).toBe(5);
      expect(entries[0].instance.durability).toBeNull();
      expect(entries[0].instance.maxDurability).toBeNull();

      expect(entries[1].instance.durability).toBe(80);
      expect(entries[1].instance.maxDurability).toBe(100);
    });

    it('should return empty array for empty stash', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const entries = await repo.loadStash('no-items');
      expect(entries).toHaveLength(0);
    });
  });

  // ─── addItem ───────────────────────────────────────────────────────────────

  describe('addItem', () => {
    const instance: StashItemInstance = {
      instanceId: 'inst-1',
      itemId: 'iron-ore',
      durability: null,
      maxDurability: null,
    };

    it('should insert new item when no existing stack', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing (none)
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await repo.addItem('player-1', instance, 3);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      // Verify INSERT was called (3rd call)
      const insertCall = mockClient.query.mock.calls[2];
      expect(insertCall[0]).toContain('INSERT INTO player_stash');
      expect(insertCall[1]).toEqual([
        'player-1',
        'iron-ore',
        3,
        null,
        '{}',
      ]);
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should stack onto existing item', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'existing-row' }] }) // SELECT existing
        .mockResolvedValueOnce({}) // UPDATE quantity
        .mockResolvedValueOnce({}); // COMMIT

      await repo.addItem('player-1', instance, 2);

      const updateCall = mockClient.query.mock.calls[2];
      expect(updateCall[0]).toContain('UPDATE player_stash');
      expect(updateCall[1]).toEqual([2, 'existing-row']);
    });

    it('should store maxDurability in metadata', async () => {
      const durableItem: StashItemInstance = {
        instanceId: 'inst-2',
        itemId: 'sword-1',
        durability: 100,
        maxDurability: 100,
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT existing (none)
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      await repo.addItem('player-1', durableItem, 1);

      const insertCall = mockClient.query.mock.calls[2];
      expect(insertCall[1]).toEqual([
        'player-1',
        'sword-1',
        1,
        100,
        JSON.stringify({ maxDurability: 100 }),
      ]);
    });
  });

  // ─── removeItem ────────────────────────────────────────────────────────────

  describe('removeItem', () => {
    it('should delete row when removing all quantity', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'entry-1',
            item_id: 'iron-ore',
            quantity: 3,
            durability: null,
            metadata: {},
          }],
        }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({}) // DELETE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await repo.removeItem('player-1', 'entry-1', 5);

      expect(result).not.toBeNull();
      expect(result!.quantity).toBe(3); // capped to actual quantity
      expect(mockClient.query.mock.calls[2][0]).toContain('DELETE');
    });

    it('should decrement quantity for partial removal', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({
          rows: [{
            id: 'entry-1',
            item_id: 'iron-ore',
            quantity: 10,
            durability: null,
            metadata: {},
          }],
        })
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}); // COMMIT

      const result = await repo.removeItem('player-1', 'entry-1', 3);

      expect(result!.quantity).toBe(3);
      const updateCall = mockClient.query.mock.calls[2];
      expect(updateCall[0]).toContain('UPDATE');
      expect(updateCall[1]).toEqual([3, 'entry-1']);
    });

    it('should return null for non-existent entry', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // SELECT (empty)
        .mockResolvedValueOnce({}); // ROLLBACK

      const result = await repo.removeItem('player-1', 'missing', 1);
      expect(result).toBeNull();
    });
  });

  // ─── getCapacity / setCapacity ─────────────────────────────────────────────

  describe('capacity', () => {
    it('should return default capacity when no row exists', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const cap = await repo.getCapacity('player-1');
      expect(cap).toBe(DEFAULT_STASH_CAPACITY);
    });

    it('should return stored capacity', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{ max_weight: 500 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const cap = await repo.getCapacity('player-1');
      expect(cap).toBe(500);
    });

    it('should upsert capacity', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repo.setCapacity('player-1', 300);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['player-1', 300],
      );
    });
  });

  // ─── clearStash / listPlayerIds ────────────────────────────────────────────

  describe('admin operations', () => {
    it('should clear stash for a player', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'DELETE',
        rowCount: 5,
        oid: 0,
        fields: [],
      });

      await repo.clearStash('player-1');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM player_stash'),
        ['player-1'],
      );
    });

    it('should list all player IDs with stash data', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [{ player_id: 'p1' }, { player_id: 'p2' }],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      const ids = await repo.listPlayerIds();
      expect(ids).toEqual(['p1', 'p2']);
    });
  });
});
