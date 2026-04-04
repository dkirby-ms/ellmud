/**
 * loot [corpse | corpse of <name> | <item> from corpse] — Loot items from a corpse.
 *
 * Anyone can loot any corpse. GDD §6.8.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleLoot(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (!ctx.corpseSystem) {
    return {
      narrations: [{ text: 'There is nothing to loot here.', type: 'system' }],
    };
  }

  const corpses = ctx.corpseSystem.getCorpsesInRoom(player.currentRoomId);
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
    const corpse = ctx.corpseSystem.findCorpse(player.currentRoomId, corpseQuery);
    if (!corpse) {
      return {
        narrations: [{ text: `You don't see that corpse here.`, type: 'system' }],
      };
    }

    const result = ctx.corpseSystem.lootItem(corpse.id, itemQuery);
    if (!result) {
      return {
        narrations: [{ text: `The corpse doesn't contain anything like that.`, type: 'system' }],
      };
    }

    if (!player.canCarry(result.item)) {
      // Put it back
      result.corpse.items.push(result.item);
      return {
        narrations: [{
          text: `The ${result.item.name} is too heavy. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
          type: 'system',
        }],
      };
    }

    player.addItem(result.item);
    return {
      narrations: [{
        text: `You take the ${result.item.name} from the corpse of ${corpse.ownerName}.`,
        type: 'room',
      }],
    };
  }

  // "loot", "loot corpse", or "loot corpse of <name>" → loot all from corpse
  const corpse = ctx.corpseSystem.findCorpse(player.currentRoomId, query || 'corpse');
  if (!corpse) {
    return {
      narrations: [{ text: `You don't see that corpse here.`, type: 'system' }],
    };
  }

  if (corpse.items.length === 0) {
    return {
      narrations: [{ text: `The corpse of ${corpse.ownerName} has already been stripped bare.`, type: 'system' }],
    };
  }

  const result = ctx.corpseSystem.lootAll(corpse.id);
  if (!result || result.items.length === 0) {
    return {
      narrations: [{ text: `The corpse of ${corpse.ownerName} has already been stripped bare.`, type: 'system' }],
    };
  }

  const taken: string[] = [];
  const tooHeavy: string[] = [];

  for (const item of result.items) {
    if (player.canCarry(item)) {
      player.addItem(item);
      taken.push(item.name);
    } else {
      // Put back items that are too heavy
      corpse.items.push(item);
      tooHeavy.push(item.name);
    }
  }

  const lines: string[] = [];
  if (taken.length > 0) {
    lines.push(`You loot from the corpse of ${corpse.ownerName}: ${taken.join(', ')}.`);
  }
  if (tooHeavy.length > 0) {
    lines.push(`Too heavy to carry: ${tooHeavy.join(', ')}. (${player.currentWeight}/${player.maxCarryWeight})`);
  }

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
  };
}
