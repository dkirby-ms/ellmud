/**
 * teleport <player-name> <room-slug> — Dev-only teleport of a TARGET player to any room.
 *
 * Gated by DEV_MODE_ENABLED config flag — only available on dev servers.
 * Unlike goto (which moves the admin), this moves another player.
 */

import type { CommandContext, CommandResult } from '../index.js';
import { getConfig } from '../../config.js';

export function handleTeleport(ctx: CommandContext): CommandResult {
  if (!getConfig().devModeEnabled) {
    return {
      narrations: [{
        text: 'That command is not available.',
        type: 'system',
      }],
    };
  }

  const { args, resolveRoom, resolvePlayerByName } = ctx;

  if (args.length < 2) {
    return {
      narrations: [{ text: 'Usage: teleport <player-name> <room-slug>', type: 'system' }],
    };
  }

  const playerName = args[0]!;
  const slug = args[1]!.toLowerCase();

  if (!resolvePlayerByName) {
    return {
      narrations: [{ text: 'Teleport is not available in this context.', type: 'system' }],
    };
  }

  const target = resolvePlayerByName(playerName);
  if (!target) {
    return {
      narrations: [{ text: `No player named '${playerName}' found in this zone.`, type: 'system' }],
    };
  }

  const targetRoom = resolveRoom(slug);
  if (!targetRoom) {
    return {
      narrations: [{ text: `No room with slug '${slug}' in this zone.`, type: 'system' }],
    };
  }

  target.player.currentRoomId = slug;

  const displayName = target.characterName ?? playerName;

  return {
    narrations: [{ text: `You teleported ${displayName} to ${targetRoom.name}.`, type: 'system' }],
    targetNarrations: {
      sessionId: target.sessionId,
      narrations: [{ text: `You have been teleported to ${targetRoom.name}.`, type: 'system' }],
    },
  };
}
