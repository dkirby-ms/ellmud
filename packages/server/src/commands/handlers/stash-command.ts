/**
 * stash / store — Personal stash management commands.
 *
 * `stash` (view) and `store` are feature-gated to `feature_stash` rooms.
 * Handlers reference ctx.stashService for type safety; the actual async
 * service calls are wired at the room level.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleStashView(ctx: CommandContext): CommandResult {
  if (!ctx.stashService) {
    return {
      narrations: [{ text: 'There is no stash receptacle here.', type: 'system' }],
    };
  }

  // stashService.getStashSummary() is async — wired at the room level.
  return {
    narrations: [{ text: 'You inspect your personal stash…', type: 'system' }],
  };
}

export function handleStore(ctx: CommandContext): CommandResult {
  const { args } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Store what? Specify an item name. (e.g. "store corroded halberd")', type: 'system' }],
    };
  }

  if (!ctx.stashService) {
    return {
      narrations: [{ text: 'There is no stash receptacle here.', type: 'system' }],
    };
  }

  const itemName = args.join(' ');

  // stashService.storeItem() is async — wired at the room level.
  return {
    narrations: [{
      text: `You place the ${itemName} into your stash for safekeeping.`,
      type: 'room',
    }],
  };
}
