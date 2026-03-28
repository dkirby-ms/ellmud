/**
 * loadout — View current equipment loadout.
 *
 * Feature-gated to `feature_stash` rooms (loadout management is co-located
 * with stash access). References ctx.loadoutService for type safety; the
 * actual async service call is wired at the room level.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleLoadoutView(ctx: CommandContext): CommandResult {
  if (!ctx.loadoutService) {
    return {
      narrations: [{ text: 'There is no equipment station here.', type: 'system' }],
    };
  }

  // loadoutService.getLoadoutSummary() is async — wired at the room level.
  return {
    narrations: [{ text: 'You review your equipped gear…', type: 'system' }],
  };
}
