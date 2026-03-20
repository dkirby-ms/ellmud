/**
 * Database module — unit tests for migration runner and query helpers.
 *
 * Tests the runMigrations logic with a mocked pg pool, verifying
 * idempotency, transaction handling, and error rollback.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';

// ─── Mock fs/promises and pg ─────────────────────────────────────────────────

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

const mockPoolClient = {
  query: vi.fn(),
  release: vi.fn(),
};

const mockPool = {
  query: vi.fn(),
  connect: vi.fn(async () => mockPoolClient),
  end: vi.fn(),
  on: vi.fn(),
};

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(() => mockPool),
  },
}));

describe('Database module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runMigrations', () => {
    it('should create _migrations table and apply pending migrations', async () => {
      const readdirMock = vi.mocked(readdir);
      const readFileMock = vi.mocked(readFile);

      readdirMock.mockResolvedValueOnce([
        '001_create_players.sql',
        '002_create_items.sql',
      ] as unknown as Awaited<ReturnType<typeof readdir>>);

      // First migration already applied, second is new
      mockPool.query
        .mockResolvedValueOnce({}) // CREATE TABLE _migrations
        .mockResolvedValueOnce({ rowCount: 1 }) // SELECT for 001 (already applied)
        .mockResolvedValueOnce({ rowCount: 0 }); // SELECT for 002 (not applied)

      readFileMock.mockResolvedValueOnce('CREATE TABLE items (...);');

      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // migration SQL
        .mockResolvedValueOnce({}) // INSERT into _migrations
        .mockResolvedValueOnce({}); // COMMIT

      // Dynamic import to get the mocked module
      const { runMigrations } = await import('../db/index.js');
      await runMigrations();

      // Should have skipped 001 and applied 002
      expect(readFileMock).toHaveBeenCalledTimes(1);
      expect(mockPoolClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockPoolClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockPoolClient.release).toHaveBeenCalled();
    });

    it('should rollback on migration failure', async () => {
      const readdirMock = vi.mocked(readdir);
      const readFileMock = vi.mocked(readFile);

      readdirMock.mockResolvedValueOnce([
        '001_bad.sql',
      ] as unknown as Awaited<ReturnType<typeof readdir>>);

      mockPool.query
        .mockResolvedValueOnce({}) // CREATE TABLE _migrations
        .mockResolvedValueOnce({ rowCount: 0 }); // SELECT (not applied)

      readFileMock.mockResolvedValueOnce('INVALID SQL;');

      mockPoolClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('syntax error')); // migration fails

      const { runMigrations } = await import('../db/index.js');
      await expect(runMigrations()).rejects.toThrow('syntax error');

      expect(mockPoolClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockPoolClient.release).toHaveBeenCalled();
    });
  });
});
