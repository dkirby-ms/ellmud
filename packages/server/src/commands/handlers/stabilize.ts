/**
 * Stabilize command handler — `stabilize [player]`
 *
 * Begins channeling stabilization on a downed player in the same room.
 * Costs 1 bandage item from inventory. Takes 2 ticks to complete.
 *
 * Validation order:
 * 1. Must have a DowningSystem reference in context
 * 2. Stabilizer must not be downed themselves
 * 3. Must specify a target (or default to first downed player in room)
 * 4. Target must be downed and in the same room
 * 5. Stabilizer must have a bandage in inventory
 * 6. Stabilizer must not already be channeling
 */

import type { CommandContext, CommandResult } from '../index.js';
import type { DowningSystem } from '../../systems/DowningSystem.js';
import { BANDAGE_ITEM_ID } from '../../systems/DowningSystem.js';

export function handleStabilize(ctx: CommandContext): CommandResult {
  const { player, args } = ctx;
  const downingSystem: DowningSystem | undefined = ctx.downingSystem;

  if (!downingSystem) {
    return {
      narrations: [{ text: 'The air feels oddly stable here.', type: 'system' }],
    };
  }

  // Can't stabilize while downed
  if (downingSystem.isPlayerDowned(player.sessionId)) {
    return {
      narrations: [{ text: 'You are too injured to help anyone.', type: 'system' }],
    };
  }

  // Already channeling?
  if (downingSystem.isChannelingStabilize(player.sessionId)) {
    return {
      narrations: [{ text: 'You are already stabilizing someone.', type: 'combat' }],
    };
  }

  // Find target: specified by args or first downed player in room
  let targetId: string | undefined;
  const targetQuery = args.join(' ').trim().toLowerCase();

  const downedInRoom = downingSystem.getAllDownedPlayers()
    .filter(d => d.roomId === player.currentRoomId && d.playerId !== player.sessionId);

  if (downedInRoom.length === 0) {
    return {
      narrations: [{ text: 'There is no one here to stabilize.', type: 'system' }],
    };
  }

  if (targetQuery) {
    // Match by player name or ID fragment
    const match = downedInRoom.find(
      d => d.playerName.toLowerCase().includes(targetQuery)
        || d.playerId.toLowerCase().includes(targetQuery),
    );
    if (!match) {
      return {
        narrations: [{ text: `You don't see "${targetQuery}" among the fallen.`, type: 'system' }],
      };
    }
    targetId = match.playerId;
  } else {
    // Default: first downed player in room
    targetId = downedInRoom[0]!.playerId;
  }

  // Check for bandage item
  const bandageEntry = player.findItem(BANDAGE_ITEM_ID);
  if (!bandageEntry) {
    return {
      narrations: [{ text: 'You need a bandage to stabilize someone.', type: 'system' }],
    };
  }

  // Consume the bandage
  player.removeItem(BANDAGE_ITEM_ID);

  // Begin channeling
  const result = downingSystem.beginStabilize(
    player.sessionId,
    player.sessionId, // Name = sessionId for Phase 1 (no display names yet)
    targetId,
  );

  if (typeof result === 'string') {
    // Validation error from the system — refund bandage
    player.addItem(bandageEntry.item);
    return {
      narrations: [{ text: result, type: 'system' }],
    };
  }

  return {
    narrations: [{
      text: `You kneel beside the fallen figure and begin applying bandages…`,
      type: 'combat',
    }],
  };
}
