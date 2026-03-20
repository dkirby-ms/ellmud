/**
 * Stash module — persistent player inventory (GDD §7.3).
 */

export type { StashEntry, StashRepository } from './StashRepository.js';
export { InMemoryStashRepository, DEFAULT_STASH_CAPACITY } from './StashRepository.js';
export { PgStashRepository } from './PgStashRepository.js';
export { StashService } from './StashService.js';
export type { StashView, StashViewEntry, StoreResult, TakeResult } from './StashService.js';
