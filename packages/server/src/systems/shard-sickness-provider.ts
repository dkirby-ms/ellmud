/**
 * Shard-sickness provider — singleton store initialized at server boot.
 *
 * Rooms import getShardSicknessStore() to get the shared instance.
 * With DATABASE_URL, returns PgShardSicknessStore; otherwise in-memory.
 */

import type { ShardSicknessStore } from './ShardSickness.js';
import { InMemoryShardSicknessStore } from './ShardSickness.js';
import { PgShardSicknessStore } from './PgShardSicknessStore.js';

let _store: ShardSicknessStore | null = null;

/** Initialize the shard-sickness provider. Called once at server boot. */
export function initShardSicknessProvider(usePg = false): void {
  _store = usePg ? new PgShardSicknessStore() : new InMemoryShardSicknessStore();
}

/** Get the shared shard-sickness store. Falls back to in-memory if not initialized. */
export function getShardSicknessStore(): ShardSicknessStore {
  if (!_store) {
    _store = new InMemoryShardSicknessStore();
  }
  return _store;
}

/** Reset for testing. */
export function resetShardSicknessProvider(): void {
  _store = null;
}
