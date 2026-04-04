/**
 * Zones module — hand-crafted MUD-style room graphs with persistent state.
 *
 * Follows the same provider pattern as stash/ and player/:
 * - initZoneProvider(usePg) at server boot
 * - getZoneRepository() to access the singleton
 * - Falls back to in-memory if not initialized
 */

import type { ZoneRepository } from './ZoneRepository.js';
import { InMemoryZoneRepository } from './InMemoryZoneRepository.js';
import { PgZoneRepository } from './PgZoneRepository.js';

let _repo: ZoneRepository | null = null;
let _usePg = false;

/** Initialize the zone provider. Called once at server boot. */
export function initZoneProvider(usePg: boolean): void {
  _repo = usePg ? new PgZoneRepository() : new InMemoryZoneRepository();
  _usePg = usePg;
}

/** Get the shared zone repository. Falls back to in-memory if not initialized. */
export function getZoneRepository(): ZoneRepository {
  if (!_repo) {
    _repo = new InMemoryZoneRepository();
  }
  return _repo;
}

/** Whether the zone provider is using PostgreSQL. */
export function isZonePg(): boolean {
  return _usePg;
}

/** Reset for testing. */
export function resetZoneProvider(): void {
  _repo = null;
  _usePg = false;
}

// Re-exports
export type {
  ZoneRepository,
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
  ZoneData,
  OrphanedExitInfo,
} from './ZoneRepository.js';
export { PgZoneRepository } from './PgZoneRepository.js';
export { InMemoryZoneRepository } from './InMemoryZoneRepository.js';
export {
  FACTION_SLUGS,
  DEFAULT_HUB_SLUG,
  getStrongholdSlugForFaction,
  resolvePlayerHubSlug,
  resolvePlayerHubTarget,
  resolvePlayerHubName,
  getStrongholdForFaction,
} from './stronghold.js';
export type { FactionSlug } from './stronghold.js';
