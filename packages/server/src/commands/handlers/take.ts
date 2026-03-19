/**
 * take [item] — Pick up an item from the room, add to inventory.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleTake(ctx: CommandContext): CommandResult {
  const { player, room, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Take what? Specify an item.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();

  // Find item in room by id or partial name match
  const itemIndex = room.items.findIndex(
    (i) => i.id.toLowerCase() === query || i.name.toLowerCase().includes(query),
  );

  if (itemIndex === -1) {
    return {
      narrations: [{ text: `You don't see "${args.join(' ')}" here.`, type: 'system' }],
    };
  }

  const item = room.items[itemIndex]!;

  if (!player.canCarry(item)) {
    return {
      narrations: [{
        text: `The ${item.name} is too heavy. You're carrying ${player.currentWeight}/${player.maxCarryWeight} weight.`,
        type: 'system',
      }],
    };
  }

  // Remove from room, add to inventory
  room.items.splice(itemIndex, 1);
  player.addItem(item);

  return {
    narrations: [{
      text: `You pick up the ${item.name}. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
      type: 'room',
    }],
  };
}
