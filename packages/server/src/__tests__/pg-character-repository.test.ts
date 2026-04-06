/**
 * PgCharacterRepository — unit tests with mocked pg pool.
 *
 * Validates SQL generation and data mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgCharacterRepository } from '../character/PgCharacterRepository.js';

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

describe('PgCharacterRepository', () => {
  let repo: PgCharacterRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PgCharacterRepository();
  });

  // ─── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('inserts a character and returns the row', async () => {
      const now = new Date();
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'char-1',
          player_id: 'player-1',
          name: 'Drizzt',
          starting_zone_slug: 'the-bloom-observatory',
          faction_slug: null,
          is_active: false,
          created_at: now,
          last_played_at: null,
          deleted_at: null,
        }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.create('player-1', 'Drizzt', 'the-bloom-observatory');

      expect(result.id).toBe('char-1');
      expect(result.name).toBe('Drizzt');
      expect(result.startingZoneSlug).toBe('the-bloom-observatory');
      expect(result.factionSlug).toBeNull();
      expect(result.playerId).toBe('player-1');
      expect(result.isActive).toBe(false);
      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO characters'),
        ['player-1', 'Drizzt', 'the-bloom-observatory'],
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns character row when found', async () => {
      const now = new Date();
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'char-1',
          player_id: 'player-1',
          name: 'Drizzt',
          starting_zone_slug: 'the-bloom-observatory',
          faction_slug: null,
          is_active: true,
          created_at: now,
          last_played_at: null,
          deleted_at: null,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.getById('char-1');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Drizzt');
      expect(result!.isActive).toBe(true);
    });

    it('returns null when not found', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repo.getById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── setActive ─────────────────────────────────────────────────────────────

  describe('setActive', () => {
    it('deactivates all then activates target in a transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE all to false
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE target to true
        .mockResolvedValueOnce({}); // COMMIT

      await repo.setActive('player-1', 'char-1');

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query.mock.calls[0][0]).toBe('BEGIN');
      expect(mockClient.query.mock.calls[1][0]).toContain('is_active = false');
      expect(mockClient.query.mock.calls[2][0]).toContain('is_active = true');
      expect(mockClient.query.mock.calls[3][0]).toBe('COMMIT');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('rolls back and throws when character not found', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // UPDATE all to false
        .mockResolvedValueOnce({ rowCount: 0 }) // UPDATE target (not found)
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(repo.setActive('player-1', 'missing')).rejects.toThrow('not found');
      expect(mockClient.query.mock.calls[3][0]).toBe('ROLLBACK');
    });
  });

  // ─── softDelete ────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets deleted_at and is_active=false', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      await repo.softDelete('char-1');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = now()'),
        ['char-1'],
      );
    });

    it('throws when character not found', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      await expect(repo.softDelete('missing')).rejects.toThrow('not found');
    });
  });

  // ─── getActive ─────────────────────────────────────────────────────────────

  describe('getActive', () => {
    it('returns the active character', async () => {
      const now = new Date();
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'char-1',
          player_id: 'player-1',
          name: 'Drizzt',
          starting_zone_slug: 'the-bloom-observatory',
          faction_slug: null,
          is_active: true,
          created_at: now,
          last_played_at: null,
          deleted_at: null,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.getActive('player-1');
      expect(result).not.toBeNull();
      expect(result!.isActive).toBe(true);
    });

    it('returns null when no active character', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repo.getActive('player-1');
      expect(result).toBeNull();
    });
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('queries characters, factions, skills, and runs', async () => {
      const now = new Date();

      // Characters query
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'char-1',
          player_id: 'player-1',
          name: 'Drizzt',
          starting_zone_slug: 'the-bloom-observatory',
          faction_slug: 'bloom-tenders',
          is_active: true,
          created_at: now,
          last_played_at: null,
          deleted_at: null,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Factions query
      queryMock.mockResolvedValueOnce({
        rows: [
          { slug: 'bloom-tenders', name: 'The Bloom Tenders' },
          { slug: 'kindari', name: 'The Kindari' },
        ],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      });

      // Skills for char-1
      queryMock.mockResolvedValueOnce({
        rows: [{ skill_name: 'stealth', level: 15 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      // Run count for char-1
      queryMock.mockResolvedValueOnce({
        rows: [{ total_runs: 7 }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.list('player-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Drizzt');
      expect(result[0].factionName).toBe('The Bloom Tenders');
      expect(result[0].topSkills).toEqual([{ name: 'stealth', level: 15 }]);
      expect(result[0].totalRuns).toBe(7);
    });
  });
});
