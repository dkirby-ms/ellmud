/**
 * Faction module — persistent faction membership (GDD §10).
 */

export type { FactionRepository } from './FactionRepository.js';
export { InMemoryFactionRepository } from './FactionRepository.js';
export { PgFactionRepository } from './PgFactionRepository.js';
export {
  initFactionProvider,
  getFactionRepository,
  isFactionPg,
  resetFactionProvider,
} from './faction-provider.js';
