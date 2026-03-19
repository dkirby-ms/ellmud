/**
 * inventory (or i) — List carried items with quantities.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleInventory(ctx: CommandContext): CommandResult {
  const { player } = ctx;

  if (player.inventory.size === 0) {
    return {
      narrations: [{ text: 'You carry nothing.', type: 'system' }],
    };
  }

  const lines: string[] = ['You are carrying:'];
  for (const entry of player.inventory.values()) {
    const qty = entry.quantity > 1 ? ` (x${entry.quantity})` : '';
    lines.push(`  ${entry.item.name}${qty} [${entry.item.weight} wt]`);
  }
  lines.push(`Weight: ${player.currentWeight}/${player.maxCarryWeight}`);

  return {
    narrations: [{ text: lines.join('\n'), type: 'system' }],
  };
}
