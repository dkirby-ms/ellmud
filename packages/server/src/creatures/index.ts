/**
 * Creatures module barrel export.
 */

export { CreatureManager } from './CreatureManager.js';

export type {
  Creature,
  CreatureType,
  CreatureTemplate,
  CreatureAction,
  CreatureActionType,
  BehaviorState,
  LootEntry,
  SpawnRules,
} from './types.js';

export { updateCreature, type CreatureWorldState } from './behavior.js';
export { generateLoot, type LootItem } from './loot.js';
export { DROWNED_REVENANT } from './templates/drowned-revenant.js';
