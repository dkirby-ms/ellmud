/**
 * Stash provider — singleton stash infrastructure initialized at server boot.
 *
 * Rooms import getStashRepository() and getItemDefs() to get shared instances.
 * In production with DATABASE_URL, returns PgStashRepository; otherwise in-memory.
 * Tests that call room.initStash(mockRepo) bypass this provider entirely.
 */

import type { StashItem, StashItemType, GearTier } from '@ellmud/shared';
import type { StashRepository } from './StashRepository.js';
import { InMemoryStashRepository } from './StashRepository.js';
import { PgStashRepository } from './PgStashRepository.js';
import { query } from '../db/index.js';

let _stashRepo: StashRepository | null = null;
let _itemDefs: Map<string, StashItem> | null = null;
let _usePg = false;

/**
 * Initialize the stash provider. Called once at server boot.
 * Must be called before any room creates a StashService.
 */
export function initStashProvider(usePg: boolean): void {
  _stashRepo = usePg ? new PgStashRepository() : new InMemoryStashRepository();
  _itemDefs = new Map();
  _usePg = usePg;
}

/** Get the shared stash repository. Falls back to in-memory if not initialized. */
export function getStashRepository(): StashRepository {
  if (!_stashRepo) {
    _stashRepo = new InMemoryStashRepository();
    _itemDefs = new Map();
  }
  return _stashRepo;
}

/** Get the shared item definitions map. */
export function getItemDefs(): Map<string, StashItem> {
  if (!_itemDefs) {
    _itemDefs = new Map();
  }
  return _itemDefs;
}

/** Whether the stash provider is using PostgreSQL. */
export function isStashPg(): boolean {
  return _usePg;
}

/**
 * Load all item definitions from the item_definitions table into the
 * in-memory itemDefs map. Call once at server boot when using PostgreSQL.
 */
export async function loadItemDefsFromDb(): Promise<number> {
  if (!_usePg) return 0;
  const defs = getItemDefs();
  const result = await query<{
    id: string;
    name: string;
    type: string;
    tier: string | null;
    stats: { weight?: number; baseDurability?: number | null };
    description: string | null;
  }>(`SELECT id, name, type, tier, stats, description FROM item_definitions`);

  for (const row of result.rows) {
    defs.set(row.id, {
      id: row.id,
      name: row.name,
      type: row.type as StashItemType,
      weight: row.stats?.weight ?? 1,
      rarity: (row.tier ?? 'common') as GearTier,
      description: row.description ?? '',
      baseDurability: row.stats?.baseDurability ?? null,
    });
  }
  return result.rows.length;
}

/** Reset for testing. */
export function resetStashProvider(): void {
  _stashRepo = null;
  _itemDefs = null;
  _usePg = false;
}
