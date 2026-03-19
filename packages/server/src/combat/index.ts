/**
 * Combat module barrel export.
 */

export { CombatSystem, type ExitResolver } from './CombatSystem.js';
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
export { calculateDamage, type DamageResult } from './damage.js';
export {
  resolveStrike,
  resolveDodge,
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from './actions.js';
