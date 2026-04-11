/**
 * Items module barrel export.
 */

export {
  ITEM_REGISTRY,
  getItemDefinition,
  getAllItemDefinitions,
  getItemsByType,
  getItemsByTier,
  RUSTY_BLADE,
  IRON_SWORD,
  CORRODED_HALBERD,
  SHARDSTEEL_SABRE,
  VOIDFORGED_BLADE,
  TATTERED_LEATHER,
  IRON_CHAINMAIL,
  CORRODED_SHIELD,
  REINFORCED_PLATE,
  WATERLOGGED_POTION,
  HEALING_DRAUGHT,
  STAMINA_TONIC,
  REVENANT_BONE,
  SHARDSTEEL_SHARD,
  SODDEN_SCROLL,
  TARNISHED_AMULET,
  DROWNED_OFFERING,
  CRYPT_KEY_FRAGMENT,
  TATTERED_SATCHEL,
  EXPEDITION_PACK,
  APOTHECARY_POUCH,
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
