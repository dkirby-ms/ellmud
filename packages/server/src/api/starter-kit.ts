/**
 * Starter kit — grants initial items to a newly created character.
 *
 * Starter kit: Rusty Blade (weapon), Tattered Leather (armour), Waterlogged Potion (consumable).
 * Looks up items from item_definitions by name. If items don't exist, skips gracefully.
 */

import { query } from '../db/index.js';

interface ItemDefRow {
  id: string;
  name: string;
  type: string;
  stats: { baseDurability?: number | null; weight?: number };
}

const STARTER_ITEM_NAMES = ['Rusty Blade', 'Tattered Leather', 'Waterlogged Potion'];

/**
 * Grant starter items to a new character's stash.
 * Only runs when Postgres is available (items live in DB).
 */
export async function grantStarterKit(playerId: string, characterId: string, usePg: boolean): Promise<number> {
  if (!usePg) return 0;

  const result = await query<ItemDefRow>(
    `SELECT id, name, type, stats FROM item_definitions
     WHERE name = ANY($1)`,
    [STARTER_ITEM_NAMES],
  );

  if (result.rows.length === 0) return 0;

  let granted = 0;
  for (const item of result.rows) {
    const durability = item.stats?.baseDurability ?? null;
    const metadata = durability != null ? JSON.stringify({ maxDurability: durability }) : '{}';

    await query(
      `INSERT INTO player_stash (player_id, character_id, item_id, quantity, durability, metadata)
       VALUES ($1, $2, $3, 1, $4, $5)`,
      [playerId, characterId, item.id, durability, metadata],
    );
    granted++;
  }

  return granted;
}
