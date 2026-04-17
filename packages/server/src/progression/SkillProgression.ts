/**
 * SkillProgression — Pure functions for use-based skill XP and levelling.
 *
 * Design:
 *   - Combat actions award XP in the corresponding skill (GDD §7.1).
 *   - XP scales with zone tier to prevent farming low-tier zones.
 *   - Soft cap curve: diminishing returns past skill level thresholds
 *     tied to zone tier (tier 1 caps earlier than tier 3).
 *   - Level-up grants 1 banked stat point (not auto-applied).
 *
 * All functions are pure — no I/O, no side effects.
 */

import type { WeaponType } from '../combat/CombatState.js';
import type { ZoneTier } from '@ellmud/shared';

// ─── Skill Names ─────────────────────────────────────────────────────────────

/** Combat skill slugs that earn XP through use. */
export type CombatSkillSlug =
  | 'unarmed'
  | 'one_handed'
  | 'two_handed'
  | 'ranged'
  | 'shield_block'
  | 'dodge'
  | 'armour';

/** Maps weapon types to their corresponding skill slug. */
export const WEAPON_TYPE_TO_SKILL: Record<WeaponType, CombatSkillSlug> = {
  unarmed: 'unarmed',
  one_handed: 'one_handed',
  two_handed: 'two_handed',
  ranged: 'ranged',
};

// ─── XP Constants ────────────────────────────────────────────────────────────

/** Base XP awarded per combat action (before zone tier scaling). */
export const BASE_XP_PER_ACTION = 10;

/** XP multiplier per zone tier. Tier 1 = 1×, Tier 2 = 2×, Tier 3 = 3×. */
export const ZONE_TIER_XP_MULTIPLIER: Record<ZoneTier, number> = {
  1: 1.0,
  2: 2.0,
  3: 3.0,
};

/**
 * Soft cap thresholds per zone tier.
 * Past this skill level, XP gains from that tier are reduced.
 * E.g. tier 1 zones give full XP up to skill level 10, then diminish.
 */
export const SOFT_CAP_THRESHOLD: Record<ZoneTier, number> = {
  1: 10,
  2: 20,
  3: 30,
};

/**
 * Soft cap decay rate — how quickly XP diminishes past the threshold.
 * Formula: multiplier = 1 / (1 + DECAY_RATE × levels_past_cap)
 */
export const SOFT_CAP_DECAY_RATE = 0.25;

/** Minimum XP gain (even at extreme soft cap, never less than 1). */
export const MIN_XP_GAIN = 1;

// ─── Level Thresholds ────────────────────────────────────────────────────────

/**
 * XP required to reach the next level from the current level.
 * Quadratic curve: 50 × level² (level 1→2 = 50, level 5→6 = 1250, etc.)
 */
export function xpForNextLevel(currentLevel: number): number {
  return 50 * currentLevel * currentLevel;
}

/**
 * Total cumulative XP to reach a given level from level 1.
 * Sum of xpForNextLevel(1) + xpForNextLevel(2) + ... + xpForNextLevel(targetLevel - 1).
 */
export function cumulativeXpForLevel(targetLevel: number): number {
  let total = 0;
  for (let l = 1; l < targetLevel; l++) {
    total += xpForNextLevel(l);
  }
  return total;
}

// ─── Soft Cap ────────────────────────────────────────────────────────────────

/**
 * Calculate the soft cap multiplier for XP gains.
 *
 * @param skillLevel  Current skill level
 * @param zoneTier    Tier of the zone where XP is earned
 * @returns Multiplier in (0, 1] — 1.0 means full XP, <1.0 means diminished
 */
export function softCapMultiplier(skillLevel: number, zoneTier: ZoneTier): number {
  const threshold = SOFT_CAP_THRESHOLD[zoneTier];
  if (skillLevel <= threshold) return 1.0;

  const levelsPastCap = skillLevel - threshold;
  return 1 / (1 + SOFT_CAP_DECAY_RATE * levelsPastCap);
}

// ─── XP Calculation ──────────────────────────────────────────────────────────

/**
 * Calculate XP gained from a single combat action.
 *
 * @param skillLevel  Current level of the skill being trained
 * @param zoneTier    Tier of the current zone
 * @returns XP to award (always >= MIN_XP_GAIN)
 */
export function calculateXpGain(skillLevel: number, zoneTier: ZoneTier): number {
  const base = BASE_XP_PER_ACTION * ZONE_TIER_XP_MULTIPLIER[zoneTier];
  const softCap = softCapMultiplier(skillLevel, zoneTier);
  return Math.max(MIN_XP_GAIN, Math.floor(base * softCap));
}

// ─── Level-Up Resolution ─────────────────────────────────────────────────────

/** Result of applying XP to a skill. */
export interface XpGainResult {
  /** The skill that gained XP. */
  skill: CombatSkillSlug;
  /** XP awarded this action. */
  xpGained: number;
  /** New total XP after gain. */
  newXp: number;
  /** New skill level (may be unchanged). */
  newLevel: number;
  /** Number of level-ups from this gain (usually 0 or 1). */
  levelsGained: number;
  /** Stat points awarded from level-ups. */
  statPointsAwarded: number;
}

/**
 * Apply XP to a skill and resolve any level-ups.
 *
 * @param skill       Skill slug receiving XP
 * @param currentXp   Current XP in this skill
 * @param currentLevel Current level of this skill
 * @param zoneTier    Zone tier for scaling
 * @returns XpGainResult with new state and any stat points awarded
 */
export function applyXpGain(
  skill: CombatSkillSlug,
  currentXp: number,
  currentLevel: number,
  zoneTier: ZoneTier,
): XpGainResult {
  const xpGained = calculateXpGain(currentLevel, zoneTier);
  let newXp = currentXp + xpGained;
  let newLevel = currentLevel;
  let levelsGained = 0;

  // Resolve level-ups (loop handles edge case of multi-level jumps)
  while (newXp >= xpForNextLevel(newLevel)) {
    newXp -= xpForNextLevel(newLevel);
    newLevel++;
    levelsGained++;
  }

  return {
    skill,
    xpGained,
    newXp,
    newLevel,
    levelsGained,
    statPointsAwarded: levelsGained, // 1 stat point per level-up
  };
}

// ─── Combat Event → Skill Mapping ───────────────────────────────────────────

/** Describes a combat action that awards XP. */
export interface CombatXpEvent {
  /** Player character ID. */
  characterId: string;
  /** Player session ID (for messaging). */
  playerId: string;
  /** The skill to award XP in. */
  skill: CombatSkillSlug;
  /** Zone tier for XP scaling. */
  zoneTier: ZoneTier;
}

/**
 * Determine which skill gets XP from an attacker strike event.
 *
 * @param weaponType The weapon type the player is wielding.
 * @returns The corresponding skill slug.
 */
export function skillForWeaponType(weaponType: WeaponType): CombatSkillSlug {
  return WEAPON_TYPE_TO_SKILL[weaponType];
}
