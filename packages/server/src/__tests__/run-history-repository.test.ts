/**
 * RunHistoryRepository persistence tests — Issue #198.
 *
 * Contract tests for RunHistoryRepository that validate behavior regardless
 * of implementation (in-memory or PostgreSQL). Covers run recording,
 * chronological ordering, limit parameter, player isolation, and edge cases.
 *
 * Self-contained: defines its own interface + InMemory impl so tests
 * run independently of Jarlaxle's production code.
 *
 * Schema reference: migration 005_create_run_history.sql
 *   - run_history: player_id, run_id, shard_tier (1-3), biome, duration_sec (>=0),
 *     extracted (boolean), extracted_items (JSONB), xp_gained (>=0), created_at
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Self-Contained Interface ───────────────────────────────────────────────

/** A completed shard run record. */
export interface RunRecord {
  runId: string;
  shardTier: number;
  biome?: string;
  durationSec: number;
  extracted: boolean;
  extractedItems: unknown[];
  xpGained: number;
  createdAt: Date;
}

/** Input for recording a run (createdAt is auto-assigned). */
export type RunInput = Omit<RunRecord, 'createdAt'>;

/** Interface for run history persistence — matches the pattern Jarlaxle will implement. */
export interface RunHistoryRepository {
  /** Record a completed shard run. */
  recordRun(playerId: string, run: RunInput): Promise<void>;

  /** Get a player's run history, newest first. Optional limit (default: all). */
  getPlayerHistory(playerId: string, limit?: number): Promise<RunRecord[]>;
}

// ─── Self-Contained InMemory Implementation ─────────────────────────────────

class InMemoryRunHistoryRepository implements RunHistoryRepository {
  private history = new Map<string, RunRecord[]>();

  async recordRun(playerId: string, run: RunInput): Promise<void> {
    const record: RunRecord = {
      ...structuredClone(run),
      createdAt: new Date(),
    };

    let playerHistory = this.history.get(playerId);
    if (!playerHistory) {
      playerHistory = [];
      this.history.set(playerId, playerHistory);
    }
    playerHistory.push(record);
  }

  async getPlayerHistory(playerId: string, limit?: number): Promise<RunRecord[]> {
    const playerHistory = this.history.get(playerId);
    if (!playerHistory) return [];

    // Return newest first (reverse chronological)
    const sorted = [...playerHistory].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    if (limit !== undefined && limit >= 0) {
      return sorted.slice(0, limit).map((r) => structuredClone(r));
    }

    return sorted.map((r) => structuredClone(r));
  }
}

// ─── Test Fixtures ──────────────────────────────────────────────────────────

const PLAYER_A = 'player-aaa';
const PLAYER_B = 'player-bbb';
const PLAYER_C = 'player-ccc';

function makeRun(overrides?: Partial<RunInput>): RunInput {
  return {
    runId: overrides?.runId ?? 'run-default',
    shardTier: overrides?.shardTier ?? 1,
    biome: overrides && 'biome' in overrides ? overrides.biome : 'flooded_crypt',
    durationSec: overrides?.durationSec ?? 300,
    extracted: overrides?.extracted ?? true,
    extractedItems: overrides?.extractedItems ?? [],
    xpGained: overrides?.xpGained ?? 100,
  };
}

function makeSuccessfulExtraction(): RunInput {
  return makeRun({
    runId: 'run-extraction-success',
    shardTier: 2,
    biome: 'shattered_bastion',
    durationSec: 540,
    extracted: true,
    extractedItems: [
      { itemId: 'shadow-blade', quantity: 1 },
      { itemId: 'health-potion', quantity: 3 },
    ],
    xpGained: 450,
  });
}

function makeDeathRun(): RunInput {
  return makeRun({
    runId: 'run-death',
    shardTier: 3,
    biome: 'corrupted_spire',
    durationSec: 120,
    extracted: false,
    extractedItems: [],
    xpGained: 25,
  });
}

/** Small delay to ensure createdAt timestamps differ across sequential records. */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 2));
}

// ─── Contract Tests ─────────────────────────────────────────────────────────

