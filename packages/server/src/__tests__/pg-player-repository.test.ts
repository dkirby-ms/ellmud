/**
 * PgPlayerRepository — unit tests with mocked pg pool.
 *
 * Validates SQL generation and error mapping without a live database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgPlayerRepository } from '../auth/PgPlayerRepository.js';
import { DuplicateUsernameError } from '../auth/PlayerRepository.js';

// ─── Mock pg pool ────────────────────────────────────────────────────────────

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../db/index.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(async () => mockClient),
}));

// Import the mocked module after mocking
const { query: mockQuery } = await import('../db/index.js');
const queryMock = vi.mocked(mockQuery);

describe('PgPlayerRepository', () => {
  let repo: PgPlayerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new PgPlayerRepository();
  });

  // ─── createPlayer ──────────────────────────────────────────────────────────

  describe('createPlayer', () => {
    it('should insert identity and player in a transaction', async () => {
      const identityId = 'ident-1';
      const playerId = 'player-1';
      const now = new Date();

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: identityId }] }) // INSERT identity
        .mockResolvedValueOnce({
          rows: [{
            id: playerId,
            identity_id: identityId,
            username: 'TestUser',
            created_at: now,
            updated_at: now,
          }],
        }) // INSERT player
        .mockResolvedValueOnce({}); // COMMIT

      const result = await repo.createPlayer('TestUser', 'hashed_pw');

      expect(result.id).toBe(playerId);
      expect(result.identity_id).toBe(identityId);
      expect(result.username).toBe('TestUser');
      expect(result.passwordHash).toBe('hashed_pw');
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should throw DuplicateUsernameError on unique violation', async () => {
      const pgError = Object.assign(new Error('unique violation'), {
        code: '23505',
        constraint: 'uq_player_username',
      });

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'ident-1' }] }) // INSERT identity
        .mockRejectedValueOnce(pgError); // INSERT player fails

      await expect(repo.createPlayer('TakenUser', 'hash'))
        .rejects.toThrow(DuplicateUsernameError);

      // Should have rolled back
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalledOnce();
    });

    it('should re-throw unexpected errors', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('connection reset'));

      await expect(repo.createPlayer('Foo', 'bar'))
        .rejects.toThrow('connection reset');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ─── findByUsername ────────────────────────────────────────────────────────

  describe('findByUsername', () => {
    it('should return player with password hash', async () => {
      const now = new Date();
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'p-1',
          identity_id: 'i-1',
          username: 'Alice',
          created_at: now,
          updated_at: now,
          password_hash: 'hashed',
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.findByUsername('Alice');

      expect(result).not.toBeNull();
      expect(result!.username).toBe('Alice');
      expect(result!.passwordHash).toBe('hashed');
    });

    it('should return null when not found', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repo.findByUsername('Nobody');
      expect(result).toBeNull();
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return player without password hash', async () => {
      const now = new Date();
      queryMock.mockResolvedValueOnce({
        rows: [{
          id: 'p-1',
          identity_id: 'i-1',
          username: 'Bob',
          created_at: now,
          updated_at: now,
        }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      });

      const result = await repo.findById('p-1');

      expect(result).not.toBeNull();
      expect(result!.username).toBe('Bob');
      // Should not have passwordHash
      expect('passwordHash' in result!).toBe(false);
    });

    it('should return null for missing player', async () => {
      queryMock.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      });

      const result = await repo.findById('missing-id');
      expect(result).toBeNull();
    });
  });
});
