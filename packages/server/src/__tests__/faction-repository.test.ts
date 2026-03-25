/**
 * FactionRepository persistence tests — Issue #198.
 *
 * Contract tests for FactionRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers faction join,
 * upsert semantics, player isolation, standing progression, and edge cases.
 *
 * Self-contained: defines its own interface + InMemory impl so tests
 * run independently of Jarlaxle's production code.
 *
 * Schema reference: migration 004_create_factions.sql
 *   - faction_membership: player_id (UNIQUE), faction_id, reputation (>=0), rank (>=1)
 *   - One faction per player at a time (UNIQUE constraint on player_id)
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Self-Contained Interface ───────────────────────────────────────────────

/** A player's faction membership snapshot. */
export interface FactionMembership {
  playerId: string;
  factionId: string;
  reputation: number;
  rank: number;
}

/** Interface for faction persistence — matches the pattern Jarlaxle will implement. */
export interface FactionRepository {
  /** Get the player's current faction membership(s). Returns [] for unaffiliated players. */
  getPlayerFactions(playerId: string): Promise<FactionMembership[]>;

  /** Join or update a faction. Upserts — replaces any existing membership (one faction at a time). */
  updateFaction(
    playerId: string,
    factionId: string,
    reputation: number,
    rank: number,
  ): Promise<void>;
}

// ─── Self-Contained InMemory Implementation ─────────────────────────────────

class InMemoryFactionRepository implements FactionRepository {
  private memberships = new Map<string, FactionMembership>();

  async getPlayerFactions(playerId: string): Promise<FactionMembership[]> {
    const membership = this.memberships.get(playerId);
    if (!membership) return [];
    return [structuredClone(membership)];
  }

