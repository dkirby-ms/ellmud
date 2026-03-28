/**
 * Exploration provider — singleton exploration repository initialized at server boot.
 *
 * DATABASE_URL gating: PgExplorationRepository when set, InMemory otherwise.
 * Follows the same pattern as stash-provider.ts.
 */

import type { ExplorationRepository } from './ExplorationRepository.js';
import { InMemoryExplorationRepository } from './ExplorationRepository.js';
import { PgExplorationRepository } from './PgExplorationRepository.js';

let _repo: ExplorationRepository | null = null;
let _usePg = false;

/** Initialize the exploration provider. Called once at server boot. */
export function initExplorationProvider(usePg: boolean): void {
  _repo = usePg ? new PgExplorationRepository() : new InMemoryExplorationRepository();
  _usePg = usePg;
}

/** Get the shared exploration repository. Falls back to in-memory if not initialized. */
export function getExplorationRepository(): ExplorationRepository {
  if (!_repo) {
    _repo = new InMemoryExplorationRepository();
  }
  return _repo;
}

/** Whether the exploration provider is using PostgreSQL. */
export function isExplorationPg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetExplorationProvider(): void {
  _repo = null;
  _usePg = false;
}
