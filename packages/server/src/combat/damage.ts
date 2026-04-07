/**
 * Damage model — GDD §6.4.
 *
 * Formula:
 *   modified_dmg  = raw_dmg × stance_multiplier - armour - block
 *   final_damage  = max(1, modified_dmg) × dodge_reduction × flanking_bonus
 *
 * Dodge grants a % chance to fully avoid an attack
 * based on AGI stat + dodge skill rank.
 * When a PRNG roll is provided, dodge can reduce final_damage to 0.
 *
 * Flanking bonus applies when attacker is at Flank position
 * and target is focused on a Front position combatant (GDD §6.11).
 */

import type { CombatAction } from '@ellmud/shared';

export interface DamageResult {
  rawDamage: number;
  multiplier: number;
  armourReduction: number;
  finalDamage: number;
  /** True when a dodge roll fully avoided the attack (GDD §6.4). */
  dodged?: boolean;
  /** Detailed damage pipeline breakdown — populated for observability (sandbox/logging). */
  breakdown?: DamageBreakdown;
}

/**
 * Detailed intermediate values from the damage pipeline.
 * Purely informational — does not affect game logic.
 * Used by sandbox log and tuning tools.
 */
export interface DamageBreakdown {
  /** Base attack stat before any multipliers. */
  rawDamage: number;
  /** Ability damage multiplier (e.g. 1.5 for Heavy Strike). */
  abilityMultiplier: number;
  /** Stance interaction multiplier (e.g. 0.5 for strike-vs-dodge). */
  stanceMultiplier: number;
  /** Damage after ability and stance multipliers applied. */
  afterStance: number;
  /** Flat damage absorbed by defender armour. */
  armourReduction: number;
  /** Flat damage absorbed by block ability. */
  blockReduction: number;
  /** Flanking multiplier (1.0 = no bonus; populated by CombatSystem). */
  flankingBonus: number;
  /** The resulting damage dealt. */
  finalDamage: number;
  /** Whether the attack was fully dodged. */
  dodged: boolean;
  /** Calculated dodge probability before the roll (0 if dodge not applicable). */
  dodgeChance: number;
  /** Reserved for future crit system. */
  criticalHit?: boolean;
}

/** Options for dodge chance calculation. */
export interface DamageOptions {
  /** Defender's agility stat (GDD §6.4). */
  defenderAgility?: number;
  /** Defender's dodge skill rank (GDD §6.4). */
  defenderDodgeSkillRank?: number;
  /** A PRNG roll in [0, 1) to determine dodge success. */
  dodgeRoll?: number;
  /** Damage multiplier for abilities (e.g., 1.5 for Heavy Strike) (GDD §6.3). */
  damageMultiplier?: number;
  /** Flat damage reduction for block ability (GDD §6.3). */
  blockReduction?: number;
  /** Flanking bonus multiplier (GDD §6.11). */
  flankingBonus?: number;
}

/** Base dodge chance (20%). */
export const DODGE_BASE_CHANCE = 0.20;
/** Dodge chance bonus per point of agility (2%). */
export const DODGE_CHANCE_PER_AGI = 0.02;
/** Dodge chance bonus per dodge skill rank (3%). */
export const DODGE_CHANCE_PER_SKILL_RANK = 0.03;
/** Maximum dodge chance (75%) to prevent invincibility. */
export const MAX_DODGE_CHANCE = 0.75;

/**
 * Calculate dodge chance from AGI stat and dodge skill rank.
 * Formula: min(MAX_DODGE_CHANCE, 20% + 2% × AGI + 3% × dodgeSkillRank)
 */
export function getDodgeChance(agility: number, dodgeSkillRank = 0): number {
  return Math.min(
    MAX_DODGE_CHANCE,
    DODGE_BASE_CHANCE + DODGE_CHANCE_PER_AGI * agility + DODGE_CHANCE_PER_SKILL_RANK * dodgeSkillRank,
  );
}

/**
 * Stance multiplier matrix.
 * Only strikes deal damage; the multiplier scales based on what the defender is doing.
 */
function getStanceMultiplier(attackerAction: CombatAction, defenderAction: CombatAction): number {
  if (attackerAction !== 'strike' && attackerAction !== 'heavy_strike') return 0;

  switch (defenderAction) {
    case 'strike': 
    case 'heavy_strike':
      return 1.0;   // both aggressive — full damage
    case 'dodge':  return 0.5;   // dodging halves incoming damage
    case 'block':  return 1.0;   // block uses flat reduction, not multiplier
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
 * @param options         - Optional dodge roll, defence stat, damage multiplier, block reduction
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
    const zeroBreakdown: DamageBreakdown = {
      rawDamage: attackerAttack,
      abilityMultiplier: 1.0,
      stanceMultiplier: 0,
      afterStance: 0,
      armourReduction: 0,
      blockReduction: 0,
      flankingBonus: 1.0,
      finalDamage: 0,
      dodged: false,
      dodgeChance: 0,
    };
    return { rawDamage: 0, multiplier: 0, armourReduction: 0, finalDamage: 0, breakdown: zeroBreakdown };
  }

  // Apply ability damage multiplier (e.g., Heavy Strike)
  const abilityMultiplier = options?.damageMultiplier ?? 1.0;
  const rawDamage = attackerAttack * abilityMultiplier;
  const afterMultiplier = rawDamage * multiplier;
  
  // Apply block damage reduction if defender is blocking
  const blockReduction = defenderAction === 'block' ? (options?.blockReduction ?? 5) : 0;
  const totalReduction = defenderArmour + blockReduction;
  
  const baseDamage = Math.max(1, afterMultiplier - totalReduction);

  // Apply flanking bonus (GDD §6.11)
  const flankingBonus = options?.flankingBonus ?? 1.0;
  const damageWithFlanking = Math.floor(baseDamage * flankingBonus);

  // GDD §6.4: Dodge grants a % chance to fully avoid an attack
  if (
    defenderAction === 'dodge' &&
    options?.defenderAgility !== undefined &&
    options?.dodgeRoll !== undefined
  ) {
    const dodgeChance = getDodgeChance(options.defenderAgility, options.defenderDodgeSkillRank);
    if (options.dodgeRoll < dodgeChance) {
      const dodgedBreakdown: DamageBreakdown = {
        rawDamage: attackerAttack,
        abilityMultiplier,
        stanceMultiplier: multiplier,
        afterStance: afterMultiplier,
        armourReduction: defenderArmour,
        blockReduction,
        flankingBonus,
        finalDamage: 0,
        dodged: true,
        dodgeChance,
      };
      return {
        rawDamage,
        multiplier,
        armourReduction: defenderArmour,
        finalDamage: 0,
        dodged: true,
        breakdown: dodgedBreakdown,
      };
    }
  }

  // Compute dodge chance even when dodge doesn't trigger (for observability)
  let dodgeChance = 0;
  if (
    defenderAction === 'dodge' &&
    options?.defenderAgility !== undefined
  ) {
    dodgeChance = getDodgeChance(options.defenderAgility, options.defenderDodgeSkillRank);
  }

  const breakdown: DamageBreakdown = {
    rawDamage: attackerAttack,
    abilityMultiplier,
    stanceMultiplier: multiplier,
    afterStance: afterMultiplier,
    armourReduction: defenderArmour,
    blockReduction,
    flankingBonus,
    finalDamage: damageWithFlanking,
    dodged: false,
    dodgeChance,
  };

  return {
    rawDamage,
    multiplier,
    armourReduction: totalReduction,
    finalDamage: damageWithFlanking,
    breakdown,
  };
}
