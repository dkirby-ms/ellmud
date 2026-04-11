/**
 * PgPlayerInventoryRepository — PostgreSQL-backed inventory persistence.
 *
 * Maps the in-memory InventoryItemEntry model to the player_inventory +
 * item_definitions tables from migration 013.
 *
 * Issue #409 — Container System Phase 1.
 */

import { query, getClient } from '../db/index.js';
import type { PlayerInventoryRepository, InventoryItemEntry } from './PlayerInventoryRepository.js';

export class PgPlayerInventoryRepository implements PlayerInventoryRepository {
  async loadInventory(playerId: string): Promise<InventoryItemEntry[]> {
    const result = await query<{
      id: string;
      item_id: string;
      quantity: number;
      durability: number | null;
      metadata: Record<string, unknown>;
    }>(
      `SELECT pi.id, pi.item_id, pi.quantity, pi.durability, pi.metadata
       FROM player_inventory pi
       WHERE pi.player_id = $1
       ORDER BY pi.acquired_at`,
      [playerId],
    );

    // Join with item_definitions for name/weight/description
    const entries: InventoryItemEntry[] = [];
    for (const row of result.rows) {
      const defResult = await query<{
        name: string;
        weight: number;
        description: string;
      }>(
        `SELECT name, weight, description FROM item_definitions WHERE id = $1`,
        [row.item_id],
      );
      const def = defResult.rows[0];
      if (!def) continue; // orphaned entry — skip

      entries.push({
        itemId: row.item_id,
        name: def.name,
        weight: def.weight,
        description: def.description ?? '',
        quantity: row.quantity,
        durability: row.durability,
        metadata: row.metadata,
      });
    }
    return entries;
  }

  async saveInventory(playerId: string, items: InventoryItemEntry[]): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Clear existing inventory
      await client.query(`DELETE FROM player_inventory WHERE player_id = $1`, [playerId]);

      // Insert new entries
      for (const item of items) {
        await client.query(
          `INSERT INTO player_inventory (player_id, item_id, quantity, durability, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [playerId, item.itemId, item.quantity, item.durability, JSON.stringify(item.metadata)],
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

  async addItem(playerId: string, item: InventoryItemEntry): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM player_inventory
         WHERE player_id = $1 AND item_id = $2
         LIMIT 1
         FOR UPDATE`,
        [playerId, item.itemId],
      );

      if (existing.rows.length > 0) {
        await client.query(
          `UPDATE player_inventory
           SET quantity = quantity + $1
           WHERE id = $2`,
          [item.quantity, existing.rows[0].id],
        );
      } else {
        await client.query(
          `INSERT INTO player_inventory (player_id, item_id, quantity, durability, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [playerId, item.itemId, item.quantity, item.durability, JSON.stringify(item.metadata)],
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
    itemId: string,
    quantity = 1,
  ): Promise<InventoryItemEntry | null> {
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
         FROM player_inventory
         WHERE player_id = $1 AND item_id = $2
         FOR UPDATE`,
        [playerId, itemId],
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const row = result.rows[0];
      const removedQty = Math.min(quantity, row.quantity);

      if (quantity >= row.quantity) {
        await client.query(`DELETE FROM player_inventory WHERE id = $1`, [row.id]);
      } else {
        await client.query(
          `UPDATE player_inventory SET quantity = quantity - $1 WHERE id = $2`,
          [quantity, row.id],
        );
      }

      await client.query('COMMIT');

      // Look up item definition for name/weight/description
      const defResult = await query<{ name: string; weight: number; description: string }>(
        `SELECT name, weight, description FROM item_definitions WHERE id = $1`,
        [row.item_id],
      );
      const def = defResult.rows[0];

      return {
        itemId: row.item_id,
        name: def?.name ?? '',
        weight: def?.weight ?? 0,
        description: def?.description ?? '',
        quantity: removedQty,
        durability: row.durability,
        metadata: row.metadata,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async clearInventory(playerId: string): Promise<void> {
    await query(`DELETE FROM player_inventory WHERE player_id = $1`, [playerId]);
  }

  async listPlayerIds(): Promise<string[]> {
    const result = await query<{ player_id: string }>(
      `SELECT DISTINCT player_id FROM player_inventory ORDER BY player_id`,
    );
    return result.rows.map((r) => r.player_id);
  }
}
