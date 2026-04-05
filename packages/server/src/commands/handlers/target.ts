/**
 * target [entity] | target next — Set or cycle auto-attack target.
 *
 * GDD §6.2: Players can switch targets at any time. Auto-attack immediately redirects.
 */

import type { CommandResult, CommandContext, CreatureRef } from '../index.js';

/** target [entity] — Set current auto-attack target. */
export function handleTarget(ctx: CommandContext): CommandResult {
  const { player, args, combatSystem, otherPlayersInRoom, creaturesInRoom } = ctx;

  if (!combatSystem || !combatSystem.isInCombat(player.sessionId)) {
    return {
      narrations: [{ text: 'You are not in combat.', type: 'system' }],
    };
  }

  // target next — cycle to next hostile
  if (args.length === 1 && args[0]?.toLowerCase() === 'next') {
    const newTargetId = combatSystem.cycleTarget(player.sessionId);
    if (!newTargetId) {
      return {
        narrations: [{ text: 'No targets available.', type: 'system' }],
      };
    }

    const targetCombatant = combatSystem.getCombatant(newTargetId);
    const displayName = targetCombatant?.name ?? newTargetId;
    return {
      narrations: [{
        text: `You target ${displayName}.`,
        type: 'combat',
      }],
    };
  }

  // target [entity] — set specific target
  if (args.length === 0) {
    return {
      narrations: [{ text: 'Target whom? Use "target <entity>" or "target next".', type: 'system' }],
    };
  }

  const targetQuery = args.join(' ').toLowerCase();
  const targetId = resolveTarget(targetQuery, otherPlayersInRoom, creaturesInRoom);

  if (!targetId) {
    return {
      narrations: [{ text: `You don't see "${args.join(' ')}" here to target.`, type: 'system' }],
    };
  }

  const success = combatSystem.setTarget(player.sessionId, targetId);
  if (!success) {
    return {
      narrations: [{ text: 'You cannot target that.', type: 'system' }],
    };
  }

  // Resolve display name
  const targetCombatant = combatSystem.getCombatant(targetId);
  const displayName = targetCombatant?.name ?? targetId;

  return {
    narrations: [{
      text: `You target ${displayName}.`,
      type: 'combat',
    }],
  };
}

/** Match a query string against available target IDs and creature names. */
function resolveTarget(
  query: string,
  playerCandidates: string[],
  creatures?: CreatureRef[],
): string | undefined {
  // Check player exact match
  const exactPlayer = playerCandidates.find((c) => c.toLowerCase() === query);
  if (exactPlayer) return exactPlayer;

  // Check creature name match (exact)
  if (creatures) {
    const exactCreature = creatures.find((c) => c.name.toLowerCase() === query);
    if (exactCreature) return exactCreature.id;
  }

  // Check creature name match (partial)
  if (creatures) {
    const partialCreature = creatures.find((c) => c.name.toLowerCase().includes(query));
    if (partialCreature) return partialCreature.id;
  }

  // Check player partial match
  const partialPlayer = playerCandidates.find((c) => c.toLowerCase().includes(query));
  if (partialPlayer) return partialPlayer;

  return undefined;
}
