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
  type WeaponType,
  type EquipmentBonuses,
  type ItemStats,
  DEFAULT_PLAYER_STATS,
  COMBAT_TIMEOUT_TICKS,
  EMPTY_TICK_RESULT,
  createCombatant,
} from './CombatState.js';
export {
  calculateDamage,
  getDodgeChance,
  getShieldBlockChance,
  DODGE_BASE_CHANCE,
  DODGE_CHANCE_PER_RANK,
  MAX_DODGE_CHANCE,
  BLOCK_BASE_CHANCE,
  BLOCK_CHANCE_PER_RANK,
  MAX_BLOCK_CHANCE,
  type DamageResult,
  type DamageOptions,
  type DamageBreakdown,
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
export { classifyEvent, classifyCombatEvent, getEventIcon, COMBAT_ICONS } from './signal-classification.js';
export type { ClassifiedCombatEvent, SignalClass } from './signal-classification.js';
export { batchCombatEvents, narrateBatchedEvent, DEFAULT_BATCHING_RULES } from './micro-batching.js';
export type { BatchedEvent, BatchingRules } from './micro-batching.js';
export { seededPrng } from './prng.js';
export {
  calculateEquipmentBonuses,
  calculatePlayerEffectiveStats,
  calculateCreatureEffectiveStats,
  type EffectiveStats,
} from './stats.js';
