/**
 * open [container] — Open a container in your inventory and display its contents.
 *
 * Lists items inside with quantities and shows remaining capacity.
 * Works on containers in inventory only.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { getItemDefinition, getItemDefinitionsMap } from '../../items/registry.js';
import { getContainerSlotCount, getContainerContentsWeight } from '@ellmud/shared';
import type { ItemInstance } from '@ellmud/shared';

export function handleOpen(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Open what? Specify a container.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();
  const entry = player.findItem(query);

  if (!entry) {
    return {
      narrations: [{ text: `You're not carrying "${args.join(' ')}".`, type: 'system' }],
    };
  }

  const containerItem = entry.item;
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
