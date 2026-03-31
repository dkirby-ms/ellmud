/**
 * PgRunHistoryRepository — PostgreSQL-backed run history persistence.
 *
 * Reads/writes the `run_history` table (migration 005).
 */

import { query } from '../db/index.js';
import type { RunHistoryRepository, RunRecord } from './RunHistoryRepository.js';
import type { ShardTier } from '@ellmud/shared';

interface RunRow {
  run_id: string;
  player_id: string;
  shard_tier: number;
  duration_sec: number;
  extracted: boolean;
  extracted_items: unknown[];
  xp_gained: number;
}

export class PgRunHistoryRepository implements RunHistoryRepository {
  async recordRun(run: RunRecord): Promise<void> {
    await query(
      `INSERT INTO run_history (run_id, player_id, shard_tier, duration_sec, extracted, extracted_items, xp_gained)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        run.runId,
        run.playerId,
        run.shardTier,
        run.durationSec,
        run.extracted,
        JSON.stringify(run.extractedItems),
        run.xpGained,
      ],
    );
  }

  async getPlayerHistory(playerId: string, limit = 50): Promise<RunRecord[]> {
    const result = await query<RunRow>(
      `SELECT run_id, player_id, shard_tier, duration_sec, extracted, extracted_items, xp_gained
       FROM run_history
       WHERE player_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [playerId, limit],
    );

    return result.rows.map((row) => ({
      runId: row.run_id,
      playerId: row.player_id,
      shardTier: row.shard_tier as ShardTier,
      durationSec: row.duration_sec,
      extracted: row.extracted,
      extractedItems: row.extracted_items,
      xpGained: row.xp_gained,
    }));
  }
}
