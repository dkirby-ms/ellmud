/**
 * Items module barrel export.
 */

export {
  getItemDefinition,
  getAllItemDefinitions,
  getItemsByType,
  getItemsByTier,
  getItemDefinitionsMap,
} from './registry.js';

export {
  type DropTableEntry,
  type DropTable,
  type SpawnedLoot,
  type CreatureLootConfig,
  getEligibleItems,
  weightedSelect,
  spawnRoomLoot,
  generateCreatureLoot,
  rollDropCount,
  CREATURE_DROP_COUNTS,
} from './loot-drops.js';
