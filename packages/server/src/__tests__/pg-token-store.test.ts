/**
 * PgTokenStore — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgTokenStore } from '../auth/PgTokenStore.js';

import type { QueryResultRow } from 'pg';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockQueryResult(rows: QueryResultRow[] = [], rowCount?: number) {
  return {
    rows,
    command: 'SELECT',
    rowCount: rowCount ?? rows.length,
    oid: 0,
    fields: [],
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PgTokenStore', () => {
  let store: PgTokenStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new PgTokenStore();
  });

  // ─── set ───────────────────────────────────────────────────────────────────

  describe('set', () => {
    it('should insert a token with TTL via UPSERT', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      await store.set('tok-abc', { playerId: 'p1', username: 'volo' }, 3600);

      expect(queryMock).toHaveBeenCalledOnce();
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO auth_tokens'),
        ['tok-abc', 'p1', 'volo', 3600],
      );
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array),
      );
    });
  });

  // ─── get ───────────────────────────────────────────────────────────────────

  describe('get', () => {
    it('should return token data for a valid non-expired token', async () => {
      queryMock.mockResolvedValueOnce(
        mockQueryResult([{ player_id: 'p1', username: 'volo' }]),
      );

      const result = await store.get('tok-abc');

      expect(result).toEqual({ playerId: 'p1', username: 'volo' });
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('expires_at > now()'),
        ['tok-abc'],
      );
    });

    it('should return null for expired or missing token', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      const result = await store.get('tok-expired');

      expect(result).toBeNull();
    });
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete the token by key', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([]));

      await store.delete('tok-abc');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM auth_tokens'),
        ['tok-abc'],
      );
    });
  });

  // ─── cleanup ───────────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('should delete expired tokens and return count', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 5));

      const removed = await store.cleanup();

      expect(removed).toBe(5);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('expires_at < now()'),
      );
    });

    it('should return 0 when no tokens are expired', async () => {
      queryMock.mockResolvedValueOnce(mockQueryResult([], 0));

      const removed = await store.cleanup();

      expect(removed).toBe(0);
    });
  });
});
