/**
 * Faction provider — singleton initialized at server boot.
 *
 * Follows the same pattern as player-profile-provider.ts:
 * - In production with DATABASE_URL → PgFactionRepository
 * - Otherwise → InMemoryFactionRepository
 * - Tests bypass this via direct injection
 */

import type { FactionRepository } from './FactionRepository.js';
import { InMemoryFactionRepository } from './FactionRepository.js';
import { PgFactionRepository } from './PgFactionRepository.js';

let _repo: FactionRepository | null = null;
let _usePg = false;

/** Initialize the faction provider. Called once at server boot. */
export function initFactionProvider(usePg: boolean): void {
  _repo = usePg ? new PgFactionRepository() : new InMemoryFactionRepository();
  _usePg = usePg;
}

/** Get the shared faction repository. Falls back to in-memory if not initialized. */
export function getFactionRepository(): FactionRepository {
  if (!_repo) {
    _repo = new InMemoryFactionRepository();
  }
  return _repo;
}

/** Whether the faction provider is using PostgreSQL. */
export function isFactionPg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetFactionProvider(): void {
  _repo = null;
  _usePg = false;
}
