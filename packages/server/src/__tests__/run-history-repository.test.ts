/**
 * RunHistoryRepository persistence tests — Issue #198.
 *
 * Contract tests for RunHistoryRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers run recording,
 * chronological ordering, limit parameter, player isolation, and edge cases.
 *
 * Uses real production imports from the run-history module.
 *
 * Schema reference: migration 005_create_run_history.sql
 *   - run_history: player_id, run_id, shard_tier (1-3), biome, duration_sec (>=0),
 *     extracted (boolean), extracted_items (JSONB), xp_gained (>=0), created_at
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  InMemoryRunHistoryRepository,
  initRunHistoryProvider,
  getRunHistoryRepository,
  isRunHistoryPg,
  resetRunHistoryProvider,
} from '../run-history/index.js';
import type { RunHistoryRepository, RunRecord } from '../run-history/index.js';

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';

function makeRun(overrides?: Partial<RunRecord>): RunRecord {
  return {
    runId: overrides?.runId ?? `shard-${Math.random().toString(36).slice(2, 10)}`,
    playerId: overrides?.playerId ?? PLAYER_A,
    shardTier: overrides?.shardTier ?? 1,
    biome: overrides && 'biome' in overrides ? overrides.biome ?? null : 'flooded_crypt',
    durationSec: overrides?.durationSec ?? 300,
    extracted: overrides?.extracted ?? true,
    extractedItems: overrides?.extractedItems ?? [{ itemId: 'bone-shard', name: 'Bone Shard' }],
    xpGained: overrides?.xpGained ?? 50,
  };
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

function runHistoryRepositoryContractTests(
  createRepo: () => RunHistoryRepository,
) {
  let repo: RunHistoryRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── Basic Operations ──

  describe('getPlayerHistory', () => {
    it('returns empty array for new player', async () => {
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toEqual([]);
    });

    it('returns empty array for empty string player ID', async () => {
      const history = await repo.getPlayerHistory('');
      expect(history).toEqual([]);
    });

    it('returns empty array for unknown player ID', async () => {
      const history = await repo.getPlayerHistory('ghost-player');
      expect(history).toEqual([]);
    });
  });

  // ── Record / Retrieve Round-Trip ──

  describe('recordRun then getPlayerHistory', () => {
    it('records and retrieves a single run', async () => {
      const run = makeRun({ runId: 'shard-001' });
      await repo.recordRun(run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe('shard-001');
      expect(history[0].playerId).toBe(PLAYER_A);
      expect(history[0].shardTier).toBe(1);
      expect(history[0].biome).toBe('flooded_crypt');
      expect(history[0].durationSec).toBe(300);
      expect(history[0].extracted).toBe(true);
      expect(history[0].xpGained).toBe(50);
      expect(history[0].extractedItems).toHaveLength(1);
    });

    it('records a failed run', async () => {
      await repo.recordRun(makeRun({
        runId: 'shard-dead',
        extracted: false,
        extractedItems: [],
        xpGained: 10,
      }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extracted).toBe(false);
      expect(history[0].extractedItems).toEqual([]);
    });

    it('records multiple runs for same player', async () => {
      await repo.recordRun(makeRun({ runId: 'shard-001' }));
      await repo.recordRun(makeRun({ runId: 'shard-002' }));
      await repo.recordRun(makeRun({ runId: 'shard-003' }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(3);
    });
  });

  // ── Ordering ──

  describe('chronological ordering (newest first)', () => {
    it('returns runs in most-recent-first order', async () => {
      await repo.recordRun(makeRun({ runId: 'shard-first' }));
      await repo.recordRun(makeRun({ runId: 'shard-second' }));
      await repo.recordRun(makeRun({ runId: 'shard-third' }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].runId).toBe('shard-third');
      expect(history[1].runId).toBe('shard-second');
      expect(history[2].runId).toBe('shard-first');
    });
  });

  // ── Limit Parameter ──

  describe('limit parameter', () => {
    it('limits number of returned records', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.recordRun(makeRun({ runId: `shard-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A, 3);
      expect(history).toHaveLength(3);
    });

    it('returns most recent runs when limited', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.recordRun(makeRun({ runId: `shard-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A, 2);
      expect(history[0].runId).toBe('shard-4');
      expect(history[1].runId).toBe('shard-3');
    });

    it('returns all runs when limit exceeds count', async () => {
      await repo.recordRun(makeRun({ runId: 'shard-only' }));

      const history = await repo.getPlayerHistory(PLAYER_A, 100);
      expect(history).toHaveLength(1);
    });

    it('defaults to 50 when no limit specified', async () => {
      for (let i = 0; i < 60; i++) {
        await repo.recordRun(makeRun({ runId: `shard-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(50);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('runs are completely isolated between players', async () => {
      await repo.recordRun(makeRun({ playerId: PLAYER_A, runId: 'shard-a' }));
      await repo.recordRun(makeRun({ playerId: PLAYER_B, runId: 'shard-b' }));

      const historyA = await repo.getPlayerHistory(PLAYER_A);
      const historyB = await repo.getPlayerHistory(PLAYER_B);

      expect(historyA).toHaveLength(1);
      expect(historyA[0].runId).toBe('shard-a');
      expect(historyB).toHaveLength(1);
      expect(historyB[0].runId).toBe('shard-b');
    });

    it('recording a run for one player does not affect another', async () => {
      await repo.recordRun(makeRun({ playerId: PLAYER_A, runId: 'shard-a' }));

      for (let i = 0; i < 5; i++) {
        await repo.recordRun(makeRun({ playerId: PLAYER_B, runId: `shard-b-${i}` }));
      }

      const historyA = await repo.getPlayerHistory(PLAYER_A);
      expect(historyA).toHaveLength(1);
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles zero duration', async () => {
      await repo.recordRun(makeRun({ durationSec: 0 }));
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].durationSec).toBe(0);
    });

    it('handles zero XP gained', async () => {
      await repo.recordRun(makeRun({ xpGained: 0 }));
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].xpGained).toBe(0);
    });

    it('handles null biome', async () => {
      await repo.recordRun(makeRun({ biome: null }));
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].biome).toBeNull();
    });

    it('handles all shard tiers', async () => {
      await repo.recordRun(makeRun({ runId: 't1', shardTier: 1 }));
      await repo.recordRun(makeRun({ runId: 't2', shardTier: 2 }));
      await repo.recordRun(makeRun({ runId: 't3', shardTier: 3 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      const tiers = history.map((r) => r.shardTier).sort();
      expect(tiers).toEqual([1, 2, 3]);
    });

    it('handles empty extracted items', async () => {
      await repo.recordRun(makeRun({ extractedItems: [] }));
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extractedItems).toEqual([]);
    });

    it('handles complex extracted items', async () => {
      const items = [
        { itemId: 'bone-shard', name: 'Bone Shard', quantity: 3 },
        { itemId: 'shadow-blade', name: 'Shadow Blade' },
      ];
      await repo.recordRun(makeRun({ extractedItems: items }));
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extractedItems).toHaveLength(2);
    });

    it('deep-copies data (mutation safety)', async () => {
      const run = makeRun({ runId: 'shard-immutable', xpGained: 50 });
      await repo.recordRun(run);

      // Mutate original — should not affect stored data
      run.xpGained = 99999;

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].xpGained).toBe(50);
    });

    it('concurrent records for different players do not interfere', async () => {
      await Promise.all([
        repo.recordRun(makeRun({ playerId: PLAYER_A, runId: 'a-run', xpGained: 100 })),
        repo.recordRun(makeRun({ playerId: PLAYER_B, runId: 'b-run', xpGained: 200 })),
      ]);

      const historyA = await repo.getPlayerHistory(PLAYER_A);
      const historyB = await repo.getPlayerHistory(PLAYER_B);
      expect(historyA[0].xpGained).toBe(100);
      expect(historyB[0].xpGained).toBe(200);
    });
  });
}

// ─── Run Against InMemoryRunHistoryRepository ───────────────────────────────

describe('InMemoryRunHistoryRepository — persistence contract', () => {
  runHistoryRepositoryContractTests(() => new InMemoryRunHistoryRepository());
});

// ─── Provider Wiring Tests ──────────────────────────────────────────────────

describe('RunHistory Provider Wiring', () => {
  afterEach(() => {
    resetRunHistoryProvider();
  });

  it('defaults to in-memory when not initialized', () => {
    resetRunHistoryProvider();
    const repo = getRunHistoryRepository();
    expect(repo).toBeInstanceOf(InMemoryRunHistoryRepository);
  });

  it('uses in-memory when initialized with usePg=false', () => {
    initRunHistoryProvider(false);
    const repo = getRunHistoryRepository();
    expect(repo).toBeInstanceOf(InMemoryRunHistoryRepository);
  });

  it('returns same repository instance on repeated calls', () => {
    initRunHistoryProvider(false);
    const repo1 = getRunHistoryRepository();
    const repo2 = getRunHistoryRepository();
    expect(repo1).toBe(repo2);
  });

  it('resetRunHistoryProvider clears state', () => {
    initRunHistoryProvider(false);
    const repo1 = getRunHistoryRepository();
    resetRunHistoryProvider();
    const repo2 = getRunHistoryRepository();
    expect(repo1).not.toBe(repo2);
  });

  it('isRunHistoryPg() returns false when no DATABASE_URL', () => {
    initRunHistoryProvider(false);
    expect(isRunHistoryPg()).toBe(false);
  });
});
