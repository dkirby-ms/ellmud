/**
 * open [container] — Open a container and display its contents.
 *
 * Lists items inside with quantities and shows remaining capacity.
 * Works on containers in inventory or in the room (e.g., creature corpses).
 */

import type { CommandResult, CommandContext } from '../index.js';
import { getItemDefinition, getItemDefinitionsMap } from '../../items/registry.js';
import { getContainerSlotCount, getContainerContentsWeight } from '@ellmud/shared';
import type { ItemInstance } from '@ellmud/shared';

export function handleOpen(ctx: CommandContext): CommandResult {
  const { player, room, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Open what? Specify a container.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();

  // First check inventory
  const inventoryEntry = player.findItem(query);
  if (inventoryEntry) {
    return openInventoryContainer(inventoryEntry.item);
  }

  // Then check room items (e.g., corpse containers)
  const roomItem = room.items.find(
    (i) => i.id.toLowerCase() === query || i.name.toLowerCase().includes(query),
  );

  if (roomItem) {
    return openRoomContainer(roomItem);
  }

  return {
    narrations: [{ text: `You don't see "${args.join(' ')}" here.`, type: 'system' }],
  };
}

/** Open a container from player inventory (uses ItemDefinition registry). */
function openInventoryContainer(containerItem: { id: string; name: string; containerContents?: Array<{ definitionId: string; quantity: number; durability: number | null }> }): CommandResult {
  const containerDef = getItemDefinition(containerItem.id);

  if (!containerDef || containerDef.type !== 'container' || !containerDef.containerProperties) {
    return {
      narrations: [{ text: `The ${containerItem.name} is not a container.`, type: 'system' }],
    };
  }

  const props = containerDef.containerProperties;
  const contents = containerItem.containerContents ?? [];

  const lines: string[] = [];
  lines.push(`You open the ${containerItem.name}:`);

  if (contents.length === 0) {
    lines.push('  (empty)');
  } else {
    for (const slot of contents) {
      const itemDef = getItemDefinition(slot.definitionId);
      const name = itemDef?.name ?? slot.definitionId;
      const qty = slot.quantity > 1 ? ` (x${slot.quantity})` : '';
      lines.push(`  ${name}${qty}`);
    }
  }

  // Build an ItemInstance for weight calculation
  const containerInstance: ItemInstance = {
    instanceId: containerItem.id,
    definitionId: containerItem.id,
    durability: null,
    maxDurability: null,
    contents,
  };

  const usedSlots = getContainerSlotCount(containerInstance);
  const contentsWeight = getContainerContentsWeight(containerInstance, getItemDefinitionsMap());

  let capacityLine = `Slots: ${usedSlots}/${props.maxSlots}`;
  if (props.maxWeight != null) {
    capacityLine += ` | Weight: ${contentsWeight}/${props.maxWeight}`;
  }
  lines.push(capacityLine);

  return {
    narrations: [{ text: lines.join('\n'), type: 'system' }],
  };
}

/** Open a container from the room (e.g., corpse). No registry lookup needed. */
function openRoomContainer(containerItem: { id: string; name: string; containerContents?: Array<{ definitionId: string; quantity: number; durability: number | null }> }): CommandResult {
  const contents = containerItem.containerContents ?? [];

  if (contents.length === 0) {
    return {
      narrations: [{ text: `The ${containerItem.name} is empty.`, type: 'system' }],
    };
  }

  const lines: string[] = [];
  lines.push(`You open the ${containerItem.name}:`);

  for (const slot of contents) {
    const itemDef = getItemDefinition(slot.definitionId);
    const name = itemDef?.name ?? slot.definitionId;
    const qty = slot.quantity > 1 ? ` (x${slot.quantity})` : '';
    lines.push(`  ${name}${qty}`);
  }

  return {
    narrations: [{ text: lines.join('\n'), type: 'system' }],
  };
}
