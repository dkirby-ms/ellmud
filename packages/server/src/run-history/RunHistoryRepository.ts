/**
 * RunHistoryRepository — Persistent shard run records.
 *
 * Records extraction outcomes and shard completion data per player.
 * Follows the Interface + InMemory + Pg pattern used by PlayerProfileRepository.
 *
 * The Pg implementation reads/writes the `run_history` table (migration 005).
 */

import type { ShardTier } from '@ellmud/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A single shard run record. */
export interface RunRecord {
  runId: string;
  playerId: string;
  shardTier: ShardTier;
  durationSec: number;
  extracted: boolean;
  extractedItems: unknown[];
  xpGained: number;
}

// ─── Interface ──────────────────────────────────────────────────────────────

export interface RunHistoryRepository {
  /** Record a completed shard run. */
  recordRun(run: RunRecord): Promise<void>;

  /** Get a player's run history, most recent first. */
  getPlayerHistory(playerId: string, limit?: number): Promise<RunRecord[]>;
}

// ─── In-Memory Implementation ───────────────────────────────────────────────

export class InMemoryRunHistoryRepository implements RunHistoryRepository {
  private runs: RunRecord[] = [];

  async recordRun(run: RunRecord): Promise<void> {
    this.runs.push(structuredClone(run));
  }

  async getPlayerHistory(playerId: string, limit = 50): Promise<RunRecord[]> {
    return this.runs
      .filter((r) => r.playerId === playerId)
      .reverse()
      .slice(0, limit)
      .map((r) => structuredClone(r));
  }
}
