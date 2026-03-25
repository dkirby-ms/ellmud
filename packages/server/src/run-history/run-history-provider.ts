/**
 * Run history provider — singleton initialized at server boot.
 *
 * Follows the same pattern as player-profile-provider.ts:
 * - In production with DATABASE_URL → PgRunHistoryRepository
 * - Otherwise → InMemoryRunHistoryRepository
 * - Tests bypass this via direct injection
 */

import type { RunHistoryRepository } from './RunHistoryRepository.js';
import { InMemoryRunHistoryRepository } from './RunHistoryRepository.js';
import { PgRunHistoryRepository } from './PgRunHistoryRepository.js';

let _repo: RunHistoryRepository | null = null;
let _usePg = false;

/** Initialize the run history provider. Called once at server boot. */
export function initRunHistoryProvider(usePg: boolean): void {
  _repo = usePg ? new PgRunHistoryRepository() : new InMemoryRunHistoryRepository();
  _usePg = usePg;
}

/** Get the shared run history repository. Falls back to in-memory if not initialized. */
export function getRunHistoryRepository(): RunHistoryRepository {
  if (!_repo) {
    _repo = new InMemoryRunHistoryRepository();
  }
  return _repo;
}

/** Whether the run history provider is using PostgreSQL. */
export function isRunHistoryPg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetRunHistoryProvider(): void {
  _repo = null;
  _usePg = false;
}
