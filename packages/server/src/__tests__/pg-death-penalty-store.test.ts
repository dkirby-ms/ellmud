/**
 * PgDeathPenaltyStore — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgDeathPenaltyStore } from '../systems/PgDeathPenaltyStore.js';

import type { QueryResultRow } from 'pg';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockQueryResult(rows: QueryResultRow[] = []) {
  return {
    rows,
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PgDeathPenaltyStore', () => {
  let store: PgDeathPenaltyStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PgDeathPenaltyStore();
  });

  // ─── getDeathCount ─────────────────────────────────────────────────────────

  describe('getDeathCount', () => {
    it('should return death count from DB', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{ death_count: 3 }]));

      const count = await store.getDeathCount('p1');

      expect(count).toBe(3);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('SELECT death_count'),
        ['p1'],
      );
    });

    it('should return 0 for unknown player', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const count = await store.getDeathCount('unknown');

      expect(count).toBe(0);
    });
  });

  // ─── incrementDeathCount ───────────────────────────────────────────────────

  describe('incrementDeathCount', () => {
    it('should upsert and return new count for first death', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{ death_count: 1 }]));

      const count = await store.incrementDeathCount('p1');

      expect(count).toBe(1);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        ['p1'],
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING death_count'),
        expect.any(Array),
      );
    });

    it('should increment and return updated count', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([{ death_count: 5 }]));

      const count = await store.incrementDeathCount('p1');

      expect(count).toBe(5);
    });
  });

  // ─── resetDeathCount ───────────────────────────────────────────────────────

  describe('resetDeathCount', () => {
    it('should delete the player record', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      await store.resetDeathCount('p1');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM player_death_penalty'),
        ['p1'],
      );
    });
  });

  // ─── getLastDeathTime ──────────────────────────────────────────────────────

  describe('getLastDeathTime', () => {
    it('should return timestamp when present', async () => {
      queryMock.mockResolvedValueOnce(
        mockQueryResult([{ last_death_at: '1700000000000' }]),
      );

      const time = await store.getLastDeathTime('p1');

      expect(time).toBe(1700000000000);
    });

    it('should return null for unknown player', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const time = await store.getLastDeathTime('unknown');

      expect(time).toBeNull();
    });

    it('should return null when last_death_at is null', async () => {
      queryMock.mockResolvedValueOnce(
        mockQueryResult([{ last_death_at: null }]),
      );

      const time = await store.getLastDeathTime('p1');

      expect(time).toBeNull();
    });
  });

  // ─── setLastDeathTime ──────────────────────────────────────────────────────

  describe('setLastDeathTime', () => {
    it('should upsert the last death timestamp', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      await store.setLastDeathTime('p1', 1700000000000);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO player_death_penalty'),
        ['p1', 1700000000000],
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array),
      );
    });
  });
});
