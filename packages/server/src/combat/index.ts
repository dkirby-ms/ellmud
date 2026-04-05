/**
 * Combat module barrel export.
 */

export { CombatSystem, type ExitResolver, type RollFn } from './CombatSystem.js';
export {
  type Combatant,
  type CombatStats,
  type CombatEncounter,
  type CombatEvent,
  type FleeResult,
  type TickResult,
  type QueuedAction,
  DEFAULT_PLAYER_STATS,
  COMBAT_TIMEOUT_TICKS,
  EMPTY_TICK_RESULT,
  createCombatant,
} from './CombatState.js';
export {
  calculateDamage,
  getDodgeChance,
  DODGE_BASE_CHANCE,
  DODGE_CHANCE_PER_AGI,
  DODGE_CHANCE_PER_SKILL_RANK,
  MAX_DODGE_CHANCE,
  type DamageResult,
  type DamageOptions,
} from './damage.js';
export {
  resolveStrike,
  resolveDodge,
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from './actions.js';
export {
  type AbilityDefinition,
  type AbilityEffect,
  type AbilityType,
  type AbilitySlots,
  getAbilityDefinition,
  DEFAULT_ABILITIES,
  HEAVY_STRIKE,
  BLOCK,
  OBSERVE,
} from './abilities.js';
