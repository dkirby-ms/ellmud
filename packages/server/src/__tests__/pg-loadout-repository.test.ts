/**
 * PgLoadoutRepository — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgLoadoutRepository } from '../loadout/PgLoadoutRepository.js';
import { createEmptyLoadoutData } from '../loadout/LoadoutRepository.js';
import type { StashItemInstance } from '@ellmud/shared';
import { EQUIPMENT_SLOT_ORDER } from '@ellmud/shared';

import type { QueryResultRow } from 'pg';

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockQueryResult(rows: QueryResultRow[] = [], command = 'SELECT') {
  return {
    rows,
    command,
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

const sword: StashItemInstance = {
  instanceId: 'inst-sword-1',
  itemId: 'sword-def-id',
  durability: 80,
  maxDurability: 100,
};

const shield: StashItemInstance = {
  instanceId: 'inst-shield-1',
  itemId: 'shield-def-id',
  durability: null,
  maxDurability: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PgLoadoutRepository', () => {
  let repo: PgLoadoutRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PgLoadoutRepository();
  });

  // ─── load ──────────────────────────────────────────────────────────────────

  describe('load', () => {
    it('should return empty loadout for unknown player', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const loadout = await repo.load('unknown-player');

      const empty = createEmptyLoadoutData();
      expect(loadout).toEqual(empty);
      for (const slot of EQUIPMENT_SLOT_ORDER) {
        expect(loadout[slot]).toBeNull();
      }
    });

    it('should reconstruct loadout from DB rows', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([
        {
          slot: 'weapon',
          instance_id: 'inst-sword-1',
          item_id: 'sword-def-id',
          metadata: { durability: 80, maxDurability: 100 },
        },
        {
          slot: 'offhand',
          instance_id: 'inst-shield-1',
          item_id: 'shield-def-id',
          metadata: {},
        },
      ]));

      const loadout = await repo.load('player-1');

      expect(loadout.weapon).toEqual(sword);
      expect(loadout.offhand).toEqual(shield);
      expect(loadout.head).toBeNull();
    });
  });

  // ─── setSlot ───────────────────────────────────────────────────────────────

  describe('setSlot', () => {
    it('should upsert an item into a slot', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 'INSERT'));

      await repo.setSlot('player-1', 'weapon', sword);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['player-1', 'weapon', 'inst-sword-1', 'sword-def-id', JSON.stringify({ durability: 80, maxDurability: 100 })],
      );
    });

    it('should delete a slot when item is null', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 'DELETE'));

      await repo.setSlot('player-1', 'weapon', null);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM player_loadout'),
        ['player-1', 'weapon'],
      );
    });
  });

  // ─── getSlot ───────────────────────────────────────────────────────────────

  describe('getSlot', () => {
    it('should return the item in a slot', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{
        instance_id: 'inst-sword-1',
        item_id: 'sword-def-id',
        metadata: { durability: 80, maxDurability: 100 },
      }]));

      const item = await repo.getSlot('player-1', 'weapon');
      expect(item).toEqual(sword);
    });

    it('should return null for empty slot', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const item = await repo.getSlot('player-1', 'weapon');
      expect(item).toBeNull();
    });
  });

  // ─── save ──────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('should overwrite all slots via transaction', async () => {
      const loadout = createEmptyLoadoutData();
      loadout.weapon = sword;
      loadout.offhand = shield;

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE all
        .mockResolvedValueOnce({}) // INSERT weapon
        .mockResolvedValueOnce({}) // INSERT offhand
        .mockResolvedValueOnce({}); // COMMIT

      await repo.save('player-1', loadout);

      expect(mockClient.query).toHaveBeenCalledTimes(5);
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
      expect(mockClient.query.mock.calls[1][0]).toContain('DELETE FROM player_loadout');
      expect(mockClient.query.mock.calls[2][0]).toContain('INSERT INTO player_loadout');
      expect(mockClient.query.mock.calls[3][0]).toContain('INSERT INTO player_loadout');
      expect(mockClient.query.mock.calls[4][0]).toBe('COMMIT');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should rollback on error', async () => {
      const loadout = createEmptyLoadoutData();
      loadout.weapon = sword;

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE all
        .mockRejectedValueOnce(new Error('insert failed')); // INSERT throws

      await expect(repo.save('player-1', loadout)).rejects.toThrow('insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });
  });

  // ─── clear ─────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('should delete all loadout data for a player', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 'DELETE'));

      await repo.clear('player-1');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM player_loadout'),
        ['player-1'],
      );
    });
  });

  // ─── listPlayerIds ─────────────────────────────────────────────────────────

  describe('listPlayerIds', () => {
    it('should return distinct player IDs', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([
        { player_id: 'p1' },
        { player_id: 'p2' },
        { player_id: 'p3' },
      ]));

      const ids = await repo.listPlayerIds();
      expect(ids).toEqual(['p1', 'p2', 'p3']);
    });

    it('should return empty array when no loadouts exist', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const ids = await repo.listPlayerIds();
      expect(ids).toEqual([]);
    });
  });
});
