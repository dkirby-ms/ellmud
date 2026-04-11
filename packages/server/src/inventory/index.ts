/**
 * Inventory module — persistent player inventory (Issue #409).
 */

export type { InventoryItemEntry, PlayerInventoryRepository } from './PlayerInventoryRepository.js';
export { InMemoryPlayerInventoryRepository, inventoryToEntries } from './PlayerInventoryRepository.js';
export { PgPlayerInventoryRepository } from './PgPlayerInventoryRepository.js';
export {
  initInventoryProvider,
  getInventoryRepository,
  isInventoryPg,
  resetInventoryProvider,
} from './inventory-provider.js';
