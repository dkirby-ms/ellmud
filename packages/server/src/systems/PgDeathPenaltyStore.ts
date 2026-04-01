/**
 * PgDeathPenaltyStore — PostgreSQL-backed death penalty persistence.
 *
 * Deaths always count. Data survives server restarts.
 * Uses the shared pool from db/index.ts (lazy initialization).
 */

import { query } from '../db/index.js';
import type { DeathPenaltyStore } from './DeathPenalty.js';

export class PgDeathPenaltyStore implements DeathPenaltyStore {
  async getDeathCount(playerId: string): Promise<number> {
    const result = await query<{ death_count: number }>(
      `SELECT death_count FROM player_death_penalty WHERE player_id = $1`,
      [playerId],
    );
    return result.rows.length > 0 ? result.rows[0].death_count : 0;
  }

  async incrementDeathCount(playerId: string): Promise<number> {
    const result = await query<{ death_count: number }>(
      `INSERT INTO player_death_penalty (player_id, death_count)
       VALUES ($1, 1)
       ON CONFLICT (player_id) DO UPDATE
         SET death_count = player_death_penalty.death_count + 1
       RETURNING death_count`,
      [playerId],
    );
    return result.rows[0].death_count;
  }

  async resetDeathCount(playerId: string): Promise<void> {
    await query(
      `DELETE FROM player_death_penalty WHERE player_id = $1`,
      [playerId],
    );
  }

  async getLastDeathTime(playerId: string): Promise<number | null> {
    const result = await query<{ last_death_at: string | null }>(
      `SELECT last_death_at FROM player_death_penalty WHERE player_id = $1`,
      [playerId],
    );
    if (result.rows.length === 0 || result.rows[0].last_death_at === null) return null;
    return Number(result.rows[0].last_death_at);
  }

  async setLastDeathTime(playerId: string, timestamp: number): Promise<void> {
    await query(
      `INSERT INTO player_death_penalty (player_id, death_count, last_death_at)
       VALUES ($1, 0, $2)
       ON CONFLICT (player_id) DO UPDATE
         SET last_death_at = EXCLUDED.last_death_at`,
      [playerId, timestamp],
    );
  }
}
