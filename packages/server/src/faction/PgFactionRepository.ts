/**
 * PgFactionRepository — PostgreSQL-backed faction membership persistence.
 *
 * Reads/writes the `faction_membership` table (migration 004).
 */

import { query, getClient } from '../db/index.js';
import type { FactionRepository } from './FactionRepository.js';
import type { FactionMembership } from '../db/types.js';

interface MembershipRow {
  id: string;
  player_id: string;
  faction_id: string;
  reputation: number;
  rank: number;
  joined_at: Date;
  updated_at: Date;
}

export class PgFactionRepository implements FactionRepository {
  async getPlayerFactions(playerId: string): Promise<FactionMembership[]> {
    const result = await query<MembershipRow>(
      `SELECT id, player_id, faction_id, reputation, rank, joined_at, updated_at
       FROM faction_membership
       WHERE player_id = $1`,
      [playerId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      player_id: row.player_id,
      faction_id: row.faction_id,
      reputation: row.reputation,
      rank: row.rank,
      joined_at: row.joined_at,
      updated_at: row.updated_at,
    }));
  }

  async updateFaction(
    playerId: string,
    factionId: string,
    standing: { reputation: number; rank: number },
  ): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO faction_membership (player_id, faction_id, reputation, rank, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (player_id)
         DO UPDATE SET faction_id = $2, reputation = $3, rank = $4, updated_at = now()`,
        [playerId, factionId, standing.reputation, standing.rank],
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
