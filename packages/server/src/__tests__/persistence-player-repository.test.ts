/**
 * PlayerRepository persistence tests — proactive for Issue #3.
 *
 * Validates the PlayerRepository contract against in-memory implementation.
 * These tests will also validate any future PostgreSQL implementation
 * by swapping the repository instance (same interface, same expectations).
 *
 * Covers: CRUD operations, username uniqueness, identity linkage,
 * case-insensitive lookups, findById stripping sensitive data, edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryPlayerRepository,
  DuplicateUsernameError,
} from '../auth/PlayerRepository.js';
import type { PlayerRepository } from '../auth/PlayerRepository.js';

// ─── Contract Tests (run against any PlayerRepository implementation) ──────

function playerRepositoryContractTests(createRepo: () => PlayerRepository) {
  let repo: PlayerRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── createPlayer ──

  describe('createPlayer', () => {
    it('creates a player with valid username and passwordHash', async () => {
      const player = await repo.createPlayer('Drizzt', 'hashed_pw_123');
      expect(player.id).toBeDefined();
      expect(player.username).toBe('Drizzt');
      expect(player.passwordHash).toBe('hashed_pw_123');
      expect(player.identity_id).toBeDefined();
      expect(player.created_at).toBeInstanceOf(Date);
      expect(player.updated_at).toBeInstanceOf(Date);
    });

    it('assigns unique IDs to different players', async () => {
      const p1 = await repo.createPlayer('player1', 'hash1');
      const p2 = await repo.createPlayer('player2', 'hash2');
      expect(p1.id).not.toBe(p2.id);
      expect(p1.identity_id).not.toBe(p2.identity_id);
    });

    it('assigns unique identity_id per player', async () => {
      const p1 = await repo.createPlayer('hero1', 'hash1');
      const p2 = await repo.createPlayer('hero2', 'hash2');
      expect(p1.identity_id).not.toBe(p2.identity_id);
    });

    it('preserves original username casing', async () => {
      const player = await repo.createPlayer('CamelCaseUser', 'hash');
      expect(player.username).toBe('CamelCaseUser');
    });

    it('timestamps are recent (within last second)', async () => {
      const before = new Date();
      const player = await repo.createPlayer('timely', 'hash');
      const after = new Date();
      expect(player.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(player.created_at.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(player.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  // ── Duplicate Username ──

  describe('duplicate username enforcement', () => {
    it('rejects exact duplicate username', async () => {
      await repo.createPlayer('taken', 'hash1');
      await expect(repo.createPlayer('taken', 'hash2'))
        .rejects.toThrow(DuplicateUsernameError);
    });

    it('rejects case-insensitive duplicate (upper vs lower)', async () => {
      await repo.createPlayer('Drizzt', 'hash1');
      await expect(repo.createPlayer('drizzt', 'hash2'))
        .rejects.toThrow(DuplicateUsernameError);
    });

    it('rejects case-insensitive duplicate (mixed case)', async () => {
      await repo.createPlayer('TestHero', 'hash1');
      await expect(repo.createPlayer('testhero', 'hash2'))
        .rejects.toThrow(DuplicateUsernameError);
    });

    it('rejects case-insensitive duplicate (all caps)', async () => {
      await repo.createPlayer('shadow', 'hash1');
      await expect(repo.createPlayer('SHADOW', 'hash2'))
        .rejects.toThrow(DuplicateUsernameError);
    });

    it('DuplicateUsernameError includes the username', async () => {
      await repo.createPlayer('taken', 'hash1');
      try {
        await repo.createPlayer('Taken', 'hash2');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(DuplicateUsernameError);
        expect((err as Error).message).toContain('Taken');
      }
    });
  });

  // ── findByUsername ──

  describe('findByUsername', () => {
    it('finds an existing player by exact username', async () => {
      const created = await repo.createPlayer('Finder', 'hash');
      const found = await repo.findByUsername('Finder');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.username).toBe('Finder');
    });

    it('finds player case-insensitively', async () => {
      await repo.createPlayer('MixedCase', 'hash');
      const found = await repo.findByUsername('mixedcase');
      expect(found).not.toBeNull();
      expect(found!.username).toBe('MixedCase');
    });

    it('returns passwordHash in findByUsername result', async () => {
      await repo.createPlayer('WithHash', 'secret_hash');
      const found = await repo.findByUsername('WithHash');
      expect(found).not.toBeNull();
      expect(found!.passwordHash).toBe('secret_hash');
    });

    it('returns null for nonexistent username', async () => {
      const found = await repo.findByUsername('nobody');
      expect(found).toBeNull();
    });

    it('returns null for empty string', async () => {
      const found = await repo.findByUsername('');
      expect(found).toBeNull();
    });
  });

  // ── findById ──

  describe('findById', () => {
    it('finds an existing player by ID', async () => {
      const created = await repo.createPlayer('IdLookup', 'hash');
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.username).toBe('IdLookup');
    });

    it('strips passwordHash from findById result', async () => {
      const created = await repo.createPlayer('Stripped', 'secret_hash');
      const found = await repo.findById(created.id);
      expect(found).not.toBeNull();
      // The returned Player type should NOT have passwordHash
      expect((found as unknown as Record<string, unknown>)['passwordHash']).toBeUndefined();
    });

    it('returns null for nonexistent ID', async () => {
      const found = await repo.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('returns null for empty ID', async () => {
      const found = await repo.findById('');
      expect(found).toBeNull();
    });

    it('preserves identity_id in findById result', async () => {
      const created = await repo.createPlayer('Identity', 'hash');
      const found = await repo.findById(created.id);
      expect(found!.identity_id).toBe(created.identity_id);
    });
  });

  // ── Identity Linkage ──

  describe('identity linkage', () => {
    it('player has a linked identity_id', async () => {
      const player = await repo.createPlayer('linked', 'hash');
      expect(player.identity_id).toBeDefined();
      expect(typeof player.identity_id).toBe('string');
      expect(player.identity_id.length).toBeGreaterThan(0);
    });

    it('identity_id is a valid UUID format', async () => {
      const player = await repo.createPlayer('uuid_test', 'hash');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(player.identity_id).toMatch(uuidRegex);
    });

    it('player id is a valid UUID format', async () => {
      const player = await repo.createPlayer('uuid_id', 'hash');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(player.id).toMatch(uuidRegex);
    });

    it('identity_id persists through findByUsername', async () => {
      const created = await repo.createPlayer('persist', 'hash');
      const found = await repo.findByUsername('persist');
      expect(found!.identity_id).toBe(created.identity_id);
    });
  });

  // ── Concurrent / Rapid Operations ──

  describe('rapid operations', () => {
    it('handles many players created in sequence', async () => {
      const players = [];
      for (let i = 0; i < 50; i++) {
        players.push(await repo.createPlayer(`player_${i}`, `hash_${i}`));
      }
      // All should have unique IDs
      const ids = new Set(players.map(p => p.id));
      expect(ids.size).toBe(50);
    });

    it('handles concurrent createPlayer calls for different usernames', async () => {
      const results = await Promise.all([
        repo.createPlayer('concurrent_a', 'hash_a'),
        repo.createPlayer('concurrent_b', 'hash_b'),
        repo.createPlayer('concurrent_c', 'hash_c'),
      ]);
      const ids = new Set(results.map(r => r.id));
      expect(ids.size).toBe(3);
    });

    it('concurrent findByUsername does not corrupt state', async () => {
      await repo.createPlayer('stable', 'hash');
      const results = await Promise.all([
        repo.findByUsername('stable'),
        repo.findByUsername('stable'),
        repo.findByUsername('stable'),
      ]);
      for (const r of results) {
        expect(r).not.toBeNull();
        expect(r!.username).toBe('stable');
      }
    });
  });
}

// ─── Run contract tests against InMemoryPlayerRepository ────────────────────

describe('InMemoryPlayerRepository — persistence contract', () => {
  playerRepositoryContractTests(() => new InMemoryPlayerRepository());
});
