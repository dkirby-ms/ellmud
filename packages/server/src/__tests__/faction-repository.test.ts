/**
 * FactionRepository persistence tests — Issue #198.
 *
 * Contract tests for FactionRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers faction join,
 * upsert semantics, player isolation, standing progression, and edge cases.
 *
 * Uses real production imports from the faction module.
 *
 * Schema reference: migration 004_create_factions.sql
 *   - faction_membership: player_id (UNIQUE), faction_id, reputation (>=0), rank (>=1)
 *   - One faction per player at a time (UNIQUE constraint on player_id)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryFactionRepository,
  initFactionProvider,
  getFactionRepository,
  isFactionPg,
  resetFactionProvider,
} from '../faction/index.js';
import type { FactionRepository } from '../faction/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';
const PLAYER_C = 'player-ccc';

// Canonical factions from GDD §9.4 / migration 004
const IRONWRIGHT = 'ironwright';
const VEIL = 'veil';
const SCARLET = 'scarlet';

// ─── Contract Tests ─────────────────────────────────────────────────────────

function factionRepositoryContractTests(
  createRepo: () => FactionRepository,
) {
  let repo: FactionRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── Basic Operations ──

  describe('getPlayerFactions', () => {
    it('returns empty array for new (unaffiliated) player', async () => {
      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toEqual([]);
    });

    it('returns empty array for empty string player ID', async () => {
      const factions = await repo.getPlayerFactions('');
      expect(factions).toEqual([]);
    });

    it('returns empty array for unknown player ID', async () => {
      const factions = await repo.getPlayerFactions('ghost-player');
      expect(factions).toEqual([]);
    });
  });

  // ── Join / Update Round-Trip ──

  describe('updateFaction then getPlayerFactions', () => {
    it('returns the membership after joining a faction', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 0, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].player_id).toBe(PLAYER_A);
      expect(factions[0].faction_id).toBe(IRONWRIGHT);
      expect(factions[0].reputation).toBe(0);
      expect(factions[0].rank).toBe(1);
    });

    it('preserves reputation on retrieval', async () => {
      await repo.updateFaction(PLAYER_A, VEIL, { reputation: 150, rank: 3 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(150);
      expect(factions[0].rank).toBe(3);
    });
  });

  // ── Upsert Semantics (one faction at a time) ──

  describe('upsert semantics', () => {
    it('second updateFaction overwrites reputation and rank', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 50, rank: 1 });
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 200, rank: 2 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].reputation).toBe(200);
      expect(factions[0].rank).toBe(2);
    });

    it('switching faction replaces the previous one (one-at-a-time)', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 2 });
      await repo.updateFaction(PLAYER_A, VEIL, { reputation: 10, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].faction_id).toBe(VEIL);
      expect(factions[0].reputation).toBe(10);
    });

    it('switching faction loses previous standing', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 500, rank: 5 });
      await repo.updateFaction(PLAYER_A, SCARLET, { reputation: 0, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].faction_id).toBe(SCARLET);
      expect(factions[0].reputation).toBe(0);
      expect(factions[0].rank).toBe(1);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('factions are completely isolated between players', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 2 });
      await repo.updateFaction(PLAYER_B, VEIL, { reputation: 50, rank: 1 });

      const factionsA = await repo.getPlayerFactions(PLAYER_A);
      const factionsB = await repo.getPlayerFactions(PLAYER_B);

      expect(factionsA).toHaveLength(1);
      expect(factionsA[0].faction_id).toBe(IRONWRIGHT);
      expect(factionsB).toHaveLength(1);
      expect(factionsB[0].faction_id).toBe(VEIL);
    });

    it('updating one player does not affect another', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 2 });
      await repo.updateFaction(PLAYER_B, VEIL, { reputation: 300, rank: 4 });

      await repo.updateFaction(PLAYER_A, SCARLET, { reputation: 10, rank: 1 });

      const factionsB = await repo.getPlayerFactions(PLAYER_B);
      expect(factionsB[0].reputation).toBe(300);
      expect(factionsB[0].rank).toBe(4);
    });

    it('three players in three different factions', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 1 });
      await repo.updateFaction(PLAYER_B, VEIL, { reputation: 200, rank: 2 });
      await repo.updateFaction(PLAYER_C, SCARLET, { reputation: 300, rank: 3 });

      expect((await repo.getPlayerFactions(PLAYER_A))[0].faction_id).toBe(IRONWRIGHT);
      expect((await repo.getPlayerFactions(PLAYER_B))[0].faction_id).toBe(VEIL);
      expect((await repo.getPlayerFactions(PLAYER_C))[0].faction_id).toBe(SCARLET);
    });
  });

  // ── Standing Progression ──

  describe('standing progression', () => {
    it('reputation increases across updates', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 0, rank: 1 });
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 1 });
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 500, rank: 3 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(500);
      expect(factions[0].rank).toBe(3);
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles zero reputation', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 0, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(0);
    });

    it('handles high reputation values', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 99999, rank: 10 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(99999);
      expect(factions[0].rank).toBe(10);
    });

    it('membership includes timestamps', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 50, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].joined_at).toBeInstanceOf(Date);
      expect(factions[0].updated_at).toBeInstanceOf(Date);
    });

    it('deep-copies data (mutation safety)', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 50, rank: 1 });

      const factions = await repo.getPlayerFactions(PLAYER_A);
      factions[0].reputation = 99999;

      const fresh = await repo.getPlayerFactions(PLAYER_A);
      expect(fresh[0].reputation).toBe(50);
    });

    it('concurrent updates for different players do not interfere', async () => {
      await Promise.all([
        repo.updateFaction(PLAYER_A, IRONWRIGHT, { reputation: 100, rank: 1 }),
        repo.updateFaction(PLAYER_B, VEIL, { reputation: 200, rank: 2 }),
        repo.updateFaction(PLAYER_C, SCARLET, { reputation: 300, rank: 3 }),
      ]);

      expect((await repo.getPlayerFactions(PLAYER_A))[0].reputation).toBe(100);
      expect((await repo.getPlayerFactions(PLAYER_B))[0].reputation).toBe(200);
      expect((await repo.getPlayerFactions(PLAYER_C))[0].reputation).toBe(300);
    });
  });
}

// ─── Run Against InMemoryFactionRepository ──────────────────────────────────

describe('InMemoryFactionRepository — persistence contract', () => {
  factionRepositoryContractTests(() => new InMemoryFactionRepository());
});

// ─── Provider Wiring Tests ──────────────────────────────────────────────────

describe('Faction Provider Wiring', () => {
  afterEach(() => {
    resetFactionProvider();
  });

  it('defaults to in-memory when not initialized', () => {
    resetFactionProvider();
    const repo = getFactionRepository();
    expect(repo).toBeInstanceOf(InMemoryFactionRepository);
  });

  it('uses in-memory when initialized with usePg=false', () => {
    initFactionProvider(false);
    const repo = getFactionRepository();
    expect(repo).toBeInstanceOf(InMemoryFactionRepository);
  });

  it('returns same repository instance on repeated calls', () => {
    initFactionProvider(false);
    const repo1 = getFactionRepository();
    const repo2 = getFactionRepository();
    expect(repo1).toBe(repo2);
  });

  it('resetFactionProvider clears state', () => {
    initFactionProvider(false);
    const repo1 = getFactionRepository();
    resetFactionProvider();
    const repo2 = getFactionRepository();
    expect(repo1).not.toBe(repo2);
  });

  it('isFactionPg() returns false when no DATABASE_URL', () => {
    initFactionProvider(false);
    expect(isFactionPg()).toBe(false);
  });
});
