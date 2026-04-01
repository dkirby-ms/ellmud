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
 *   - run_history: player_id, run_id, zone_tier (1-3), duration_sec (>=0),
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
    runId: overrides?.runId ?? `zone-${Math.random().toString(36).slice(2, 10)}`,
    playerId: overrides?.playerId ?? PLAYER_A,
    zoneTier: overrides?.zoneTier ?? 1,
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
      const run = makeRun({ runId: 'zone-001' });
      await repo.recordRun(run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe('zone-001');
      expect(history[0].playerId).toBe(PLAYER_A);
      expect(history[0].zoneTier).toBe(1);
      expect(history[0].durationSec).toBe(300);
      expect(history[0].extracted).toBe(true);
      expect(history[0].xpGained).toBe(50);
      expect(history[0].extractedItems).toHaveLength(1);
    });

    it('records a failed run', async () => {
      await repo.recordRun(makeRun({
        runId: 'zone-dead',
        extracted: false,
        extractedItems: [],
        xpGained: 10,
      }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extracted).toBe(false);
      expect(history[0].extractedItems).toEqual([]);
    });

    it('records multiple runs for same player', async () => {
      await repo.recordRun(makeRun({ runId: 'zone-001' }));
      await repo.recordRun(makeRun({ runId: 'zone-002' }));
      await repo.recordRun(makeRun({ runId: 'zone-003' }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(3);
    });
  });

  // ── Ordering ──

  describe('chronological ordering (newest first)', () => {
    it('returns runs in most-recent-first order', async () => {
      await repo.recordRun(makeRun({ runId: 'zone-first' }));
      await repo.recordRun(makeRun({ runId: 'zone-second' }));
      await repo.recordRun(makeRun({ runId: 'zone-third' }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].runId).toBe('zone-third');
      expect(history[1].runId).toBe('zone-second');
      expect(history[2].runId).toBe('zone-first');
    });
  });

  // ── Limit Parameter ──

  describe('limit parameter', () => {
    it('limits number of returned records', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.recordRun(makeRun({ runId: `zone-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A, 3);
      expect(history).toHaveLength(3);
    });

    it('returns most recent runs when limited', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.recordRun(makeRun({ runId: `zone-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A, 2);
      expect(history[0].runId).toBe('zone-4');
      expect(history[1].runId).toBe('zone-3');
    });

    it('returns all runs when limit exceeds count', async () => {
      await repo.recordRun(makeRun({ runId: 'zone-only' }));

      const history = await repo.getPlayerHistory(PLAYER_A, 100);
      expect(history).toHaveLength(1);
    });

    it('defaults to 50 when no limit specified', async () => {
      for (let i = 0; i < 60; i++) {
        await repo.recordRun(makeRun({ runId: `zone-${i}` }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(50);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('runs are completely isolated between players', async () => {
      await repo.recordRun(makeRun({ playerId: PLAYER_A, runId: 'zone-a' }));
      await repo.recordRun(makeRun({ playerId: PLAYER_B, runId: 'zone-b' }));

      const historyA = await repo.getPlayerHistory(PLAYER_A);
      const historyB = await repo.getPlayerHistory(PLAYER_B);

      expect(historyA).toHaveLength(1);
      expect(historyA[0].runId).toBe('zone-a');
      expect(historyB).toHaveLength(1);
      expect(historyB[0].runId).toBe('zone-b');
    });

    it('recording a run for one player does not affect another', async () => {
      await repo.recordRun(makeRun({ playerId: PLAYER_A, runId: 'zone-a' }));

      for (let i = 0; i < 5; i++) {
        await repo.recordRun(makeRun({ playerId: PLAYER_B, runId: `zone-b-${i}` }));
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

    it('handles all zone tiers', async () => {
      await repo.recordRun(makeRun({ runId: 't1', zoneTier: 1 }));
      await repo.recordRun(makeRun({ runId: 't2', zoneTier: 2 }));
      await repo.recordRun(makeRun({ runId: 't3', zoneTier: 3 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      const tiers = history.map((r) => r.zoneTier).sort();
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
      const run = makeRun({ runId: 'zone-immutable', xpGained: 50 });
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
