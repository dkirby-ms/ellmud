/**
 * /peaceful — Dev mode toggle.
 *
 * When active, hostile creatures ignore the player.
 * Gated by DEV_MODE_ENABLED config flag — only available on dev servers.
 */

import type { CommandContext, CommandResult } from '../index.js';
import { getConfig } from '../../config.js';

export function handlePeaceful(ctx: CommandContext): CommandResult {
  if (!getConfig().devModeEnabled) {
    return {
      narrations: [{
        text: 'That command is not available.',
        type: 'system',
      }],
    };
  }

  ctx.player.peaceful = !ctx.player.peaceful;

  const status = ctx.player.peaceful
    ? 'Peaceful mode ON — creatures will ignore you.'
    : 'Peaceful mode OFF — creatures will attack normally.';

  return {
    narrations: [{ text: status, type: 'system' }],
  };
}
