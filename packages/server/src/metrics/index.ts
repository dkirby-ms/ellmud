/**
 * Metrics module barrel export.
 */

export { MetricsService } from './MetricsService.js';
export type {
  MetricEventType,
  DeathMetadata,
  KillMetadata,
  LootPickupMetadata,
  CombatStatsMetadata,
} from './MetricsService.js';
export {
  initMetricsProvider,
  getMetricsService,
  resetMetricsProvider,
} from './metrics-provider.js';
