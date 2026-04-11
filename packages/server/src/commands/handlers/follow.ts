/**
 * follow <player> — Start following a player in the same room.
 * unfollow          — Stop following the current leader.
 *
 * Followers automatically move when their leader moves rooms.
 * Following resets on disconnect / zone collapse (#403 Phase 1).
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleFollow(ctx: CommandContext): CommandResult {
  const { player, args, otherPlayerInfo } = ctx;

  if (args.length === 0) {
    if (player.followingPlayerId) {
      return {
        narrations: [{ text: `You are currently following someone. Use 'unfollow' to stop.`, type: 'system' }],
      };
    }
    return {
      narrations: [{ text: 'Follow whom? Specify a player name.', type: 'system' }],
    };
  }

  const targetName = args.join(' ').toLowerCase();

  // Find target player in the same room
  const target = otherPlayerInfo?.find(
    (p) => !p.anon && p.name.toLowerCase() === targetName,
  );

  if (!target) {
    return {
      narrations: [{ text: `You don't see "${args.join(' ')}" here.`, type: 'system' }],
    };
  }

  // Can't follow yourself (shouldn't happen via otherPlayerInfo but guard anyway)
  if (target.sessionId === player.sessionId) {
    return {
      narrations: [{ text: `You can't follow yourself.`, type: 'system' }],
    };
  }

  // Check if target allows followers (#417)
  if (target.allowFollowing === false) {
    return {
      narrations: [{ text: `That player is not accepting followers.`, type: 'system' }],
    };
  }

  // Already following this player
  if (player.followingPlayerId === target.sessionId) {
    return {
      narrations: [{ text: `You are already following ${target.name}.`, type: 'system' }],
    };
  }

  // Already following someone else — stop first
  if (player.followingPlayerId) {
    return {
      narrations: [{ text: `You are already following someone. Use 'unfollow' first.`, type: 'system' }],
    };
  }

  // Start following
  player.startFollowing(target.sessionId);

  const charName = ctx.characterName ?? 'Someone';
  const result: CommandResult & { _roomEvent?: string; _followStarted?: { followerId: string; leaderId: string } } = {
    narrations: [{ text: `You begin following ${target.name}.`, type: 'room' }],
    _followStarted: { followerId: player.sessionId, leaderId: target.sessionId },
  };
  result._roomEvent = `${charName} begins following ${target.name}.`;
  return result;
}

export function handleUnfollow(ctx: CommandContext): CommandResult {
  const { player } = ctx;

  if (!player.followingPlayerId) {
    return {
      narrations: [{ text: `You aren't following anyone.`, type: 'system' }],
    };
  }

  const leaderId = player.stopFollowing();
  if (!leaderId) {
    return {
      narrations: [{ text: `You aren't following anyone.`, type: 'system' }],
    };
  }

  const charName = ctx.characterName ?? 'Someone';
  const result: CommandResult & { _roomEvent?: string; _followStopped?: { followerId: string; leaderId: string } } = {
    narrations: [{ text: 'You stop following.', type: 'room' }],
    _followStopped: { followerId: player.sessionId, leaderId },
  };
  result._roomEvent = `${charName} stops following.`;
  return result;
}
