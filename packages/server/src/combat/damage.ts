/**
 * Damage model — GDD §6.4.
 *
 * Formula:
 *   modified_dmg  = raw_dmg × stance_multiplier - armour
 *   final_damage  = max(1, modified_dmg) × flanking_bonus
 *
 * Resolution order per attack:
 *   1. Dodge roll — full avoidance (0 damage) based on dodge skill
 *   2. Shield block roll — binary block (0 damage) based on shieldBlock skill
 *   3. Damage calculation with armour reduction
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
  /** True when a dodge roll fully avoided the attack. */
  dodged?: boolean;
  /** True when a shield block nullified the attack. */
  blocked?: boolean;
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
  /** Whether the attack was blocked by a shield. */
  blocked: boolean;
  /** Calculated dodge probability before the roll (0 if dodge not applicable). */
  dodgeChance: number;
  /** Calculated shield block probability before the roll. */
  blockChance: number;
  /** Reserved for future crit system. */
  criticalHit?: boolean;
}

/** Options for damage calculation. */
export interface DamageOptions {
  /** Defender's dodge skill stat. */
  defenderDodge?: number;
  /** Defender's shield block skill stat. */
  defenderShieldBlock?: number;
  /** A PRNG roll in [0, 1) to determine dodge success. */
  dodgeRoll?: number;
  /** A PRNG roll in [0, 1) to determine shield block success. */
  blockRoll?: number;
  /** Damage multiplier for abilities (e.g., 1.5 for Heavy Strike) (GDD §6.3). */
  damageMultiplier?: number;
  /** Flat damage reduction for block ability (GDD §6.3). */
  blockReduction?: number;
  /** Flanking bonus multiplier (GDD §6.11). */
  flankingBonus?: number;
}

/** Base dodge chance (20%). */
export const DODGE_BASE_CHANCE = 0.20;
/** Dodge chance bonus per dodge skill rank (3%). */
export const DODGE_CHANCE_PER_RANK = 0.03;
/** Maximum dodge chance (75%) to prevent invincibility. */
export const MAX_DODGE_CHANCE = 0.75;

/** Base shield block chance (5%). */
export const BLOCK_BASE_CHANCE = 0.05;
/** Block chance bonus per shieldBlock skill rank (3%). */
export const BLOCK_CHANCE_PER_RANK = 0.03;
/** Maximum block chance (60%). */
export const MAX_BLOCK_CHANCE = 0.60;

/**
 * Calculate dodge chance from dodge skill stat.
 * Formula: min(MAX_DODGE_CHANCE, 20% + 3% × dodge)
 */
export function getDodgeChance(dodge: number): number {
  return Math.min(
    MAX_DODGE_CHANCE,
    DODGE_BASE_CHANCE + DODGE_CHANCE_PER_RANK * dodge,
  );
}

/**
 * Calculate shield block chance from shieldBlock skill stat.
 * Formula: min(MAX_BLOCK_CHANCE, 5% + 3% × shieldBlock)
 */
export function getShieldBlockChance(shieldBlock: number): number {
  return Math.min(
    MAX_BLOCK_CHANCE,
    BLOCK_BASE_CHANCE + BLOCK_CHANCE_PER_RANK * shieldBlock,
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
    case 'block':  return 1.0;   // block uses flat reduction, not multiplier
    case 'flee':   return 1.0;   // fleeing provides no defence
    default:       return 1.0;
  }
}

/**
 * Calculate damage from one combatant to another for a single tick.
 *
 * Resolution order: dodge → shield block → damage (armour reduction).
 *
 * @param attackerAttack  - Attacker's effective attack stat
 * @param defenderArmour  - Defender's armour value
 * @param attackerAction  - What the attacker chose this tick
 * @param defenderAction  - What the defender chose this tick
 * @param options         - Optional dodge/block rolls, damage multiplier, etc.
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
      blocked: false,
      dodgeChance: 0,
      blockChance: 0,
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

  // Step 1: Passive dodge roll
  let dodgeChance = 0;
  if (options?.defenderDodge !== undefined) {
    dodgeChance = getDodgeChance(options.defenderDodge);
  }
  if (
    options?.defenderDodge !== undefined &&
    options?.dodgeRoll !== undefined
  ) {
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
        blocked: false,
        dodgeChance,
        blockChance: 0,
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

  // Step 2: Shield block roll (binary — nullifies attack on success)
  let blockChance = 0;
  if (options?.defenderShieldBlock !== undefined && options.defenderShieldBlock > 0) {
    blockChance = getShieldBlockChance(options.defenderShieldBlock);
  }
  if (
    options?.defenderShieldBlock !== undefined &&
    options.defenderShieldBlock > 0 &&
    options?.blockRoll !== undefined
  ) {
    if (options.blockRoll < blockChance) {
      const blockedBreakdown: DamageBreakdown = {
        rawDamage: attackerAttack,
        abilityMultiplier,
        stanceMultiplier: multiplier,
        afterStance: afterMultiplier,
        armourReduction: defenderArmour,
        blockReduction,
        flankingBonus,
        finalDamage: 0,
        dodged: false,
        blocked: true,
        dodgeChance,
        blockChance,
      };
      return {
        rawDamage,
        multiplier,
        armourReduction: defenderArmour,
        finalDamage: 0,
        blocked: true,
        breakdown: blockedBreakdown,
      };
    }
  }

  // Step 3: Normal damage with armour reduction
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
    blocked: false,
    dodgeChance,
    blockChance,
  };

  return {
    rawDamage,
    multiplier,
    armourReduction: totalReduction,
    finalDamage: damageWithFlanking,
    breakdown,
  };
}
