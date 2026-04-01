/**
 * Loadout module — player equipment management (GDD §7.3).
 */

export type { LoadoutData, LoadoutRepository } from './LoadoutRepository.js';
export { InMemoryLoadoutRepository, createEmptyLoadoutData } from './LoadoutRepository.js';
export { PgLoadoutRepository } from './PgLoadoutRepository.js';
export { LoadoutService } from './LoadoutService.js';
export type {
  EquipResult,
  UnequipResult,
  UnequipToInventoryResult,
  SwapResult,
  ZoneEntryResult,
  LoadoutView,
} from './LoadoutService.js';
export {
  initLoadoutProvider,
  getLoadoutRepository,
  resetLoadoutProvider,
} from './loadout-provider.js';
