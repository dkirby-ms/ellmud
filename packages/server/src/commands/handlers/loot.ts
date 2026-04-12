/**
 * loot [corpse | corpse of <name> | <item> from corpse] — Loot items from a corpse.
 *
 * Corpses are container items in the room. Anyone can loot any corpse. GDD §6.8.
 * "loot" or "loot corpse" loots all items from a corpse.
 * "loot <item> from corpse" delegates to the take command.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { handleTake } from './take.js';
import { getItemDefinition } from '../../items/registry.js';
import { removeItemFromContainer } from '@ellmud/shared';
import type { ItemInstance } from '@ellmud/shared';

export function handleLoot(ctx: CommandContext): CommandResult {
  const { args, room, player } = ctx;

  // Find corpses in the room (items with id starting with 'corpse-' and containerContents)
  const corpses = room.items.filter(item => 
    item.id.startsWith('corpse-') && item.containerContents !== undefined
  );

  if (corpses.length === 0) {
    return {
      narrations: [{ text: 'There are no corpses here to loot.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();

  // Parse "loot <item> from corpse [of <name>]"
  const fromMatch = query.match(/^(.+?)\s+from\s+(corpse.*)$/);
  
  if (fromMatch) {
    const itemQuery = fromMatch[1]!;
    const corpseQuery = fromMatch[2]!;
    
    // Delegate to 'take <item> from <corpse>' 
    return handleTake({
      ...ctx,
      args: [itemQuery, 'from', corpseQuery],
    });
  }

  // "loot", "loot corpse", or "loot corpse of <name>" → loot all from corpse
  // Find the corpse based on query
  let targetCorpse = corpses[0]; // Default to first corpse
  
  if (query && query !== 'corpse') {
    // Try to match corpse by name (e.g., "corpse of zombie" or just name like "zombie")
    const normalizedQuery = query.replace(/^corpse\s+(of\s+)?/, '');
    const found = corpses.find(c => {
      const corpseName = c.name.toLowerCase();
      return corpseName.includes(normalizedQuery) || 
             corpseName === `corpse of ${normalizedQuery}`;
    });
    
    if (found) {
      targetCorpse = found;
    } else {
      return {
        narrations: [{ text: `You don't see that corpse here.`, type: 'system' }],
      };
    }
  } else if (corpses.length > 1 && !query) {
    // Multiple corpses, need to specify which one
    const corpseNames = corpses.map(c => c.name).join(', ');
    return {
      narrations: [{ 
        text: `Multiple corpses here: ${corpseNames}. Specify which one to loot.`, 
        type: 'system' 
      }],
    };
  }

  // Loot all items from the corpse
  const contents = targetCorpse.containerContents ?? [];
  if (contents.length === 0) {
    return {
      narrations: [{ text: `The ${targetCorpse.name} is empty.`, type: 'system' }],
    };
  }

  const taken: string[] = [];
  const tooHeavy: string[] = [];

  // Create a mutable copy of containerContents
  const containerInstance: ItemInstance = {
    instanceId: targetCorpse.id,
    definitionId: targetCorpse.id,
    durability: null,
    maxDurability: null,
    contents: [...contents],
  };

  // Try to loot each item
  for (const slot of contents) {
    const itemDef = getItemDefinition(slot.definitionId);
    if (!itemDef) continue;

    const pseudoItem = { 
      id: itemDef.id, 
      name: itemDef.name, 
      weight: itemDef.weight, 
      description: itemDef.description 
    };

    if (player.canCarry(pseudoItem)) {
      player.addItem(pseudoItem);
      taken.push(itemDef.name);
      // Remove from container
      removeItemFromContainer(containerInstance, slot.definitionId, 1);
    } else {
      tooHeavy.push(itemDef.name);
    }
  }

  // Update the room item's containerContents
  targetCorpse.containerContents = containerInstance.contents;

  const lines: string[] = [];
  if (taken.length > 0) {
    lines.push(`You loot from the ${targetCorpse.name}: ${taken.join(', ')}.`);
  }
  if (tooHeavy.length > 0) {
    lines.push(`Too heavy to carry: ${tooHeavy.join(', ')}. (${player.currentWeight}/${player.maxCarryWeight})`);
  }
  if (taken.length === 0 && tooHeavy.length === 0) {
    lines.push(`The ${targetCorpse.name} is empty.`);
  }

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
  };
}
