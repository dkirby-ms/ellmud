/**
 * rent — Inn rent command handler.
 *
 * Feature-gated to `feature_inn` rooms. When a player rents a room,
 * the ZoneRoom persists their current zone/room as their last inn
 * and triggers a consented leave (the player "logs out" at the inn).
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleRent(ctx: CommandContext): CommandResult {
  if (ctx.room.type !== 'feature_inn') {
    return { narrations: [{ text: "You can't do that here.", type: 'system' }] };
  }

  return {
    narrations: [{
      text: 'You settle your account and retire to a quiet room. The sounds of the world fade as sleep takes you…',
      type: 'system',
    }],
    action: 'rent',
  };
}
