/**
 * attack [target] — Initiate combat with a target in the same room.
 *
 * Creates combatant profiles for both attacker and target if needed,
 * starts a combat encounter, and auto-queues the attacker's first strike.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { createCombatant, DEFAULT_PLAYER_STATS } from '../../combat/CombatState.js';

export function handleAttack(ctx: CommandContext): CommandResult {
  const { player, args, combatSystem, otherPlayersInRoom } = ctx;

  if (!combatSystem) {
    return {
      narrations: [{ text: 'Combat is not available here.', type: 'system' }],
    };
  }

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Attack whom? Specify a target.', type: 'system' }],
    };
  }

  const targetQuery = args.join(' ').toLowerCase();

  // If already in combat, re-target the strike
  if (combatSystem.isInCombat(player.sessionId)) {
    const targetId = resolveTarget(targetQuery, otherPlayersInRoom);
    if (!targetId) {
      return {
        narrations: [{ text: `You don't see "${args.join(' ')}" here to attack.`, type: 'system' }],
      };
    }
    combatSystem.submitAction(player.sessionId, 'strike', targetId);
    return {
      narrations: [{ text: `You shift your attack to ${targetId}.`, type: 'combat' }],
    };
  }

  // Find target in room
  const targetId = resolveTarget(targetQuery, otherPlayersInRoom);
  if (!targetId) {
    return {
      narrations: [{ text: `You don't see "${args.join(' ')}" here to attack.`, type: 'system' }],
    };
  }

  // Register combatants if not already registered
  if (!combatSystem.getCombatant(player.sessionId)) {
    combatSystem.registerCombatant(
      createCombatant(player.sessionId, player.sessionId, player.currentRoomId, true),
    );
  }
  if (!combatSystem.getCombatant(targetId)) {
    combatSystem.registerCombatant(
      createCombatant(targetId, targetId, player.currentRoomId, true),
    );
  }

  const encId = combatSystem.initiateCombat(player.sessionId, targetId);
  if (!encId) {
    return {
      narrations: [{ text: 'You cannot attack that target.', type: 'system' }],
    };
  }

  return {
    narrations: [{
      text: `You lunge at ${targetId} — combat begins!`,
      type: 'combat',
    }],
  };
}

/** Match a query string against available target IDs (partial match). */
function resolveTarget(query: string, candidates: string[]): string | undefined {
  // Exact match first
  const exact = candidates.find((c) => c.toLowerCase() === query);
  if (exact) return exact;

  // Partial match
  return candidates.find((c) => c.toLowerCase().includes(query));
}
