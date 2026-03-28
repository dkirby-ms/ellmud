/**
 * PgLoadoutRepository — PostgreSQL-backed loadout persistence.
 *
 * Maps the in-memory LoadoutData model to the player_loadout table
 * from migration 013.
 *
 * Follows the same pool/client patterns as PgStashRepository.
 */

import { query, getClient } from '../db/index.js';
import type { LoadoutRepository, LoadoutData } from './LoadoutRepository.js';
import { createEmptyLoadoutData } from './LoadoutRepository.js';
import type { StashItemInstance, EquipmentSlotType } from '@ellmud/shared';
import { EQUIPMENT_SLOT_ORDER } from '@ellmud/shared';

export class PgLoadoutRepository implements LoadoutRepository {
  async load(playerId: string): Promise<LoadoutData> {
    const result = await query<{
      slot: string;
      instance_id: string;
      item_id: string;
      metadata: Record<string, unknown>;
    }>(
      `SELECT slot, instance_id, item_id, metadata
       FROM player_loadout
       WHERE player_id = $1`,
      [playerId],
    );

    const data = createEmptyLoadoutData();
    for (const row of result.rows) {
      const slot = row.slot as EquipmentSlotType;
      if (EQUIPMENT_SLOT_ORDER.includes(slot)) {
        data[slot] = {
          instanceId: row.instance_id,
          itemId: row.item_id,
          durability: (row.metadata as { durability?: number | null }).durability ?? null,
          maxDurability: (row.metadata as { maxDurability?: number | null }).maxDurability ?? null,
        };
      }
    }

    return data;
  }

  async save(playerId: string, loadout: LoadoutData): Promise<void> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM player_loadout WHERE player_id = $1`,
        [playerId],
      );

      for (const slot of EQUIPMENT_SLOT_ORDER) {
        const item = loadout[slot];
        if (!item) continue;

        const metadata: Record<string, unknown> = {};
        if (item.durability != null) metadata.durability = item.durability;
        if (item.maxDurability != null) metadata.maxDurability = item.maxDurability;

        await client.query(
          `INSERT INTO player_loadout (player_id, slot, instance_id, item_id, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [playerId, slot, item.instanceId, item.itemId, JSON.stringify(metadata)],
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

  async setSlot(
    playerId: string,
    slot: EquipmentSlotType,
    item: StashItemInstance | null,
  ): Promise<void> {
    if (item === null) {
      await query(
        `DELETE FROM player_loadout WHERE player_id = $1 AND slot = $2`,
        [playerId, slot],
      );
      return;
    }

    const metadata: Record<string, unknown> = {};
    if (item.durability != null) metadata.durability = item.durability;
    if (item.maxDurability != null) metadata.maxDurability = item.maxDurability;

    await query(
      `INSERT INTO player_loadout (player_id, slot, instance_id, item_id, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (player_id, slot) DO UPDATE
         SET instance_id = EXCLUDED.instance_id,
             item_id     = EXCLUDED.item_id,
             metadata    = EXCLUDED.metadata,
             equipped_at = now()`,
      [playerId, slot, item.instanceId, item.itemId, JSON.stringify(metadata)],
    );
  }

  async getSlot(
    playerId: string,
    slot: EquipmentSlotType,
  ): Promise<StashItemInstance | null> {
    const result = await query<{
      instance_id: string;
      item_id: string;
      metadata: Record<string, unknown>;
    }>(
      `SELECT instance_id, item_id, metadata
       FROM player_loadout
       WHERE player_id = $1 AND slot = $2`,
      [playerId, slot],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      instanceId: row.instance_id,
      itemId: row.item_id,
      durability: (row.metadata as { durability?: number | null }).durability ?? null,
      maxDurability: (row.metadata as { maxDurability?: number | null }).maxDurability ?? null,
    };
  }

  async clear(playerId: string): Promise<void> {
    await query(`DELETE FROM player_loadout WHERE player_id = $1`, [playerId]);
  }

  async listPlayerIds(): Promise<string[]> {
    const result = await query<{ player_id: string }>(
      `SELECT DISTINCT player_id FROM player_loadout ORDER BY player_id`,
    );
    return result.rows.map((r) => r.player_id);
  }
}
