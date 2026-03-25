/**
 * Loadout provider — singleton loadout infrastructure initialized at server boot.
 *
 * Rooms import getLoadoutRepository() to get the shared instance.
 * In production with DATABASE_URL, returns PgLoadoutRepository (future);
 * otherwise in-memory.
 * Tests that call room.initLoadout(mockRepo) bypass this provider entirely.
 */

import type { LoadoutRepository } from './LoadoutRepository.js';
import { InMemoryLoadoutRepository } from './LoadoutRepository.js';

let _loadoutRepo: LoadoutRepository | null = null;

/**
 * Initialize the loadout provider. Called once at server boot.
 * Must be called before any room creates a LoadoutService.
 */
export function initLoadoutProvider(_usePg = false): void {
  // Phase 1: always in-memory. Phase 2+: check _usePg for PgLoadoutRepository.
  _loadoutRepo = new InMemoryLoadoutRepository();
}

/** Get the shared loadout repository. Falls back to in-memory if not initialized. */
export function getLoadoutRepository(): LoadoutRepository {
  if (!_loadoutRepo) {
    _loadoutRepo = new InMemoryLoadoutRepository();
  }
  return _loadoutRepo;
}

/** Reset for testing. */
export function resetLoadoutProvider(): void {
  _loadoutRepo = null;
}
