/**
 * emote — Describe a player action to all players in the current room.
 *
 * Usage: emote [action]
 *
 * Proximity-based: Only players in the same room see the emote.
 */

import type { CommandResult, CommandContext } from '../index.js';

/**
 * Sanitizes user input to prevent prompt injection and control characters.
 */
function sanitizeInput(text: string, maxLength: number): string {
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML-like tags
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength)
    .trim();
}

export function handleEmote(ctx: CommandContext): CommandResult {
  const action = ctx.args.join(' ').trim();

  if (!action) {
    return {
      narrations: [{
        text: 'You attempt to emote but do nothing.',
        type: 'system',
      }],
    };
  }

  // Sanitize and limit action length
  const sanitized = sanitizeInput(action, 100);
  if (!sanitized) {
    return {
      narrations: [{
        text: 'Your gesture fades into the shadows.',
        type: 'system',
      }],
    };
  }

  // Simple template — A figure [action]
  const narration = `A figure ${sanitized}`;

  return {
    narrations: [{
      text: narration,
      type: 'speech', // Using 'speech' type for social interactions
    }],
  };
}
