/**
 * equip [item] — Equip an item from inventory.
 * unequip [weapon|armour] — Unequip an item back to inventory.
 *
 * Items must have an `equipSlot` property to be equippable.
 * Equipping replaces any existing item in that slot (swapped back to inventory).
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleEquip(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Equip what? Specify an item from your inventory.', type: 'system' }],
    };
  }

  const query = args.join(' ').toLowerCase();
  const entry = player.findItem(query);

  if (!entry) {
    return {
      narrations: [{ text: `You're not carrying "${args.join(' ')}".`, type: 'system' }],
    };
  }

  const item = entry.item;
  if (!item.equipSlot) {
    return {
      narrations: [{ text: `The ${item.name} can't be equipped.`, type: 'system' }],
    };
  }

  const slot = item.equipSlot;

  // Remove from inventory
  const removed = player.removeItem(item.id);
  if (!removed) {
    return {
      narrations: [{ text: 'Something went wrong. The item slips through your fingers.', type: 'system' }],
    };
  }

  // Swap out existing equipped item (if any)
  if (!player.equipment) {
    player.equipment = {};
  }

  const previouslyEquipped = player.equipment[slot];
  if (previouslyEquipped) {
    // Find the item in inventory that matches the old equipment name to swap back
    // Since VisibleEquipment stores only display strings, we store the full item
    // on the _equipped map for proper swap-back support.
    const oldItem = player.getEquippedItem(slot);
    if (oldItem) {
      player.addItem(oldItem);
      player.clearEquippedItem(slot);
    }
  }

  // Equip the new item
  player.equipment[slot] = item.name;
  player.setEquippedItem(slot, removed);

  const result: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You equip the ${removed.name}.`,
      type: 'room',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  result._roomEvent = `${charName} equips ${removed.name}.`;

  return result;
}

export function handleUnequip(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Unequip what? Specify "weapon" or "armour".', type: 'system' }],
    };
  }

  const slotQuery = args[0]!.toLowerCase();
  const slot = slotQuery === 'weapon' ? 'weapon' : slotQuery === 'armour' || slotQuery === 'armor' ? 'armour' : null;

  if (!slot) {
    return {
      narrations: [{ text: `"${args[0]}" is not a valid equipment slot. Use "weapon" or "armour".`, type: 'system' }],
    };
  }

  if (!player.equipment?.[slot]) {
    return {
      narrations: [{ text: `You don't have anything equipped in your ${slot} slot.`, type: 'system' }],
    };
  }

  const equippedItem = player.getEquippedItem(slot);
  if (!equippedItem) {
    // Clear dangling display string
    player.equipment[slot] = undefined;
    return {
      narrations: [{ text: `You don't have anything equipped in your ${slot} slot.`, type: 'system' }],
    };
  }

  if (!player.canCarry(equippedItem)) {
    return {
      narrations: [{
        text: `You can't unequip the ${equippedItem.name} — you're carrying too much. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
        type: 'system',
      }],
    };
  }

  // Move back to inventory
  player.addItem(equippedItem);
  player.clearEquippedItem(slot);
  player.equipment[slot] = undefined;

  const result: CommandResult & { _roomEvent?: string } = {
    narrations: [{
      text: `You unequip the ${equippedItem.name}. (${player.currentWeight}/${player.maxCarryWeight} weight)`,
      type: 'room',
    }],
  };

  const charName = ctx.characterName ?? 'Someone';
  result._roomEvent = `${charName} unequips ${equippedItem.name}.`;

  return result;
}
