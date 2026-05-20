/**
 * Metrics provider — singleton store initialized at server boot.
 *
 * Follows the same pattern as death-penalty-provider.ts.
 * With DATABASE_URL, returns a live MetricsService; otherwise a no-op stub.
 */

import { MetricsService } from './MetricsService.js';

/** No-op metrics stub — used when there's no database. */
class NoOpMetricsService extends MetricsService {
  // Override the private record path: all public methods call void this.record()
  // which will fail with no DB. Override each public method to be silent.
  recordDeath(): void { /* no-op */ }
  recordKill(): void { /* no-op */ }
  recordLootPickup(): void { /* no-op */ }
  recordCombatStats(): void { /* no-op */ }
  recordRoomJoin(): void { /* no-op */ }
  recordRoomLeave(): void { /* no-op */ }
  recordChatMessage(): void { /* no-op */ }
  recordRoomSnapshot(): void { /* no-op */ }
}

let _service: MetricsService | null = null;

/** Initialize the metrics provider. Called once at server boot. */
export function initMetricsProvider(usePg = false): void {
  _service = usePg ? new MetricsService() : new NoOpMetricsService();
}

/** Get the shared MetricsService instance. Falls back to no-op if not initialized. */
export function getMetricsService(): MetricsService {
  if (!_service) {
    _service = new NoOpMetricsService();
  }
  return _service;
}

/** Reset for testing. */
export function resetMetricsProvider(): void {
  _service = null;
}
