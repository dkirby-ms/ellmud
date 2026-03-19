/**
 * extract — Begin the extraction ritual to escape the shard.
 *
 * Validates: player must be in an extraction room, not in combat,
 * and not already extracting. Starts the multi-tick channel.
 */

import type { CommandResult, CommandContext } from '../index.js';

export function handleExtract(ctx: CommandContext): CommandResult {
  const { player, room, combatSystem, extractionSystem } = ctx;

  if (!extractionSystem) {
    return {
      narrations: [{ text: 'Extraction is not available here.', type: 'system' }],
    };
  }

  // Check: not in combat
  if (combatSystem?.isInCombat(player.sessionId)) {
    return {
      narrations: [{ text: 'You cannot begin the extraction ritual while in combat!', type: 'system' }],
    };
  }

  // Start the extraction channel — the system validates room type
  const result = extractionSystem.startExtraction(player.sessionId, room.id, room.type);

  return {
    narrations: [{
      text: result.narration,
      type: result.success ? 'system' : 'system',
    }],
  };
}
