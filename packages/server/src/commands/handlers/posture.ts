/**
 * Posture commands — /stand, /sit, /crouch, /prone, /recline (#371).
 *
 * Each command sets the character's posture and broadcasts a narration
 * to the current room. Only player-settable postures are allowed;
 * floating/hovering are system-set only.
 */

import type { Posture } from '@ellmud/shared';
import type { CommandResult, CommandContext } from '../index.js';

/** Third-person narration messages when changing posture (for room broadcast). */
const POSTURE_CHANGE_MESSAGES: Record<Posture, string> = {
  standing: 'stands up.',
  sitting: 'sits down.',
  crouching: 'crouches down.',
  prone: 'drops to the ground.',
  reclining: 'reclines.',
  floating: 'begins to float.',
  hovering: 'hovers in place.',
};

/** Second-person narration (for the acting player). */
const POSTURE_SELF_MESSAGES: Record<Posture, string> = {
  standing: 'stand up',
  sitting: 'sit down',
  crouching: 'crouch down',
  prone: 'drop to the ground',
  reclining: 'recline',
  floating: 'begin to float',
  hovering: 'hover in place',
};

function changePosture(ctx: CommandContext, newPosture: Posture): CommandResult {
  const { player } = ctx;

  if (player.posture === newPosture) {
    return {
      narrations: [{ text: `You are already ${newPosture}.`, type: 'system' }],
    };
  }

  player.posture = newPosture;

  const characterName = ctx.characterName ?? 'A wanderer';
  const selfMsg = `You ${POSTURE_SELF_MESSAGES[newPosture]}. `;

  return {
    narrations: [{ text: selfMsg, type: 'room' }],
    // ZoneRoom will broadcast the third-person message to the room
    _postureChange: { characterName, message: `${characterName} ${POSTURE_CHANGE_MESSAGES[newPosture]}` },
  } as CommandResult & { _postureChange?: { characterName: string; message: string } };
}

export function handleStand(ctx: CommandContext): CommandResult {
  return changePosture(ctx, 'standing');
}

export function handleSit(ctx: CommandContext): CommandResult {
  return changePosture(ctx, 'sitting');
}

export function handleCrouch(ctx: CommandContext): CommandResult {
  return changePosture(ctx, 'crouching');
}

export function handleProne(ctx: CommandContext): CommandResult {
  return changePosture(ctx, 'prone');
}

export function handleRecline(ctx: CommandContext): CommandResult {
  return changePosture(ctx, 'reclining');
}

/**
 * System utility: force a player into a specific posture.
 * Used by combat knockdowns and future game effects.
 * Returns the broadcast message for the room.
 */
export function forcePosture(
  player: import('../../state/PlayerState.js').PlayerState,
  posture: Posture,
  characterName: string,
): { message: string } | null {
  if (player.posture === posture) return null;

  player.posture = posture;
  return {
    message: `${characterName} ${POSTURE_CHANGE_MESSAGES[posture]}`,
  };
}
