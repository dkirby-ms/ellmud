/**
 * Player profile provider — singleton initialized at server boot.
 *
 * Follows the same pattern as stash-provider.ts:
 * - In production with DATABASE_URL → PgPlayerProfileRepository
 * - Otherwise → InMemoryPlayerProfileRepository
 * - Tests bypass this via direct injection
 */

import type { PlayerProfileRepository } from './PlayerProfileRepository.js';
import { InMemoryPlayerProfileRepository } from './PlayerProfileRepository.js';
import { PgPlayerProfileRepository } from './PgPlayerProfileRepository.js';

let _repo: PlayerProfileRepository | null = null;
let _usePg = false;

/** Initialize the profile provider. Called once at server boot. */
export function initProfileProvider(usePg: boolean): void {
  _repo = usePg ? new PgPlayerProfileRepository() : new InMemoryPlayerProfileRepository();
  _usePg = usePg;
}

/** Get the shared profile repository. Falls back to in-memory if not initialized. */
export function getProfileRepository(): PlayerProfileRepository {
  if (!_repo) {
    _repo = new InMemoryPlayerProfileRepository();
  }
  return _repo;
}

/** Whether the profile provider is using PostgreSQL. */
export function isProfilePg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetProfileProvider(): void {
  _repo = null;
  _usePg = false;
}
