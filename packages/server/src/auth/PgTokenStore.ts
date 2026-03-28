/**
 * PgTokenStore — PostgreSQL-backed session token persistence.
 *
 * Tokens survive server restarts. Expired tokens are cleaned up lazily
 * via the cleanup() method and filtered out on read (expires_at > now()).
 *
 * Uses the shared pool from db/index.ts (lazy initialization).
 */

import { query } from '../db/index.js';
import type { TokenStore, TokenData } from './TokenStore.js';

export class PgTokenStore implements TokenStore {
  async set(token: string, data: TokenData, ttlSeconds: number): Promise<void> {
    await query(
      `INSERT INTO auth_tokens (token, player_id, username, expires_at)
       VALUES ($1, $2, $3, now() + $4 * interval '1 second')
       ON CONFLICT (token) DO UPDATE
         SET player_id  = EXCLUDED.player_id,
             username   = EXCLUDED.username,
             expires_at = EXCLUDED.expires_at`,
      [token, data.playerId, data.username, ttlSeconds],
    );
  }

  async get(token: string): Promise<TokenData | null> {
    const result = await query<{ player_id: string; username: string }>(
      `SELECT player_id, username
       FROM auth_tokens
       WHERE token = $1 AND expires_at > now()`,
      [token],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return { playerId: row.player_id, username: row.username };
  }

  async delete(token: string): Promise<void> {
    await query(`DELETE FROM auth_tokens WHERE token = $1`, [token]);
  }

  /** Remove all expired tokens. Call periodically or on a schedule. */
  async cleanup(): Promise<number> {
    const result = await query(`DELETE FROM auth_tokens WHERE expires_at < now()`);
    return result.rowCount ?? 0;
  }
}
