/**
 * inventory (or i) — List carried items with quantities.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleInventory(ctx: CommandContext): CommandResult {
  const { player } = ctx;

  const lines: string[] = [];

  // Show equipped items (#390)
  if (player.equipment?.weapon || player.equipment?.armour) {
    lines.push('Equipped:');
    if (player.equipment.weapon) lines.push(`  Weapon: ${player.equipment.weapon}`);
    if (player.equipment.armour) lines.push(`  Armour: ${player.equipment.armour}`);
    lines.push('');
  }

  if (player.inventory.size === 0 && lines.length === 0) {
    return {
      narrations: [{ text: 'You carry nothing.', type: 'system' }],
    };
  }

  if (player.inventory.size === 0) {
    lines.push('Inventory is empty.');
  } else {
    lines.push('You are carrying:');
    for (const entry of player.inventory.values()) {
      const qty = entry.quantity > 1 ? ` (x${entry.quantity})` : '';
      lines.push(`  ${entry.item.name}${qty} [${entry.item.weight} wt]`);
    }
  }
  lines.push(`Weight: ${player.currentWeight}/${player.maxCarryWeight}`);

  return {
    narrations: [{ text: lines.join('\n'), type: 'system' }],
  };
}
