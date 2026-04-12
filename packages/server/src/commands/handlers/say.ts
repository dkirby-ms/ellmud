/**
 * say — Broadcast a message to all players in the current room.
 *
 * Usage: say [message]
 *
 * Proximity-based: Only players in the same room receive the message.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { sanitizeInput } from './sanitize.js';

export function handleSay(ctx: CommandContext): CommandResult {
  const message = ctx.args.join(' ').trim();

  if (!message) {
    return {
      narrations: [{
        text: 'You open your mouth but say nothing.',
        type: 'system',
      }],
    };
  }

  // Sanitize and limit message length
  const sanitized = sanitizeInput(message, 200);
  if (!sanitized) {
    return {
      narrations: [{
        text: 'Your words are lost in the void.',
        type: 'system',
      }],
    };
  }

  // Simple template fallback — Volo will enhance this with LLM narration later
  const narration = `A figure says: "${sanitized}"`;

  return {
    narrations: [{
      text: narration,
      type: 'speech',
    }],
  };
}