function runHistoryRepositoryContractTests(
  createRepo: () => RunHistoryRepository,
) {
  let repo: RunHistoryRepository;

  beforeEach(() => {
    repo = createRepo();
  });

  // ── Record / Retrieve Round-Trip ──

  describe('recordRun and getPlayerHistory', () => {
    it('recordRun() then getPlayerHistory() returns the run', async () => {
      const run = makeRun({ runId: 'run-001' });
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe('run-001');
      expect(history[0].shardTier).toBe(1);
      expect(history[0].biome).toBe('flooded_crypt');
      expect(history[0].durationSec).toBe(300);
      expect(history[0].extracted).toBe(true);
      expect(history[0].xpGained).toBe(100);
    });

    it('getPlayerHistory() returns empty array for new player', async () => {
      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toEqual([]);
    });

    it('getPlayerHistory() returns empty array for empty string player', async () => {
      const history = await repo.getPlayerHistory('');
      expect(history).toEqual([]);
    });

    it('getPlayerHistory() returns empty for unknown player', async () => {
      const history = await repo.getPlayerHistory('ghost-player');
      expect(history).toEqual([]);
    });

    it('records include a createdAt timestamp', async () => {
      const before = new Date();
      await repo.recordRun(PLAYER_A, makeRun());
      const after = new Date();

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].createdAt).toBeInstanceOf(Date);
      expect(history[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(history[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ── Chronological Order ──

  describe('multiple runs in chronological order', () => {
    it('returns runs newest first', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'run-first' }));
      await tick();
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'run-second' }));
      await tick();
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'run-third' }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(3);
      expect(history[0].runId).toBe('run-third');
      expect(history[1].runId).toBe('run-second');
      expect(history[2].runId).toBe('run-first');
    });

    it('timestamps are monotonically increasing', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.recordRun(PLAYER_A, makeRun({ runId: `run-${i}` }));
        await tick();
      }

      const history = await repo.getPlayerHistory(PLAYER_A);
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          history[i + 1].createdAt.getTime(),
        );
      }
    });
  });

  // ── Limit Parameter ──

  describe('getPlayerHistory with limit', () => {
    it('limit=1 returns only the most recent run', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'old' }));
      await tick();
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'new' }));

      const history = await repo.getPlayerHistory(PLAYER_A, 1);
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe('new');
    });

    it('limit=3 on 5 runs returns 3 most recent', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.recordRun(PLAYER_A, makeRun({ runId: `run-${i}` }));
        await tick();
      }

      const history = await repo.getPlayerHistory(PLAYER_A, 3);
      expect(history).toHaveLength(3);
      expect(history[0].runId).toBe('run-4');
      expect(history[1].runId).toBe('run-3');
      expect(history[2].runId).toBe('run-2');
    });

    it('limit larger than total returns all runs', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'only-run' }));

      const history = await repo.getPlayerHistory(PLAYER_A, 100);
      expect(history).toHaveLength(1);
      expect(history[0].runId).toBe('only-run');
    });

    it('limit=0 returns empty array', async () => {
      await repo.recordRun(PLAYER_A, makeRun());

      const history = await repo.getPlayerHistory(PLAYER_A, 0);
      expect(history).toHaveLength(0);
    });

    it('no limit returns all runs', async () => {
      for (let i = 0; i < 10; i++) {
        await repo.recordRun(PLAYER_A, makeRun({ runId: `run-${i}` }));
        await tick();
      }

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(10);
    });
  });

  // ── Player Isolation ──

  describe('player isolation', () => {
    it('different players have completely isolated histories', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'run-a', xpGained: 100 }));
      await repo.recordRun(PLAYER_B, makeRun({ runId: 'run-b', xpGained: 200 }));

      const historyA = await repo.getPlayerHistory(PLAYER_A);
      const historyB = await repo.getPlayerHistory(PLAYER_B);

      expect(historyA).toHaveLength(1);
      expect(historyB).toHaveLength(1);
      expect(historyA[0].runId).toBe('run-a');
      expect(historyA[0].xpGained).toBe(100);
      expect(historyB[0].runId).toBe('run-b');
      expect(historyB[0].xpGained).toBe(200);
    });

    it('recording a run for one player does not affect another', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'a-1' }));
      await repo.recordRun(PLAYER_B, makeRun({ runId: 'b-1' }));

      // Record more for A
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'a-2' }));
      await repo.recordRun(PLAYER_A, makeRun({ runId: 'a-3' }));

      const historyB = await repo.getPlayerHistory(PLAYER_B);
      expect(historyB).toHaveLength(1);
      expect(historyB[0].runId).toBe('b-1');
    });

    it('three players all have independent histories', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ shardTier: 1 }));
      await repo.recordRun(PLAYER_B, makeRun({ shardTier: 2 }));
      await repo.recordRun(PLAYER_C, makeRun({ shardTier: 3 }));

      const [hA, hB, hC] = await Promise.all([
        repo.getPlayerHistory(PLAYER_A),
        repo.getPlayerHistory(PLAYER_B),
        repo.getPlayerHistory(PLAYER_C),
      ]);

      expect(hA[0].shardTier).toBe(1);
      expect(hB[0].shardTier).toBe(2);
      expect(hC[0].shardTier).toBe(3);
    });

    it('unaffiliated player not affected by others recording runs', async () => {
      await repo.recordRun(PLAYER_A, makeRun());
      await repo.recordRun(PLAYER_B, makeRun());

      const historyC = await repo.getPlayerHistory(PLAYER_C);
      expect(historyC).toEqual([]);
    });
  });

  // ── Full Record Fields ──

  describe('run record with all fields populated', () => {
    it('preserves all fields on a successful extraction', async () => {
      const run = makeSuccessfulExtraction();
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      const record = history[0];

      expect(record.runId).toBe('run-extraction-success');
      expect(record.shardTier).toBe(2);
      expect(record.biome).toBe('shattered_bastion');
      expect(record.durationSec).toBe(540);
      expect(record.extracted).toBe(true);
      expect(record.extractedItems).toEqual([
        { itemId: 'shadow-blade', quantity: 1 },
        { itemId: 'health-potion', quantity: 3 },
      ]);
      expect(record.xpGained).toBe(450);
    });

    it('preserves all fields on a death run', async () => {
      const run = makeDeathRun();
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      const record = history[0];

      expect(record.runId).toBe('run-death');
      expect(record.shardTier).toBe(3);
      expect(record.biome).toBe('corrupted_spire');
      expect(record.durationSec).toBe(120);
      expect(record.extracted).toBe(false);
      expect(record.extractedItems).toEqual([]);
      expect(record.xpGained).toBe(25);
    });

    it('preserves undefined biome', async () => {
      const run = makeRun({ biome: undefined });
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].biome).toBeUndefined();
    });

    it('preserves complex extractedItems JSONB', async () => {
      const complexItems = [
        { itemId: 'enchanted-ring', quantity: 1, rarity: 'legendary', modifiers: ['fire', 'ice'] },
        { itemId: 'gold-nugget', quantity: 50 },
        { itemId: 'scroll', quantity: 2, text: 'ancient script' },
      ];
      const run = makeRun({ extractedItems: complexItems });
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extractedItems).toEqual(complexItems);
    });
  });

  // ── Edge Cases ──

  describe('edge cases', () => {
    it('handles zero duration (instant death)', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ durationSec: 0 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].durationSec).toBe(0);
    });

    it('handles very long runs', async () => {
      // 3 hours in seconds
      await repo.recordRun(PLAYER_A, makeRun({ durationSec: 10800 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].durationSec).toBe(10800);
    });

    it('handles zero XP gained', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ xpGained: 0 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].xpGained).toBe(0);
    });

    it('handles very high XP gained', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ xpGained: 999999 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].xpGained).toBe(999999);
    });

    it('handles zero loot (empty extractedItems)', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ extractedItems: [] }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extractedItems).toEqual([]);
    });

    it('handles all three shard tiers', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ runId: 't1', shardTier: 1 }));
      await tick();
      await repo.recordRun(PLAYER_A, makeRun({ runId: 't2', shardTier: 2 }));
      await tick();
      await repo.recordRun(PLAYER_A, makeRun({ runId: 't3', shardTier: 3 }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(3);
      expect(history.map((r) => r.shardTier).sort()).toEqual([1, 2, 3]);
    });

    it('handles extracted=false with items (dropped on death scenario)', async () => {
      await repo.recordRun(
        PLAYER_A,
        makeRun({
          extracted: false,
          extractedItems: [{ itemId: 'dropped-key', quantity: 1 }],
        }),
      );

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extracted).toBe(false);
      expect(history[0].extractedItems).toHaveLength(1);
    });

    it('handles many runs for the same player', async () => {
      const count = 100;
      for (let i = 0; i < count; i++) {
        await repo.recordRun(PLAYER_A, makeRun({ runId: `run-${i}`, xpGained: i }));
      }

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(count);
    });
  });

  // ── Data Integrity ──

  describe('data integrity', () => {
    it('returned data is a copy, not a live reference', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ xpGained: 100 }));

      const history1 = await repo.getPlayerHistory(PLAYER_A);
      history1[0].xpGained = 9999;

      const history2 = await repo.getPlayerHistory(PLAYER_A);
      expect(history2[0].xpGained).toBe(100);
    });

    it('modifying input after record does not affect stored data', async () => {
      const items = [{ itemId: 'sword', quantity: 1 }];
      const run = makeRun({ extractedItems: items });
      await repo.recordRun(PLAYER_A, run);

      // Mutate input after recording
      items.push({ itemId: 'shield', quantity: 1 });

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history[0].extractedItems).toHaveLength(1);
    });

    it('parallel records for different players do not interfere', async () => {
      await Promise.all([
        repo.recordRun(PLAYER_A, makeRun({ runId: 'a', xpGained: 10 })),
        repo.recordRun(PLAYER_B, makeRun({ runId: 'b', xpGained: 20 })),
        repo.recordRun(PLAYER_C, makeRun({ runId: 'c', xpGained: 30 })),
      ]);

      const [hA, hB, hC] = await Promise.all([
        repo.getPlayerHistory(PLAYER_A),
        repo.getPlayerHistory(PLAYER_B),
        repo.getPlayerHistory(PLAYER_C),
      ]);

      expect(hA[0].xpGained).toBe(10);
      expect(hB[0].xpGained).toBe(20);
      expect(hC[0].xpGained).toBe(30);
    });

    it('parallel reads return consistent data', async () => {
      await repo.recordRun(PLAYER_A, makeRun({ xpGained: 500 }));

      const [r1, r2, r3] = await Promise.all([
        repo.getPlayerHistory(PLAYER_A),
        repo.getPlayerHistory(PLAYER_A),
        repo.getPlayerHistory(PLAYER_A),
      ]);

      expect(r1[0].xpGained).toBe(500);
      expect(r2[0].xpGained).toBe(500);
      expect(r3[0].xpGained).toBe(500);
    });

    it('recording does not duplicate runs (append-only)', async () => {
      const run = makeRun({ runId: 'same-run' });
      await repo.recordRun(PLAYER_A, run);
      await tick();
      await repo.recordRun(PLAYER_A, run);

      const history = await repo.getPlayerHistory(PLAYER_A);
      // Both records should exist (run_history is append-only, not upsert)
      expect(history).toHaveLength(2);
      expect(history[0].runId).toBe('same-run');
      expect(history[1].runId).toBe('same-run');
    });
  });

  // ── Full Lifecycle (integration-style) ──

  describe('full run lifecycle', () => {
    it('player does multiple runs across tiers and biomes', async () => {
      await repo.recordRun(PLAYER_A, makeRun({
        runId: 'first-run', shardTier: 1, biome: 'flooded_crypt',
        durationSec: 180, extracted: false, xpGained: 25,
      }));
      await tick();

      await repo.recordRun(PLAYER_A, makeRun({
        runId: 'second-run', shardTier: 1, biome: 'flooded_crypt',
        durationSec: 420, extracted: true, xpGained: 150,
        extractedItems: [{ itemId: 'rusty-sword', quantity: 1 }],
      }));
      await tick();

      await repo.recordRun(PLAYER_A, makeRun({
        runId: 'third-run', shardTier: 2, biome: 'shattered_bastion',
        durationSec: 600, extracted: true, xpGained: 350,
        extractedItems: [
          { itemId: 'shadow-blade', quantity: 1 },
          { itemId: 'health-potion', quantity: 5 },
        ],
      }));

      const history = await repo.getPlayerHistory(PLAYER_A);
      expect(history).toHaveLength(3);

      // Newest first
      expect(history[0].runId).toBe('third-run');
      expect(history[0].shardTier).toBe(2);
      expect(history[0].extracted).toBe(true);

      expect(history[1].runId).toBe('second-run');
      expect(history[1].extracted).toBe(true);

      expect(history[2].runId).toBe('first-run');
      expect(history[2].extracted).toBe(false);

      // Limit to most recent 2
      const recent = await repo.getPlayerHistory(PLAYER_A, 2);
      expect(recent).toHaveLength(2);
      expect(recent[0].runId).toBe('third-run');
      expect(recent[1].runId).toBe('second-run');
    });
  });
}

// ─── Run Against InMemoryRunHistoryRepository ───────────────────────────────

describe('InMemoryRunHistoryRepository — persistence contract', () => {
  runHistoryRepositoryContractTests(() => new InMemoryRunHistoryRepository());
});
