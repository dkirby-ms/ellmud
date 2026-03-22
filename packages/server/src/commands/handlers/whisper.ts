/**
 * whisper — Send a private message to another player in the same room.
 *
 * Usage: whisper [target_description] [message]
 *
 * Proximity-based: Target must be in the same room. Only the target receives the message.
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

export function handleWhisper(ctx: CommandContext): CommandResult {
  if (ctx.args.length < 2) {
    return {
      narrations: [{
        text: 'Usage: whisper [target] [message]',
        type: 'system',
      }],
    };
  }

  // First arg is target description, rest is message
  const targetDesc = ctx.args[0].toLowerCase();
  const message = ctx.args.slice(1).join(' ').trim();

  if (!message) {
    return {
      narrations: [{
        text: 'What do you want to whisper?',
        type: 'system',
      }],
    };
  }

  // Check if there are other players in the room
  if (ctx.otherPlayersInRoom.length === 0) {
    return {
      narrations: [{
        text: 'There is no one here to whisper to.',
        type: 'system',
      }],
    };
  }

  // For Phase 1, we'll use a simple matching strategy:
  // Target description could be a player name or generic "player", "wanderer", etc.
  // Since we don't have player names in CommandContext yet, we'll match by sessionId prefix
  // or use "player"/"wanderer" to target the first other player
  
  let targetSessionId: string | undefined;

  // Generic target matching — select first other player
  if (['player', 'wanderer', 'figure', 'stranger'].includes(targetDesc)) {
    targetSessionId = ctx.otherPlayersInRoom[0];
  } else {
    // Try to match by sessionId prefix (for testing/debugging)
    // In production, this would integrate with player names from PlayerState
    targetSessionId = ctx.otherPlayersInRoom.find(sid => 
      sid.toLowerCase().startsWith(targetDesc)
    );
  }

  if (!targetSessionId) {
    return {
      narrations: [{
        text: `You don't see anyone matching "${targetDesc}" here.`,
        type: 'system',
      }],
    };
  }

  // Sanitize and limit message length
  const sanitized = sanitizeInput(message, 200);
  if (!sanitized) {
    return {
      narrations: [{
        text: 'Your whisper fades into silence.',
        type: 'system',
      }],
    };
  }

  // Return narration for the sender (confirmation)
  // The target will receive a separate message via ShardRoom broadcasting logic
  return {
    narrations: [{
      text: `You whisper to a nearby figure: "${sanitized}"`,
      type: 'speech',
    }],
  };
}
