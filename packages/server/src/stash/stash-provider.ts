/**
 * Stash provider — singleton stash infrastructure initialized at server boot.
 *
 * Rooms import getStashRepository() and getItemDefs() to get shared instances.
 * In production with DATABASE_URL, returns PgStashRepository; otherwise in-memory.
 * Tests that call room.initStash(mockRepo) bypass this provider entirely.
 */

import type { StashItem } from '@ellmud/shared';
import type { StashRepository } from './StashRepository.js';
import { InMemoryStashRepository } from './StashRepository.js';
import { PgStashRepository } from './PgStashRepository.js';

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

/** Reset for testing. */
export function resetStashProvider(): void {
  _stashRepo = null;
  _itemDefs = null;
  _usePg = false;
}
