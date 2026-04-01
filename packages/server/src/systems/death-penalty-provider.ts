/**
 * Death penalty provider — singleton store initialized at server boot.
 *
 * Rooms import getDeathPenaltyStore() to get the shared instance.
 * With DATABASE_URL, returns PgDeathPenaltyStore; otherwise in-memory.
 */

import type { DeathPenaltyStore } from './DeathPenalty.js';
import { InMemoryDeathPenaltyStore } from './DeathPenalty.js';
import { PgDeathPenaltyStore } from './PgDeathPenaltyStore.js';

let _store: DeathPenaltyStore | null = null;

/** Initialize the death penalty provider. Called once at server boot. */
export function initDeathPenaltyProvider(usePg = false): void {
  _store = usePg ? new PgDeathPenaltyStore() : new InMemoryDeathPenaltyStore();
}

/** Get the shared death penalty store. Falls back to in-memory if not initialized. */
export function getDeathPenaltyStore(): DeathPenaltyStore {
  if (!_store) {
    _store = new InMemoryDeathPenaltyStore();
  }
  return _store;
}

/** Reset for testing. */
export function resetDeathPenaltyProvider(): void {
  _store = null;
}
