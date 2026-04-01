/**
 * Run history module — persistent zone run records (GDD §7.4).
 */

export type { RunRecord, RunHistoryRepository } from './RunHistoryRepository.js';
export { InMemoryRunHistoryRepository } from './RunHistoryRepository.js';
export { PgRunHistoryRepository } from './PgRunHistoryRepository.js';
export {
  initRunHistoryProvider,
  getRunHistoryRepository,
  isRunHistoryPg,
  resetRunHistoryProvider,
} from './run-history-provider.js';
