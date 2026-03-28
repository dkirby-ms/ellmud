/**
 * Exploration module — per-character room visit tracking.
 */

export type {
  ExplorationVisit,
  ExploredRoom,
  ExplorationStats,
  ExplorationRepository,
} from './ExplorationRepository.js';
export { InMemoryExplorationRepository } from './ExplorationRepository.js';
export { PgExplorationRepository } from './PgExplorationRepository.js';
export {
  initExplorationProvider,
  getExplorationRepository,
  isExplorationPg,
  resetExplorationProvider,
} from './exploration-provider.js';
