/**
 * take [item] — Pick up an item from the room, add to inventory.
 * take [item] from [container] — Remove an item from a container in inventory.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { getItemDefinition } from '../../items/registry.js';
import { removeItemFromContainer } from '@ellmud/shared';
import type { ItemInstance } from '@ellmud/shared';

export function handleTake(ctx: CommandContext): CommandResult {
  const { player, room, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Take what? Specify an item.', type: 'system' }],
    };
  }

  // Check for "take X from Y" syntax
  const joined = args.join(' ');
  const fromIndex = joined.toLowerCase().lastIndexOf(' from ');
  if (fromIndex >= 0) {
    return handleTakeFromContainer(ctx, joined, fromIndex);
  }

  const query = joined.toLowerCase();

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

  const result: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You pick up the ${item.name}. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
      type: 'room',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  result._roomEvent = `${charName} picks up ${item.name}.`;

  return result;
}

/** Handle "take <item> from <container>" — remove item from container to inventory. */
function handleTakeFromContainer(
  ctx: CommandContext,
  joined: string,
  fromIndex: number,
): CommandResult {
  const { player } = ctx;

  const itemQuery = joined.substring(0, fromIndex).trim();
  const containerQuery = joined.substring(fromIndex + 6).trim();

  if (!itemQuery || !containerQuery) {
    return {
      narrations: [{ text: 'Take what from where? Usage: take <item> from <container>', type: 'system' }],
    };
  }

  // Find the container in inventory
  const containerEntry = player.findItem(containerQuery);
  if (!containerEntry) {
    return {
      narrations: [{ text: `You're not carrying "${containerQuery}".`, type: 'system' }],
    };
  }

  const containerDef = getItemDefinition(containerEntry.item.id);
  if (!containerDef || containerDef.type !== 'container' || !containerDef.containerProperties) {
    return {
      narrations: [{ text: `The ${containerEntry.item.name} is not a container.`, type: 'system' }],
    };
  }

  const contents = containerEntry.item.containerContents ?? [];
  if (contents.length === 0) {
    return {
      narrations: [{ text: `The ${containerEntry.item.name} is empty.`, type: 'system' }],
    };
  }

  // Find the item inside the container by name or ID match
  const lowerQuery = itemQuery.toLowerCase();
  const matchedSlot = contents.find((slot) => {
    const def = getItemDefinition(slot.definitionId);
    return slot.definitionId.toLowerCase() === lowerQuery
      || (def && def.name.toLowerCase().includes(lowerQuery));
  });

  if (!matchedSlot) {
    return {
      narrations: [{ text: `The ${containerEntry.item.name} doesn't contain "${itemQuery}".`, type: 'system' }],
    };
  }

  const itemDef = getItemDefinition(matchedSlot.definitionId);
  if (!itemDef) {
    return {
      narrations: [{ text: 'Unknown item type.', type: 'system' }],
    };
  }

  // Check weight before removing
  const pseudoItem = { id: itemDef.id, name: itemDef.name, weight: itemDef.weight, description: itemDef.description };
  if (!player.canCarry(pseudoItem)) {
    return {
      narrations: [{
        text: `The ${itemDef.name} is too heavy. You're carrying ${player.currentWeight}/${player.maxCarryWeight} weight.`,
        type: 'system',
      }],
    };
  }

  // Build ItemInstance for container operations
  const containerInstance: ItemInstance = {
    instanceId: containerEntry.item.id,
    definitionId: containerEntry.item.id,
    durability: null,
    maxDurability: null,
    contents,
  };

  const result = removeItemFromContainer(containerInstance, matchedSlot.definitionId, 1);

  if (!result.success) {
    return {
      narrations: [{ text: result.error ?? 'Cannot take that item from the container.', type: 'system' }],
    };
  }

  // Success: update container contents and add item to inventory
  containerEntry.item.containerContents = result.updatedContainer!.contents;
  player.addItem(pseudoItem);

  const cmdResult: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You take ${itemDef.name} from ${containerEntry.item.name}.`,
      type: 'system',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  cmdResult._roomEvent = `${charName} takes something from ${containerEntry.item.name}.`;

  return cmdResult;
}
