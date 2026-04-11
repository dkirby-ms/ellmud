/**
 * Item registry — DB-driven item definitions via ContentRegistry.
 *
 * All static item constants have been removed. The ContentRegistry (backed by
 * PostgreSQL) is the sole source of truth. The database MUST be initialized
 * before any lookup functions are called.
 */

import type { ItemDefinition } from '@ellmud/shared';
import { getContentRegistry } from '../content/index.js';

function requireRegistry() {
  const registry = getContentRegistry();
  if (!registry?.isInitialized()) {
    throw new Error(
      'ContentRegistry is not initialized. The database must be available before item lookups.',
    );
  }
  return registry;
}

export function getItemDefinition(id: string): ItemDefinition | undefined {
  return requireRegistry().getItem(id);
}

export function getAllItemDefinitions(): ItemDefinition[] {
  return requireRegistry().getAllItems();
}

export function getItemsByType(type: ItemDefinition['type']): ItemDefinition[] {
  return requireRegistry().getAllItems().filter(item => item.type === type);
}

export function getItemsByTier(tier: ItemDefinition['tier']): ItemDefinition[] {
  return requireRegistry().getAllItems().filter(item => item.tier === tier);
}

/**
 * Build a Map<string, ItemDefinition> from ContentRegistry.
 * Used by shared pure functions that accept a definitions map (e.g. container ops).
 */
export function getItemDefinitionsMap(): Map<string, ItemDefinition> {
  const items = requireRegistry().getAllItems();
  return new Map(items.map(item => [item.id, item]));
}
