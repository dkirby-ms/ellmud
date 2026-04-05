/**
 * Combat narration signal classification (GDD §6.6).
 * 
 * Classifies combat events into categories for visual treatment
 * and temporal batching on the client.
 */

import type { CombatEvent } from './CombatState.js';

export type SignalClass =
  | 'player_action'
  | 'enemy_action'
  | 'environmental'
  | 'status_effect'
  | 'system';

export interface ClassifiedCombatEvent extends CombatEvent {
  signalClass: SignalClass;
  icon?: string;
}

/**
 * Inline iconography for combat events (GDD §6.6).
 * Icons prefix narration lines for quick visual scanning.
 */
export const COMBAT_ICONS = {
  melee_attack: '🗡️',
  ranged_attack: '🏹',
  block: '🛡️',
  critical: '💥',
  poison: '🧪',
  dodge: '💨',
  flee: '🏃',
  defeat: '💀',
} as const;

/**
 * Determine the signal class for a combat event based on actor type and event type.
 * 
 * @param event - Combat event to classify
 * @param isPlayerActor - Whether the actor is a player
 * @param isPlayerTarget - Whether the target (if any) is a player
 * @returns Signal class for the event
 */
export function classifyCombatEvent(
  event: CombatEvent,
  isPlayerActor: boolean,
  _isPlayerTarget: boolean,
): SignalClass {
  // System events: combat_end
  if (event.type === 'combat_end') {
    return 'system';
  }

  // Defeated events: check who was defeated
  if (event.type === 'defeated') {
    // The actor is the one who was defeated
    return isPlayerActor ? 'player_action' : 'enemy_action';
  }

  // Flee events: actor is the one fleeing
  if (event.type === 'flee') {
    return isPlayerActor ? 'player_action' : 'enemy_action';
  }

  // Dodge events: actor dodged
  if (event.type === 'dodge') {
    return isPlayerActor ? 'player_action' : 'enemy_action';
  }

  // Strike events: actor is the attacker
  if (event.type === 'strike') {
    return isPlayerActor ? 'player_action' : 'enemy_action';
  }

  // Default to system
  return 'system';
}

/**
 * Determine the appropriate icon for a combat event.
 * 
 * @param event - Combat event to iconify
 * @returns Icon string or undefined
 */
export function getEventIcon(event: CombatEvent): string | undefined {
  switch (event.type) {
    case 'strike':
      // Future: distinguish ranged vs melee, critical hits
      return COMBAT_ICONS.melee_attack;
    case 'dodge':
      return event.dodged ? COMBAT_ICONS.dodge : undefined;
    case 'flee':
      return COMBAT_ICONS.flee;
    case 'defeated':
      return COMBAT_ICONS.defeat;
    case 'combat_end':
      return undefined; // No icon for combat end
    default:
      return undefined;
  }
}

/**
 * Attach signal class and icon to a combat event.
 * 
 * @param event - Combat event to classify
 * @param isPlayerActor - Whether the actor is a player
 * @param isPlayerTarget - Whether the target is a player
 * @returns Classified event with signal class and icon
 */
export function classifyEvent(
  event: CombatEvent,
  isPlayerActor: boolean,
  isPlayerTarget: boolean,
): ClassifiedCombatEvent {
  const signalClass = classifyCombatEvent(event, isPlayerActor, isPlayerTarget);
  const icon = getEventIcon(event);
  
  return {
    ...event,
    signalClass,
    icon,
  };
}
