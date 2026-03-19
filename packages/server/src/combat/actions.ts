/**
 * Combat action resolution — per-action logic for Strike, Dodge, Flee.
 *
 * Each resolver produces narration hints. The CombatSystem orchestrates
 * the tick by calling these after damage has been calculated.
 */

import type { Combatant, CombatEvent } from './CombatState.js';
import type { DamageResult } from './damage.js';

/** Build a strike narration event. */
export function resolveStrike(
  attacker: Combatant,
  defender: Combatant,
  damageResult: DamageResult,
  defenderNewHp: number,
): CombatEvent {
  const defeated = defenderNewHp <= 0;
  const narration = defeated
    ? `${attacker.name} strikes ${defender.name} for ${damageResult.finalDamage} damage — ${defender.name} is defeated!`
    : `${attacker.name} strikes ${defender.name} for ${damageResult.finalDamage} damage. [${defenderNewHp}/${defender.maxHp} HP]`;

  return {
    type: 'strike',
    actorId: attacker.id,
    actorName: attacker.name,
    targetId: defender.id,
    targetName: defender.name,
    damage: damageResult.finalDamage,
    newHp: defenderNewHp,
    maxHp: defender.maxHp,
    narration,
  };
}

/** Build a dodge narration event. */
export function resolveDodge(combatant: Combatant): CombatEvent {
  return {
    type: 'dodge',
    actorId: combatant.id,
    actorName: combatant.name,
    narration: `${combatant.name} takes a defensive stance.`,
  };
}

/** Build a flee narration event. */
export function resolveFlee(combatant: Combatant, success: boolean, toRoomId?: string): CombatEvent {
  const narration = success
    ? `${combatant.name} flees from combat!`
    : `${combatant.name} tries to flee but there is no escape!`;

  return {
    type: 'flee',
    actorId: combatant.id,
    actorName: combatant.name,
    narration,
  };
}

/** Build a defeated narration event. */
export function resolveDefeated(combatant: Combatant): CombatEvent {
  return {
    type: 'defeated',
    actorId: combatant.id,
    actorName: combatant.name,
    newHp: 0,
    maxHp: combatant.maxHp,
    narration: `${combatant.name} collapses, defeated.`,
  };
}

/** Build a combat-end narration event. */
export function resolveCombatEnd(reason: 'timeout' | 'last_standing' | 'all_fled'): CombatEvent {
  const narrationMap: Record<string, string> = {
    timeout: 'The tension fades. Combat has ended.',
    last_standing: 'No opponents remain. Combat has ended.',
    all_fled: 'All combatants have fled. The fight is over.',
  };

  return {
    type: 'combat_end',
    actorId: '',
    actorName: '',
    narration: narrationMap[reason] ?? 'Combat has ended.',
  };
}
