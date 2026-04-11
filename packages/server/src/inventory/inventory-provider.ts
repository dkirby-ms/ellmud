/**
 * Inventory provider — singleton inventory infrastructure initialized at server boot.
 *
 * Rooms import getInventoryRepository() to get the shared instance.
 * In production with DATABASE_URL, returns PgPlayerInventoryRepository; otherwise in-memory.
 *
 * Issue #409 — Container System Phase 1.
 */

import type { PlayerInventoryRepository } from './PlayerInventoryRepository.js';
import { InMemoryPlayerInventoryRepository } from './PlayerInventoryRepository.js';
import { PgPlayerInventoryRepository } from './PgPlayerInventoryRepository.js';

let _repo: PlayerInventoryRepository | null = null;
let _usePg = false;

/**
 * Initialize the inventory provider. Called once at server boot.
 * Must be called before any room uses the inventory repository.
 */
export function initInventoryProvider(usePg: boolean): void {
  _repo = usePg ? new PgPlayerInventoryRepository() : new InMemoryPlayerInventoryRepository();
  _usePg = usePg;
}

/** Get the shared inventory repository. Falls back to in-memory if not initialized. */
export function getInventoryRepository(): PlayerInventoryRepository {
  if (!_repo) {
    _repo = new InMemoryPlayerInventoryRepository();
  }
  return _repo;
}

/** Whether the inventory provider is using PostgreSQL. */
export function isInventoryPg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetInventoryProvider(): void {
  _repo = null;
  _usePg = false;
}
