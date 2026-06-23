import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import http from 'node:http';
import { Room, Server as ColyseusServer } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createHealthRouter } from '../health.js';
import { createNarrationCache, createPresence, NonBlockingRedisDriver } from '../cache/index.js';
import type { ServerConfig } from '../config.js';

describe('Redis non-blocking boot', () => {
  let colyseusServer: ColyseusServer | undefined;

  afterEach(async () => {
    if (colyseusServer) {
      await colyseusServer.gracefullyShutdown(false);
      colyseusServer = undefined;
    }
  });

  it('listens and serves healthy when Redis is unavailable at boot', async () => {
    const config = makeConfig();
    const startedAt = Date.now();
    const { cache, isRedis: isCacheRedis } = await createNarrationCache(config);
    const { presence, isRedis: isPresenceRedis, getStatus } = await createPresence(config);
    const driver = new NonBlockingRedisDriver(config.redis.connectionString);
    driver.start();

    const app = express();
    app.use(createHealthRouter({
      isCacheRedis,
      isPresenceRedis,
      cacheStatus: () => ('connected' in cache && cache.connected ? 'redis-connected' : 'redis-connecting'),
      presenceStatus: getStatus,
    }));
    const httpServer = http.createServer(app);
    colyseusServer = new ColyseusServer({
      transport: new WebSocketTransport({ server: httpServer }),
      presence,
      driver,
      greet: false,
    });
    colyseusServer.define('boot-test', BootTestRoom);

    await colyseusServer.listen(0);
    const elapsedMs = Date.now() - startedAt;
    const addr = httpServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json() as { status: string; redis: { cache: string; presence: string } };

    expect(elapsedMs).toBeLessThan(1500);
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.redis.cache).toMatch(/^redis-/);
    expect(body.redis.presence).toMatch(/^redis-/);
  });
});

class BootTestRoom extends Room {}

function makeConfig(): ServerConfig {
  return {
    maxPlayersPerZone: 1,
    loadSimulator: { enabled: false, targetConnections: 0 },
    matchmakerMode: 'in-process',
    matchmaker: { concurrentCreateRoomWaitTimeS: 10 },
    websocket: { pingIntervalMs: 6000, pingMaxRetries: 4 },
    redis: {
      enabled: true,
      connectionString: 'redis://127.0.0.1:1',
      cacheEnabled: true,
      driverEnabled: true,
    },
    port: 0,
    authRequired: false,
    reconnectionTimeoutS: 30,
    reconnectDeathBehavior: 'kill',
    devModeEnabled: false,
    enableProceduralGeneration: false,
    corpseTTLSeconds: 43200,
    enableLLMNarration: false,
    permadeath: { enabled: false },
  };
}
