/**
 * Redis connectivity probe tests.
 *
 * These tests verify the testRedisConnection() utility correctly reports
 * unreachable Redis instances and doesn't leave unhandled error events.
 */

import { describe, it, expect } from 'vitest';
import { testRedisConnection } from '../cache/redis-test.js';

describe('testRedisConnection', () => {
  it('returns reachable: false for an unreachable host', async () => {
    // Use a non-routable IP to simulate ETIMEDOUT (RFC 5737 TEST-NET)
    const result = await testRedisConnection('redis://192.0.2.1:6379', 500);
    expect(result.reachable).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns reachable: false for a refused connection', async () => {
    // Localhost port that almost certainly has no Redis
    const result = await testRedisConnection('redis://127.0.0.1:1', 500);
    expect(result.reachable).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('does not throw — errors are returned, not thrown', async () => {
    // Should resolve cleanly, never reject
    await expect(
      testRedisConnection('redis://127.0.0.1:1', 200),
    ).resolves.toBeDefined();
  });
});
