/**
 * attack [target] — Initiate combat with a target in the same room.
 *
 * Creates combatant profiles for both attacker and target if needed,
 * starts a combat encounter, and auto-queues the attacker's first strike.
 * Supports targeting both players and creatures.
 */

import type { CommandResult, CommandContext, CreatureRef } from '../index.js';
import { createCombatant } from '../../combat/CombatState.js';

export function handleAttack(ctx: CommandContext): CommandResult {
  const { player, args, combatSystem, otherPlayersInRoom, creaturesInRoom, characterName } = ctx;

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
    const targetId = resolveTarget(targetQuery, otherPlayersInRoom, creaturesInRoom);
    if (!targetId) {
      return {
        narrations: [{ text: `You don't see "${args.join(' ')}" here to attack.`, type: 'system' }],
      };
    }
    // Set current target and queue strike (GDD §6.2: auto-attack immediately redirects)
    combatSystem.setTarget(player.sessionId, targetId);
    combatSystem.submitAction(player.sessionId, 'strike', targetId);
    return {
      narrations: [{ text: `You shift your attack to ${targetId}.`, type: 'combat' }],
    };
  }

  // Find target in room (players or creatures)
  const targetId = resolveTarget(targetQuery, otherPlayersInRoom, creaturesInRoom);
  if (!targetId) {
    return {
      narrations: [{ text: `You don't see "${args.join(' ')}" here to attack.`, type: 'system' }],
    };
  }

  // Register combatants if not already registered
  const playerDisplayName = characterName ?? player.sessionId;
  if (!combatSystem.getCombatant(player.sessionId)) {
    const eff = ctx.playerEffectiveStats;
    const playerOpts = eff
      ? { attack: eff.attack, maxHp: eff.maxHp, armour: eff.armour, dodge: eff.dodge, shieldBlock: eff.shieldBlock }
      : undefined;
    combatSystem.registerCombatant(
      createCombatant(player.sessionId, playerDisplayName, player.currentRoomId, true, playerOpts),
    );
  }
  if (!combatSystem.getCombatant(targetId)) {
    // Register creature with real stats from the CreatureRef if available.
    const creature = creaturesInRoom?.find(c => c.id === targetId);
    const targetDisplayName = creature?.name ?? targetId;
    const stats = creature?.maxHp != null
      ? {
          maxHp: creature.maxHp,
          attack: creature.attack ?? 1,
          armour: creature.armour ?? 0,
          dodge: creature.dodge ?? 0,
          shieldBlock: creature.shieldBlock ?? 0,
        }
      : undefined;
    combatSystem.registerCombatant(
      createCombatant(targetId, targetDisplayName, player.currentRoomId, !isCreatureId(targetId), stats),
    );
  }

  const encId = combatSystem.initiateCombat(player.sessionId, targetId);
  if (!encId) {
    return {
      narrations: [{ text: 'You cannot attack that target.', type: 'system' }],
    };
  }

  // Resolve display name for creature targets
  const displayName = creaturesInRoom?.find(c => c.id === targetId)?.name ?? targetId;

  return {
    narrations: [{
      text: `You lunge at ${displayName} — combat begins!`,
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

function isCreatureId(id: string): boolean {
  return id.startsWith('creature-');
}
