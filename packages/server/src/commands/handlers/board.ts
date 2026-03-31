/**
 * board / enter — Expedition discovery and entry commands.
 *
 * These handlers are feature-gated to `feature_expedition_board` rooms.
 * The actual matchMaker/shard-manager integration will be wired in a
 * later phase; for now the handlers reference ctx service fields for
 * type safety and return placeholder narrations.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleBoard(ctx: CommandContext): CommandResult {
  if (!ctx.queryShards) {
    return {
      narrations: [{ text: 'The expedition board is dark. No rift energy flows here.', type: 'system' }],
    };
  }

  // queryShards is async — actual invocation will be wired at the room level.
  // For now, return atmospheric placeholder narration.
  return {
    narrations: [{
      text: 'The expedition board crackles with energy… Rift signatures shimmer across its surface.\n\n'
        + 'Type `enter <shard-id>` to step through a rift.',
      type: 'system',
    }],
  };
}

export function handleEnter(ctx: CommandContext): CommandResult {
  const { args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Enter what? Specify a shard ID. (e.g. "enter shard-1")', type: 'system' }],
    };
  }

  if (!ctx.createShard) {
    return {
      narrations: [{ text: 'No rift anchor is available. Try again later.', type: 'system' }],
    };
  }

  const shardId = args.join(' ');

  // createShard is async — actual invocation wired at the room level.
  return {
    narrations: [{
      text: `You reach toward the rift marked "${shardId}"… The veil trembles, pulling you in.`,
      type: 'room',
    }],
  };
}
