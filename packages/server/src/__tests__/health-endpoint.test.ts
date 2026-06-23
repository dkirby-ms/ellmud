/**
 * Health Endpoint Tests
 *
 * Covers: GET /health returns 200 with status, uptime, timestamp, and Redis status.
 */

import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import { createHealthRouter } from '../health.js';
import type { Server } from 'node:http';

describe('Health Endpoint', () => {
  let server: Server;

  afterEach(() => {
    if (server) server.close();
  });

  async function createApp(deps?: {
    isCacheRedis?: boolean;
    isPresenceRedis?: boolean;
    cacheStatus?: () => string;
    presenceStatus?: () => string;
  }): Promise<{ port: number; app: express.Express }> {
    const app = express();
    app.use(createHealthRouter(deps));
    server = app.listen(0);
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    return { port, app };
  }

  it('GET /health returns 200 with status ok', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);

    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('ok');
  });

  it('response includes uptime as a number', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThan(0);
  });

  it('response includes timestamp as a number', async () => {
    const { port } = await createApp();
    const before = Date.now();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as Record<string, unknown>;
    const after = Date.now();

    expect(typeof body.timestamp).toBe('number');
    expect(body.timestamp).toBeGreaterThanOrEqual(before);
    expect(body.timestamp).toBeLessThanOrEqual(after);
  });

  it('returns JSON content type', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('reports in-memory cache and local presence by default', async () => {
    const { port } = await createApp();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { redis: { cache: string; presence: string } };

    expect(body.redis.cache).toBe('in-memory');
    expect(body.redis.presence).toBe('local');
  });

  it('reports Redis cache when isCacheRedis is true', async () => {
    const { port } = await createApp({ isCacheRedis: true });
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { redis: { cache: string; presence: string } };

    expect(body.redis.cache).toBe('redis');
    expect(body.redis.presence).toBe('local');
  });

  it('reports Redis presence when isPresenceRedis is true', async () => {
    const { port } = await createApp({ isPresenceRedis: true });
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { redis: { cache: string; presence: string } };

    expect(body.redis.cache).toBe('in-memory');
    expect(body.redis.presence).toBe('redis');
  });

  it('reports both Redis when both are true', async () => {
    const { port } = await createApp({ isCacheRedis: true, isPresenceRedis: true });
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { redis: { cache: string; presence: string } };

    expect(body.redis.cache).toBe('redis');
    expect(body.redis.presence).toBe('redis');
  });

  it('reports dynamic Redis status without affecting health status', async () => {
    const { port } = await createApp({
      cacheStatus: () => 'redis-connecting',
      presenceStatus: () => 'redis-reconnecting',
    });
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { status: string; redis: { cache: string; presence: string } };

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.redis.cache).toBe('redis-connecting');
    expect(body.redis.presence).toBe('redis-reconnecting');
  });
});
