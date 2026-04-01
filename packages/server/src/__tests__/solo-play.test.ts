import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { bootTestServer, connectTestClient, wait } from './helpers/index.js';
import { resetConfig } from '../config.js';

describe('Solo Play — Player Limit Enforcement', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  beforeEach(() => {
    // Force solo-play config (MAX_PLAYERS_PER_ZONE=1)
    process.env['MAX_PLAYERS_PER_ZONE'] = '1';
    resetConfig();
  });

  afterEach(() => {
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    resetConfig();
  });

  it('should allow the first player to join a zone', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'zone');

    // First player should receive welcome narration
    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.narrate[0]!.text).toContain('rift');

    await client.leave();
  });

  it('should reject the second player from a solo zone (maxPlayersPerZone=1)', async () => {
    const room = await colyseus.createRoom('zone', {});
    const client1 = await colyseus.connectTo(room);
    await wait(500);

    // Player 2 should be rejected
    let joinError: Error | null = null;
    try {
      await colyseus.connectTo(room);
      await wait(500);
    } catch (err) {
      joinError = err as Error;
    }

    expect(joinError).not.toBeNull();
    // Colyseus auto-locks rooms at maxClients, so rejection may say "locked" or "full"
    expect(joinError!.message).toMatch(/full|locked/i);

    await client1.leave();
  });

  it('should respect configurable maxPlayersPerZone', async () => {
    // Set to 2 players (simulating Phase 2 config)
    process.env['MAX_PLAYERS_PER_ZONE'] = '2';
    resetConfig();

    const room = await colyseus.createRoom('zone', {});

    // Both players should connect
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);
    await wait(500);

    // Third player should be rejected
    let joinError: Error | null = null;
    try {
      await colyseus.connectTo(room);
      await wait(500);
    } catch (err) {
      joinError = err as Error;
    }

    expect(joinError).not.toBeNull();
    // Colyseus auto-locks rooms at maxClients, so rejection may say "locked" or "full"
    expect(joinError!.message).toMatch(/full|locked/i);

    await client1.leave();
    await client2.leave();
  });
});

describe('Solo Play — Config Module', () => {
  beforeEach(() => {
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    delete process.env['MAX_REPLICAS'];
    delete process.env['REDIS_PRESENCE_ENABLED'];
    delete process.env['REDIS_CONNECTION_STRING'];
    resetConfig();
  });

  afterEach(() => {
    delete process.env['MAX_PLAYERS_PER_ZONE'];
    delete process.env['MAX_REPLICAS'];
    delete process.env['REDIS_PRESENCE_ENABLED'];
    delete process.env['REDIS_CONNECTION_STRING'];
    resetConfig();
  });

  it('should load default Phase 1 config', async () => {
    const { getConfig } = await import('../config.js');
    resetConfig();
    const config = getConfig();

    expect(config.maxPlayersPerZone).toBe(4);
    expect(config.maxReplicas).toBe(4);
    expect(config.matchmakerMode).toBe('in-process');
    expect(config.redis.enabled).toBe(false);
    expect(config.redis.connectionString).toBe('redis://localhost:6379');
  });

  it('should override config from env vars', async () => {
    process.env['MAX_PLAYERS_PER_ZONE'] = '4';
    process.env['MAX_REPLICAS'] = '3';
    process.env['REDIS_PRESENCE_ENABLED'] = 'true';
    process.env['REDIS_CONNECTION_STRING'] = 'redis://prod:6380';

    const { getConfig } = await import('../config.js');
    resetConfig();
    const config = getConfig();

    expect(config.maxPlayersPerZone).toBe(4);
    expect(config.maxReplicas).toBe(3);
    expect(config.redis.enabled).toBe(true);
    expect(config.redis.connectionString).toBe('redis://prod:6380');
  });

  it('should handle invalid env var values gracefully', async () => {
    process.env['MAX_PLAYERS_PER_ZONE'] = 'not-a-number';
    process.env['REDIS_PRESENCE_ENABLED'] = 'maybe';

    const { getConfig } = await import('../config.js');
    resetConfig();
    const config = getConfig();

    // Falls back to defaults for unparseable values
    expect(config.maxPlayersPerZone).toBe(4);
    expect(config.redis.enabled).toBe(false);
  });

  it('matchmaker mode is always in-process', async () => {
    const { getConfig } = await import('../config.js');
    resetConfig();
    const config = getConfig();

    // Colyseus built-in matchmaker — no separate service
    expect(config.matchmakerMode).toBe('in-process');
  });
});
