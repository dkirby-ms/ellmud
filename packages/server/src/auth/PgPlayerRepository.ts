/**
 * PgPlayerRepository — PostgreSQL-backed player persistence.
 *
 * Uses the connection pool from db/index.ts. Writes to both
 * player_identities and players tables (normalised schema for OAuth bolt-on).
 */

import { query, getClient } from '../db/index.js';
import type { PlayerRepository } from './PlayerRepository.js';
import { DuplicateUsernameError } from './PlayerRepository.js';
import type { Player } from '../db/types.js';

export class PgPlayerRepository implements PlayerRepository {
  async createPlayer(
    username: string,
    passwordHash: string,
  ): Promise<Player & { passwordHash: string }> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Create the identity row (local provider, password auth)
      const identityResult = await client.query<{ id: string }>(
        `INSERT INTO player_identities (provider, password_hash)
         VALUES ('local', $1)
         RETURNING id`,
        [passwordHash],
      );
      const identityId = identityResult.rows[0].id;

      // Create the player profile linked to the identity
      const playerResult = await client.query<Player>(
        `INSERT INTO players (identity_id, username)
         VALUES ($1, $2)
         RETURNING id, identity_id, username, created_at, updated_at`,
        [identityId, username],
      );

      await client.query('COMMIT');

      const row = playerResult.rows[0];
      return {
        id: row.id,
        identity_id: row.identity_id,
        username: row.username,
        created_at: row.created_at,
        updated_at: row.updated_at,
        passwordHash,
      };
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      // PostgreSQL unique-violation code: 23505
      if (isPgError(err) && err.code === '23505' && err.constraint === 'uq_player_username') {
        throw new DuplicateUsernameError(username);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async findByUsername(
    username: string,
  ): Promise<(Player & { passwordHash: string }) | null> {
    const result = await query<Player & { password_hash: string }>(
      `SELECT p.id, p.identity_id, p.username, p.created_at, p.updated_at,
              i.password_hash
       FROM players p
       JOIN player_identities i ON i.id = p.identity_id
       WHERE LOWER(p.username) = LOWER($1)`,
      [username],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      identity_id: row.identity_id,
      username: row.username,
      created_at: row.created_at,
      updated_at: row.updated_at,
      passwordHash: row.password_hash,
    };
  }

  async findById(id: string): Promise<Player | null> {
    const result = await query<Player>(
      `SELECT id, identity_id, username, created_at, updated_at
       FROM players
       WHERE id = $1`,
      [id],
    );

    return result.rows[0] ?? null;
  }
}

/** Type guard for PostgreSQL error objects. */
function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
