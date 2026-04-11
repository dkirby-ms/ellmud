/**
 * put [item] in [container] — Place an item from inventory into a container.
 *
 * Both the item and container must be in the player's inventory.
 * Validates slot count, weight limit, and allowed item types via shared pure functions.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { getItemDefinition, ITEM_REGISTRY } from '../../items/registry.js';
import { addItemToContainer } from '@ellmud/shared';
import type { ItemInstance } from '@ellmud/shared';

export function handlePut(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Put what where? Usage: put <item> in <container>', type: 'system' }],
    };
  }

  // Split args on "in" preposition: "put rusty blade in satchel"
  const joined = args.join(' ');
  const inIndex = joined.toLowerCase().lastIndexOf(' in ');
  if (inIndex < 0) {
    return {
      narrations: [{ text: 'Put it where? Usage: put <item> in <container>', type: 'system' }],
    };
  }

  const itemQuery = joined.substring(0, inIndex).trim();
  const containerQuery = joined.substring(inIndex + 4).trim();

  if (!itemQuery || !containerQuery) {
    return {
      narrations: [{ text: 'Put what where? Usage: put <item> in <container>', type: 'system' }],
    };
  }

  // Find the item in inventory
  const itemEntry = player.findItem(itemQuery);
  if (!itemEntry) {
    return {
      narrations: [{ text: `You're not carrying "${itemQuery}".`, type: 'system' }],
    };
  }

  // Find the container in inventory
  const containerEntry = player.findItem(containerQuery);
  if (!containerEntry) {
    return {
      narrations: [{ text: `You're not carrying "${containerQuery}".`, type: 'system' }],
    };
  }

  // Prevent putting a container into itself
  if (itemEntry.item.id === containerEntry.item.id) {
    return {
      narrations: [{ text: `You can't put the ${containerEntry.item.name} inside itself.`, type: 'system' }],
    };
  }

  const containerDef = getItemDefinition(containerEntry.item.id);
  if (!containerDef || containerDef.type !== 'container' || !containerDef.containerProperties) {
    return {
      narrations: [{ text: `The ${containerEntry.item.name} is not a container.`, type: 'system' }],
    };
  }

  const itemDef = getItemDefinition(itemEntry.item.id);
  if (!itemDef) {
    return {
      narrations: [{ text: `Unknown item type.`, type: 'system' }],
    };
  }

  // Build ItemInstance for container operations
  const containerInstance: ItemInstance = {
    instanceId: containerEntry.item.id,
    definitionId: containerEntry.item.id,
    durability: null,
    maxDurability: null,
    contents: containerEntry.item.containerContents ?? [],
  };

  const result = addItemToContainer(
    containerInstance,
    containerDef,
    { definitionId: itemEntry.item.id, quantity: 1, durability: null },
    itemDef,
    ITEM_REGISTRY,
  );

  if (!result.success) {
    return {
      narrations: [{ text: result.error ?? 'Cannot put that item in the container.', type: 'system' }],
    };
  }

  // Success: remove item from inventory and update container contents
  player.removeItem(itemEntry.item.id);
  containerEntry.item.containerContents = result.updatedContainer!.contents;

  const cmdResult: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You put ${itemEntry.item.name} in ${containerEntry.item.name}.`,
      type: 'system',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  cmdResult._roomEvent = `${charName} puts something in ${containerEntry.item.name}.`;

  return cmdResult;
}
