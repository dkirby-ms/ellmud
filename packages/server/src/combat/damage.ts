/**
 * Damage model — GDD §6.4.
 *
 * Formula: raw_dmg × stance_multiplier - armour
 * Minimum 1 damage on any hit.
 * Phase 1: fully deterministic (no randomness).
 */

import type { CombatAction } from '@ellmud/shared';

export interface DamageResult {
  rawDamage: number;
  multiplier: number;
  armourReduction: number;
  finalDamage: number;
}

/**
 * Stance multiplier matrix.
 * Only strikes deal damage; the multiplier scales based on what the defender is doing.
 */
function getStanceMultiplier(attackerAction: CombatAction, defenderAction: CombatAction): number {
  if (attackerAction !== 'strike') return 0;

  switch (defenderAction) {
    case 'strike': return 1.0;   // both aggressive — full damage
    case 'dodge':  return 0.5;   // dodging halves incoming damage
    case 'flee':   return 1.0;   // fleeing provides no defence
    default:       return 1.0;
  }
}

/**
 * Calculate damage from one combatant to another for a single tick.
 *
 * @param attackerAttack  - Attacker's base attack stat
 * @param defenderArmour  - Defender's armour value
 * @param attackerAction  - What the attacker chose this tick
 * @param defenderAction  - What the defender chose this tick
 */
export function calculateDamage(
  attackerAttack: number,
  defenderArmour: number,
  attackerAction: CombatAction,
  defenderAction: CombatAction,
): DamageResult {
  const multiplier = getStanceMultiplier(attackerAction, defenderAction);

  if (multiplier === 0) {
    return { rawDamage: 0, multiplier: 0, armourReduction: 0, finalDamage: 0 };
  }

  const rawDamage = attackerAttack;
  const afterMultiplier = rawDamage * multiplier;
  const finalDamage = Math.max(1, Math.floor(afterMultiplier - defenderArmour));

  return {
    rawDamage,
    multiplier,
    armourReduction: defenderArmour,
    finalDamage,
  };
}
