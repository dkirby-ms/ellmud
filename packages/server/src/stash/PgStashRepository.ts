/**
 * PgStashRepository — PostgreSQL-backed stash persistence.
 *
 * Maps the in-memory StashEntry/StashItemInstance model to the
 * player_stash + item_definitions tables from migrations 002.
 *
 * Stash capacity is stored in a player_stash_capacity table (created
 * lazily or via migration). Falls back to DEFAULT_STASH_CAPACITY.
 */

import { query, getClient } from '../db/index.js';
import type { StashRepository, StashEntry } from './StashRepository.js';
import { DEFAULT_STASH_CAPACITY } from './StashRepository.js';
import type { StashItemInstance } from '@ellmud/shared';

export class PgStashRepository implements StashRepository {
  async loadStash(playerId: string): Promise<StashEntry[]> {
    const result = await query<{
      id: string;
      item_id: string;
      quantity: number;
      durability: number | null;
      metadata: Record<string, unknown>;
    }>(
      `SELECT id, item_id, quantity, durability, metadata
       FROM player_stash
       WHERE player_id = $1
       ORDER BY acquired_at`,
      [playerId],
    );

    return result.rows.map((row) => ({
      instance: {
        instanceId: row.id,
        itemId: row.item_id,
        durability: row.durability,
        maxDurability: (row.metadata as { maxDurability?: number | null }).maxDurability ?? null,
      } satisfies StashItemInstance,
      quantity: row.quantity,
    }));
  }

  async addItem(
    playerId: string,
    instance: StashItemInstance,
    quantity = 1,
  ): Promise<void> {
    // Try to stack onto an existing row with the same item_id for this player.
    // If no matching row, insert a new one.
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Check for an existing stack of the same item
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM player_stash
         WHERE player_id = $1 AND item_id = $2
         LIMIT 1
         FOR UPDATE`,
        [playerId, instance.itemId],
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE player_stash
           SET quantity = quantity + $1
           WHERE id = $2`,
          [quantity, existing.rows[0].id],
        );
      } else {
        const metadata: Record<string, unknown> = {};
        if (instance.maxDurability != null) {
          metadata.maxDurability = instance.maxDurability;
        }

        await client.query(
          `INSERT INTO player_stash (player_id, item_id, quantity, durability, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            playerId,
            instance.itemId,
            quantity,
            instance.durability,
            JSON.stringify(metadata),
          ],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async removeItem(
    playerId: string,
    instanceId: string,
    quantity = 1,
  ): Promise<StashEntry | null> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const result = await client.query<{
        id: string;
        item_id: string;
        quantity: number;
        durability: number | null;
        metadata: Record<string, unknown>;
      }>(
        `SELECT id, item_id, quantity, durability, metadata
         FROM player_stash
         WHERE id = $1 AND player_id = $2
         FOR UPDATE`,
        [instanceId, playerId],
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const row = result.rows[0];
      const removedQty = Math.min(quantity, row.quantity);

      if (quantity >= row.quantity) {
        await client.query(`DELETE FROM player_stash WHERE id = $1`, [row.id]);
      } else {
        await client.query(
          `UPDATE player_stash SET quantity = quantity - $1 WHERE id = $2`,
          [quantity, row.id],
        );
      }

      await client.query('COMMIT');

      return {
        instance: {
          instanceId: row.id,
          itemId: row.item_id,
          durability: row.durability,
          maxDurability: (row.metadata as { maxDurability?: number | null }).maxDurability ?? null,
        },
        quantity: removedQty,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCapacity(playerId: string): Promise<number> {
    // Capacity stored in a metadata approach — using a simple query
    // against a player_stash_capacity row, or defaulting.
    const result = await query<{ max_weight: number }>(
      `SELECT max_weight FROM player_stash_capacity WHERE player_id = $1`,
      [playerId],
    );
    return result.rows[0]?.max_weight ?? DEFAULT_STASH_CAPACITY;
  }

  async setCapacity(playerId: string, maxWeight: number): Promise<void> {
    await query(
      `INSERT INTO player_stash_capacity (player_id, max_weight)
       VALUES ($1, $2)
       ON CONFLICT (player_id) DO UPDATE SET max_weight = $2`,
      [playerId, maxWeight],
    );
  }

  async clearStash(playerId: string): Promise<void> {
    await query(`DELETE FROM player_stash WHERE player_id = $1`, [playerId]);
  }

  async listPlayerIds(): Promise<string[]> {
    const result = await query<{ player_id: string }>(
      `SELECT DISTINCT player_id FROM player_stash ORDER BY player_id`,
    );
    return result.rows.map((r) => r.player_id);
  }
}
