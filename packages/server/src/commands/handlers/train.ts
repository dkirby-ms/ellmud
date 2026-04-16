/**
 * train command handler — Allocate banked stat points at a training grounds (#457).
 *
 * `train <stat>` — Spend one stat point to increase a base stat.
 * `train`        — Show current base stats, available points, and soft caps.
 *
 * Pure validation functions are exported for testability.
 */

import type { CommandResult } from '../index.js';
import type { PlayerCombatStats } from '../../character/CharacterRepository.js';
import type { NarrationType } from '@ellmud/shared';

// ─── Trainable stat names ───────────────────────────────────────────────────

/** Map of player-facing stat names → PlayerCombatStats keys. */
export const TRAINABLE_STATS: Record<string, keyof PlayerCombatStats> = {
  maxhp: 'maxHp',
  hp: 'maxHp',
  unarmed: 'unarmed',
  'one-handed': 'oneHanded',
  onehanded: 'oneHanded',
  'two-handed': 'twoHanded',
  twohanded: 'twoHanded',
  ranged: 'ranged',
  shieldblock: 'shieldBlock',
  'shield-block': 'shieldBlock',
  shield: 'shieldBlock',
  dodge: 'dodge',
  armour: 'armour',
  armor: 'armour',
};

/** Display names for stats (used in output messages). */
export const STAT_DISPLAY_NAMES: Record<keyof PlayerCombatStats, string> = {
  maxHp: 'Max HP',
  unarmed: 'Unarmed',
  oneHanded: 'One-Handed',
  twoHanded: 'Two-Handed',
  ranged: 'Ranged',
  shieldBlock: 'Shield Block',
  dodge: 'Dodge',
  armour: 'Armour',
};

// ─── Soft caps (Phase 1: flat caps; Jarlaxle's zone-tier system will override) ─

/** Default soft caps per stat. Tied to zone tier unlocks in Phase 2. */
export const DEFAULT_SOFT_CAPS: Record<keyof PlayerCombatStats, number> = {
  maxHp: 200,
  unarmed: 25,
  oneHanded: 25,
  twoHanded: 25,
  ranged: 25,
  shieldBlock: 25,
  dodge: 25,
  armour: 15,
};

// ─── Pure validation functions ──────────────────────────────────────────────

export interface TrainValidation {
  valid: boolean;
  error?: string;
  statKey?: keyof PlayerCombatStats;
}

/** Resolve a player-typed stat name to a PlayerCombatStats key. */
export function resolveStatName(input: string): keyof PlayerCombatStats | undefined {
  return TRAINABLE_STATS[input.toLowerCase()];
}

/** Validate whether a training action is allowed. */
export function validateTrain(
  statInput: string,
  baseStats: PlayerCombatStats,
  statPointsAvailable: number,
  softCaps: Record<keyof PlayerCombatStats, number> = DEFAULT_SOFT_CAPS,
): TrainValidation {
  if (statPointsAvailable <= 0) {
    return { valid: false, error: 'You have no stat points available to spend.' };
  }

  const statKey = resolveStatName(statInput);
  if (!statKey) {
    const validNames = [...new Set(Object.values(TRAINABLE_STATS))].map(k => STAT_DISPLAY_NAMES[k]);
    return {
      valid: false,
      error: `Unknown stat "${statInput}". Trainable stats: ${validNames.join(', ')}.`,
    };
  }

  const currentValue = baseStats[statKey];
  const cap = softCaps[statKey];
  if (currentValue >= cap) {
    return {
      valid: false,
      error: `${STAT_DISPLAY_NAMES[statKey]} is already at the soft cap (${cap}).`,
    };
  }

  return { valid: true, statKey };
}

// ─── Display: train with no args ────────────────────────────────────────────

export function formatTrainOverview(
  baseStats: PlayerCombatStats,
  statPointsAvailable: number,
  softCaps: Record<keyof PlayerCombatStats, number> = DEFAULT_SOFT_CAPS,
): string {
  const lines: string[] = [
    '═══ Training Grounds ═══',
    '',
    `  Stat points available: ${statPointsAvailable}`,
    '',
    '  Stat            Current  /  Cap',
    '  ─────────────── ───────  ── ───',
  ];

  for (const key of Object.keys(STAT_DISPLAY_NAMES) as Array<keyof PlayerCombatStats>) {
    const display = STAT_DISPLAY_NAMES[key].padEnd(16);
    const current = String(baseStats[key]).padStart(4);
    const cap = String(softCaps[key]).padStart(4);
    const atCap = baseStats[key] >= softCaps[key] ? ' (capped)' : '';
    lines.push(`  ${display} ${current}  / ${cap}${atCap}`);
  }

  lines.push('');
  lines.push("  Usage: train <stat>  (e.g. 'train dodge')");

  return lines.join('\n');
}

// ─── Result builders (used by ZoneRoom's async handler) ─────────────────────

export function buildTrainSuccessResult(
  statKey: keyof PlayerCombatStats,
  oldValue: number,
  newValue: number,
  remainingPoints: number,
): CommandResult {
  const name = STAT_DISPLAY_NAMES[statKey];
  return {
    narrations: [{
      text: `You train hard, improving your ${name}: ${oldValue} → ${newValue}. (${remainingPoints} point${remainingPoints === 1 ? '' : 's'} remaining)`,
      type: 'system' as NarrationType,
    }],
  };
}

export function buildTrainOverviewResult(
  baseStats: PlayerCombatStats,
  statPointsAvailable: number,
): CommandResult {
  return {
    narrations: [{
      text: formatTrainOverview(baseStats, statPointsAvailable),
      type: 'info' as NarrationType,
    }],
  };
}

export function buildTrainErrorResult(message: string): CommandResult {
  return {
    narrations: [{
      text: message,
      type: 'system' as NarrationType,
    }],
  };
}
