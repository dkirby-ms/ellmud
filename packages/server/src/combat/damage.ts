/**
 * Damage model — GDD §6.4.
 *
 * Formula:
 *   modified_dmg  = raw_dmg × stance_multiplier - armour
 *   final_damage  = max(1, modified_dmg) × dodge_reduction
 *
 * Dodge grants a % chance to fully avoid an attack (based on defence stat).
 * When a PRNG roll is provided, dodge can reduce final_damage to 0.
 */

import type { CombatAction } from '@ellmud/shared';

export interface DamageResult {
  rawDamage: number;
  multiplier: number;
  armourReduction: number;
  finalDamage: number;
  /** True when a dodge roll fully avoided the attack (GDD §6.4). */
  dodged?: boolean;
}

/** Options for dodge chance calculation. */
export interface DamageOptions {
  /** Defender's defence stat (maps to AGI / evasion). */
  defenderDefence?: number;
  /** A PRNG roll in [0, 1) to determine dodge success. */
  dodgeRoll?: number;
}

/** Dodge chance per point of defence, capped at MAX_DODGE_CHANCE. */
export const DODGE_CHANCE_PER_DEFENCE = 0.05;
/** Maximum dodge chance (75%) to prevent invincibility. */
export const MAX_DODGE_CHANCE = 0.75;

/**
 * Calculate dodge chance from defence stat.
 * Formula: min(MAX_DODGE_CHANCE, defence × DODGE_CHANCE_PER_DEFENCE)
 */
export function getDodgeChance(defence: number): number {
  return Math.min(MAX_DODGE_CHANCE, defence * DODGE_CHANCE_PER_DEFENCE);
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
 * @param options         - Optional dodge roll and defence stat for dodge chance
 */
export function calculateDamage(
  attackerAttack: number,
  defenderArmour: number,
  attackerAction: CombatAction,
  defenderAction: CombatAction,
  options?: DamageOptions,
): DamageResult {
  const multiplier = getStanceMultiplier(attackerAction, defenderAction);

  if (multiplier === 0) {
    return { rawDamage: 0, multiplier: 0, armourReduction: 0, finalDamage: 0 };
  }

  const rawDamage = attackerAttack;
  const afterMultiplier = rawDamage * multiplier;
  const baseDamage = Math.max(1, Math.floor(afterMultiplier - defenderArmour));

  // GDD §6.4: Dodge grants a % chance to fully avoid an attack
  if (
    defenderAction === 'dodge' &&
    options?.defenderDefence !== undefined &&
    options?.dodgeRoll !== undefined
  ) {
    const dodgeChance = getDodgeChance(options.defenderDefence);
    if (options.dodgeRoll < dodgeChance) {
      return {
        rawDamage,
        multiplier,
        armourReduction: defenderArmour,
        finalDamage: 0,
        dodged: true,
      };
    }
  }

  return {
    rawDamage,
    multiplier,
    armourReduction: defenderArmour,
    finalDamage: baseDamage,
  };
}
