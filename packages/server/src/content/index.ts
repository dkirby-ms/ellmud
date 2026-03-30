/**
 * Content module — DB-driven content definitions loaded into memory.
 *
 * Singleton ContentRegistry replaces hardcoded CREATURE_TEMPLATES and
 * ITEM_REGISTRY maps. Initialized at server boot when USE_DB_CONTENT=true.
 */

export { ContentRegistry } from './ContentRegistry.js';

import { ContentRegistry } from './ContentRegistry.js';
import type { Pool } from 'pg';

let _registry: ContentRegistry | null = null;

/**
 * Initialize the content registry from the database.
 * Called once at server boot after migrations have run.
 */
export async function initContentRegistry(pool: Pool): Promise<ContentRegistry> {
  _registry = new ContentRegistry();
  await _registry.initialize(pool);

  const errors = _registry.validate();
  if (errors.length > 0) {
    console.warn(`[ContentRegistry] Validation warnings:\n  ${errors.join('\n  ')}`);
  }

  console.log(
    `[ContentRegistry] Loaded ${_registry.getAllCreatures().length} creatures, ` +
    `${_registry.getAllItems().length} items from DB.`,
  );
  return _registry;
}

/**
 * Get the singleton ContentRegistry instance.
 * Returns null if not yet initialized (DB not available).
 */
export function getContentRegistry(): ContentRegistry | null {
  return _registry;
}

/** Reset for testing. */
export function resetContentRegistry(): void {
  _registry = null;
}