  async updateFaction(
    playerId: string,
    factionId: string,
    reputation: number,
    rank: number,
  ): Promise<void> {
    this.memberships.set(playerId, { playerId, factionId, reputation, rank });
  }
}

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
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 0, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].playerId).toBe(PLAYER_A);
      expect(factions[0].factionId).toBe(IRONWRIGHT);
      expect(factions[0].reputation).toBe(0);
      expect(factions[0].rank).toBe(1);
    });

    it('preserves faction ID correctly', async () => {
      await repo.updateFaction(PLAYER_A, VEIL, 10, 2);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].factionId).toBe(VEIL);
    });

    it('preserves reputation and rank values', async () => {
      await repo.updateFaction(PLAYER_A, SCARLET, 500, 5);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(500);
      expect(factions[0].rank).toBe(5);
    });
  });

  // ── Switching Factions (upsert — one faction at a time per schema) ──

  describe('switching factions (upsert)', () => {
    it('switching faction replaces the previous membership', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 3);
      await repo.updateFaction(PLAYER_A, VEIL, 0, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].factionId).toBe(VEIL);
      expect(factions[0].reputation).toBe(0);
      expect(factions[0].rank).toBe(1);
    });

    it('switching does not preserve old faction reputation', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 999, 10);
      await repo.updateFaction(PLAYER_A, SCARLET, 50, 2);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(50);
      expect(factions[0].rank).toBe(2);
    });

    it('can cycle through all three canonical factions', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 10, 1);
      await repo.updateFaction(PLAYER_A, VEIL, 20, 2);
      await repo.updateFaction(PLAYER_A, SCARLET, 30, 3);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].factionId).toBe(SCARLET);
      expect(factions[0].reputation).toBe(30);
      expect(factions[0].rank).toBe(3);
    });
  });

  // ── Upsert Same Faction (reputation/rank update) ──

  describe('update existing faction standing (upsert same faction)', () => {
    it('updating reputation for the same faction overwrites', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 0, 1);
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 150, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions).toHaveLength(1);
      expect(factions[0].reputation).toBe(150);
    });

    it('updating rank for the same faction overwrites', async () => {
      await repo.updateFaction(PLAYER_A, VEIL, 100, 1);
      await repo.updateFaction(PLAYER_A, VEIL, 100, 5);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].rank).toBe(5);
    });

    it('multiple reputation increments are reflected', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 10, 1);
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 50, 1);
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 200, 2);
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 500, 3);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(500);
      expect(factions[0].rank).toBe(3);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('different players have completely isolated factions', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 3);
      await repo.updateFaction(PLAYER_B, VEIL, 50, 2);

      const factionsA = await repo.getPlayerFactions(PLAYER_A);
      const factionsB = await repo.getPlayerFactions(PLAYER_B);

      expect(factionsA[0].factionId).toBe(IRONWRIGHT);
      expect(factionsA[0].reputation).toBe(100);
      expect(factionsB[0].factionId).toBe(VEIL);
      expect(factionsB[0].reputation).toBe(50);
    });

    it('updating one player does not affect another', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 3);
      await repo.updateFaction(PLAYER_B, IRONWRIGHT, 200, 5);

      // Update A
      await repo.updateFaction(PLAYER_A, VEIL, 0, 1);

      // B should be unchanged
      const factionsB = await repo.getPlayerFactions(PLAYER_B);
      expect(factionsB[0].factionId).toBe(IRONWRIGHT);
      expect(factionsB[0].reputation).toBe(200);
      expect(factionsB[0].rank).toBe(5);
    });

    it('three players in different factions are all independent', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 2);
      await repo.updateFaction(PLAYER_B, VEIL, 200, 3);
      await repo.updateFaction(PLAYER_C, SCARLET, 300, 4);

      const [fA, fB, fC] = await Promise.all([
        repo.getPlayerFactions(PLAYER_A),
        repo.getPlayerFactions(PLAYER_B),
        repo.getPlayerFactions(PLAYER_C),
      ]);

      expect(fA[0].factionId).toBe(IRONWRIGHT);
      expect(fB[0].factionId).toBe(VEIL);
      expect(fC[0].factionId).toBe(SCARLET);
      expect(fA[0].reputation).toBe(100);
      expect(fB[0].reputation).toBe(200);
      expect(fC[0].reputation).toBe(300);
    });

    it('same faction for multiple players tracks separate standings', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 10, 1);
      await repo.updateFaction(PLAYER_B, IRONWRIGHT, 500, 7);
      await repo.updateFaction(PLAYER_C, IRONWRIGHT, 250, 4);

      const [fA, fB, fC] = await Promise.all([
        repo.getPlayerFactions(PLAYER_A),
        repo.getPlayerFactions(PLAYER_B),
        repo.getPlayerFactions(PLAYER_C),
      ]);

      expect(fA[0].reputation).toBe(10);
      expect(fB[0].reputation).toBe(500);
      expect(fC[0].reputation).toBe(250);
    });

    it('unaffiliated player not affected by others joining', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 3);

      const factionsB = await repo.getPlayerFactions(PLAYER_B);
      expect(factionsB).toEqual([]);
    });
  });

  // ── Edge Cases: Standing Values ──

  describe('edge cases: standing values', () => {
    it('handles zero reputation (new member)', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 0, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(0);
    });

    it('handles minimum rank of 1', async () => {
      await repo.updateFaction(PLAYER_A, VEIL, 0, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].rank).toBe(1);
    });

    it('handles very high reputation', async () => {
      await repo.updateFaction(PLAYER_A, SCARLET, 999999, 10);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(999999);
    });

    it('handles very high rank', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 100);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].rank).toBe(100);
    });

    it('handles reputation at INT max boundary', async () => {
      const maxInt = 2147483647; // PostgreSQL INT max
      await repo.updateFaction(PLAYER_A, VEIL, maxInt, 1);

      const factions = await repo.getPlayerFactions(PLAYER_A);
      expect(factions[0].reputation).toBe(maxInt);
    });
  });

  // ── Data Integrity ──

  describe('data integrity', () => {
    it('returned data is a copy, not a live reference', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 100, 3);

      const factions1 = await repo.getPlayerFactions(PLAYER_A);
      factions1[0].reputation = 9999;

      const factions2 = await repo.getPlayerFactions(PLAYER_A);
      expect(factions2[0].reputation).toBe(100);
    });

    it('parallel updates for different players do not interfere', async () => {
      await Promise.all([
        repo.updateFaction(PLAYER_A, IRONWRIGHT, 10, 1),
        repo.updateFaction(PLAYER_B, VEIL, 20, 2),
        repo.updateFaction(PLAYER_C, SCARLET, 30, 3),
      ]);

      const [fA, fB, fC] = await Promise.all([
        repo.getPlayerFactions(PLAYER_A),
        repo.getPlayerFactions(PLAYER_B),
        repo.getPlayerFactions(PLAYER_C),
      ]);

      expect(fA[0].factionId).toBe(IRONWRIGHT);
      expect(fB[0].factionId).toBe(VEIL);
      expect(fC[0].factionId).toBe(SCARLET);
    });

    it('parallel reads return consistent data', async () => {
      await repo.updateFaction(PLAYER_A, IRONWRIGHT, 250, 5);

      const [r1, r2, r3] = await Promise.all([
        repo.getPlayerFactions(PLAYER_A),
        repo.getPlayerFactions(PLAYER_A),
        repo.getPlayerFactions(PLAYER_A),
      ]);

      expect(r1[0].reputation).toBe(250);
      expect(r2[0].reputation).toBe(250);
      expect(r3[0].reputation).toBe(250);
    });

    it('handles many players saved concurrently', async () => {
      const count = 50;
      const saves = Array.from({ length: count }, (_, i) =>
        repo.updateFaction(`player-${i}`, IRONWRIGHT, i * 10, 1),
      );

      await Promise.all(saves);

      const loaded0 = await repo.getPlayerFactions('player-0');
      expect(loaded0[0].reputation).toBe(0);

      const loaded49 = await repo.getPlayerFactions('player-49');
      expect(loaded49[0].reputation).toBe(490);
    });
  });
}

// ─── Run Against InMemoryFactionRepository ──────────────────────────────────

describe('InMemoryFactionRepository — persistence contract', () => {
  factionRepositoryContractTests(() => new InMemoryFactionRepository());
});
