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
  DODGE_CHANCE_PER_DEFENCE,
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
