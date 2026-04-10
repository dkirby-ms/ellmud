/**
 * drop [item] — Remove from inventory, place in current room.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleDrop(ctx: CommandContext): CommandResult {
  const { player, room, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Drop what? Specify an item.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();
  const entry = player.findItem(query);

  if (!entry) {
    return {
      narrations: [{ text: `You're not carrying "${args.join(' ')}".`, type: 'system' }],
    };
  }

  const removed = player.removeItem(entry.item.id);
  if (!removed) {
    return {
      narrations: [{ text: 'Something went wrong. The item slips through your fingers.', type: 'system' }],
    };
  }

  // Place in room
  room.items.push(removed);

  const result: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You drop the ${removed.name}. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
      type: 'room',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  result._roomEvent = `${charName} drops ${removed.name}.`;

  return result;
}
