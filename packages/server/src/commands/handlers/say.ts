/**
 * say — Broadcast a message to all players in the current room.
 *
 * Usage: say [message]
 *
 * Proximity-based: Only players in the same room receive the message.
 */

import type { CommandResult, CommandContext } from '../index.js';

/**
 * Sanitizes user input to prevent prompt injection and control characters.
 * - Strips angle brackets (single-char removal — not bypassable by nesting)
 * - Removes C0/C1 control characters and DEL
 * - Truncates to max length
 */
function sanitizeInput(text: string, maxLength: number): string {
  return text
    .replace(/[<>]/g, '')              // Strip angle brackets (ANSI tags use [] not <>)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove C0, DEL, and C1 control characters
    .slice(0, maxLength)
    .trim();
}

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
