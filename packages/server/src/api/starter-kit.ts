/**
 * Starter kit — grants initial items to a character's inventory on first zone join.
 *
 * Starter kit: Rusty Blade (weapon), Tattered Leather (armour), Waterlogged Potion (consumable).
 * Looks up items from item_definitions by name. If items don't exist, skips gracefully.
 *
 * Inventory is in-memory (extraction-game style), so items are granted on first zone join
 * rather than at character creation. A `starter_kit_granted` flag on the character record
 * prevents re-granting on subsequent joins.
 */

import { query } from '../db/index.js';
import type { CharacterRepository } from '../character/CharacterRepository.js';
import type { PlayerState } from '../state/PlayerState.js';
import { extractCombatItemStats } from '../combat/stats.js';

interface ItemDefRow {
  id: string;
  name: string;
  type: string;
  weight: number;
  description: string;
  base_durability: number | null;
  base_stats: Record<string, unknown> | null;
}

const STARTER_ITEM_NAMES = ['Rusty Blade', 'Tattered Leather', 'Waterlogged Potion'];

/**
 * Grant starter items to a character's in-memory inventory on first zone join.
 * Checks the `starter_kit_granted` flag to avoid re-granting.
 * Only runs when Postgres is available (item defs live in DB).
 */
export async function grantStarterKit(
  characterId: string,
  player: PlayerState,
  characterRepo: CharacterRepository,
  usePg: boolean,
): Promise<number> {
  if (!usePg) return 0;

  // Check if already granted
  const alreadyGranted = await characterRepo.isStarterKitGranted(characterId);
  if (alreadyGranted) return 0;

  const result = await query<ItemDefRow>(
    `SELECT id, name, type, weight, description, base_durability, base_stats FROM item_definitions
     WHERE name = ANY($1)`,
    [STARTER_ITEM_NAMES],
  );

  if (result.rows.length === 0) return 0;

  let granted = 0;
  for (const item of result.rows) {
    const equipSlot: 'weapon' | 'armour' | undefined =
      item.type === 'weapon' ? 'weapon' : item.type === 'armour' ? 'armour' : undefined;
    const stats = (item.type === 'weapon' || item.type === 'armour')
      ? extractCombatItemStats(item.type, item.base_stats ?? {})
      : undefined;

    const added = player.addItem({
      id: item.id,
      name: item.name,
      weight: item.weight,
      description: item.description,
      ...(equipSlot && { equipSlot }),
      ...(stats && { stats }),
    });
    if (added) granted++;
  }

  // Mark as granted so we don't re-issue on next join
  if (granted > 0) {
    await characterRepo.markStarterKitGranted(characterId);
  }

  return granted;
}
