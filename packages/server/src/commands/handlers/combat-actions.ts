/**
 * Combat action commands: strike, dodge, flee.
 *
 * These queue a combat action for the next tick resolution.
 * If the player is not in combat, they receive an error message.
 */

import type { CommandResult, CommandContext } from '../index.js';

/** strike [target] — Queue a strike action. */
export function handleStrike(ctx: CommandContext): CommandResult {
  const { player, args, combatSystem } = ctx;

  if (!combatSystem || !combatSystem.isInCombat(player.sessionId)) {
    return {
      narrations: [{ text: 'You are not in combat.', type: 'system' }],
    };
  }

  const targetId = args.length > 0 ? args.join(' ') : undefined;
  combatSystem.submitAction(player.sessionId, 'strike', targetId);

  return {
    narrations: [{
      text: targetId
        ? `You ready a strike against ${targetId}.`
        : 'You ready a strike.',
      type: 'combat',
    }],
  };
}

/** dodge — Queue a dodge action. */
export function handleDodge(ctx: CommandContext): CommandResult {
  const { player, combatSystem } = ctx;

  if (!combatSystem || !combatSystem.isInCombat(player.sessionId)) {
    return {
      narrations: [{ text: 'You are not in combat.', type: 'system' }],
    };
  }

  combatSystem.submitAction(player.sessionId, 'dodge');

  return {
    narrations: [{ text: 'You brace to dodge.', type: 'combat' }],
  };
}

/** flee [direction] — Queue a flee action. Optionally specify exit direction. */
export function handleFlee(ctx: CommandContext): CommandResult {
  const { player, room, combatSystem } = ctx;

  if (!combatSystem || !combatSystem.isInCombat(player.sessionId)) {
    return {
      narrations: [{ text: 'You are not in combat. Use "go" to move.', type: 'system' }],
    };
  }

  // Resolve flee target room from direction arg
  let fleeRoomId: string | undefined;
  if (ctx.args.length > 0) {
    const direction = ctx.args[0]!.toLowerCase() as import('../../zone/RoomGraph.js').Direction;
    fleeRoomId = room.exits.get(direction);
    if (!fleeRoomId) {
      return {
        narrations: [{ text: `There is no exit to the ${direction} to flee through.`, type: 'system' }],
      };
    }
  }

  combatSystem.submitAction(player.sessionId, 'flee', undefined, fleeRoomId);

  return {
    narrations: [{
      text: fleeRoomId ? 'You prepare to flee!' : 'You look for an escape route...',
      type: 'combat',
    }],
  };
}
