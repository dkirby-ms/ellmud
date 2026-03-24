/**
 * Redis connectivity probe — tests whether a Redis instance is reachable
 * before handing the connection string to libraries (like Colyseus) that
 * don't handle connection failures gracefully.
 *
 * Pattern: create a short-lived ioredis client with lazyConnect, attempt
 * a PING, then tear it down regardless of outcome. This prevents unhandled
 * `error` events from crashing the process.
 */

import { Redis } from 'ioredis';

export interface RedisProbeResult {
  reachable: boolean;
  error?: string;
}

/**
 * Probe a Redis endpoint. Returns `{ reachable: true }` if PING succeeds
 * within `timeoutMs`, otherwise `{ reachable: false, error }`.
 *
 * The probe client is fully torn down after the check — no lingering
 * connections or retry loops.
 */
export async function testRedisConnection(
  connectionString: string,
  timeoutMs = 3000,
): Promise<RedisProbeResult> {
  const client = new Redis(connectionString, {
    lazyConnect: true,
    connectTimeout: timeoutMs,
    maxRetriesPerRequest: 0,
    retryStrategy: () => null, // no retries — fail fast
  });

  // Swallow error events so they never surface as unhandled
  client.on('error', () => {});

  try {
    await client.connect();
    await client.ping();
    return { reachable: true };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      client.disconnect();
    } catch {
      // best-effort teardown
    }
  }
}
