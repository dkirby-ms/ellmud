/**
 * position [front|flank|rear] — Change combat position (GDD §6.11).
 *
 * Shorthand: pos f, pos k, pos r
 * 
 * Position changes:
 * - Cost one tick action (no auto-attack that tick)
 * - 3-tick cooldown after repositioning
 * - Must be in combat to reposition
 * - Can't reposition to current position
 */

import type { CommandResult, CommandContext } from '../index.js';
import type { PositionZone } from '@ellmud/shared';

export function handlePosition(ctx: CommandContext): CommandResult {
  const { player, args, combatSystem } = ctx;

  if (!combatSystem) {
    return {
      narrations: [{ text: 'Combat positioning is not available here.', type: 'system' }],
    };
  }

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Specify a position: front, flank, or rear. (Shorthand: pos f/k/r)', type: 'system' }],
    };
  }

  // Parse position argument
  const arg = args[0].toLowerCase();
  let newPosition: PositionZone;

  switch (arg) {
    case 'front':
    case 'f':
      newPosition = 'front';
      break;
    case 'flank':
    case 'k':
      newPosition = 'flank';
      break;
    case 'rear':
    case 'r':
      newPosition = 'rear';
      break;
    default:
      return {
        narrations: [{ text: 'Invalid position. Choose: front, flank, or rear.', type: 'system' }],
      };
  }

  // Queue the position change
  const result = combatSystem.queuePositionChange(player.sessionId, newPosition);

  if (!result.success) {
    return {
      narrations: [{ text: result.reason || 'Cannot reposition right now.', type: 'system' }],
    };
  }

  return {
    narrations: [{ text: `Repositioning to ${newPosition}...`, type: 'combat' }],
  };
}
