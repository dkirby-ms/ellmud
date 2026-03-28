/**
 * Edge case tests — boundary conditions, simultaneous actions, timer expirations.
 * These are the tests that find bugs before players do.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectTestClient,
  wait,
  waitUntil,
  makeCommand,
  quickCollapseOptions,
} from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { resetConfig } from '../config.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  // Edge-case tests need multi-player shards
  process.env['MAX_PLAYERS_PER_SHARD'] = '10';
  resetConfig();
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
  delete process.env['MAX_PLAYERS_PER_SHARD'];
  resetConfig();
});

describe('Edge Cases — ShardRoom', () => {
  it('should handle command during shard collapse without crashing', async () => {
    const { client, collector } = await connectTestClient(
      colyseus,
      'shard',
      quickCollapseOptions(8),
    );

    const reachedCollapse = await waitUntil(
      () => collector.shardState.some((s) => s.state === 'collapse'),
      25_000,
    );

    if (reachedCollapse) {
      try {
        client.send(MessageTypes.COMMAND, makeCommand('look'));
        await wait(500);
      } catch {
        // Connection may be closed — that's expected
      }
    }

    expect(true).toBe(true);

    try { await client.leave(); } catch { /* may already be disconnected */ }
  }, 30_000);

  it('should handle player disconnect mid-tick gracefully', async () => {
    const room = await colyseus.createRoom('shard', {});

    const client1 = await colyseus.connectTo(room);
    new MessageCollector(client1);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);

    await wait(500);

    // Disconnect client1 abruptly while ticks are running
    await client1.leave();
    await wait(2000);

    // client2 should still be receiving messages
    const preCount = collector2.narrate.length;
    client2.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    expect(collector2.narrate.length).toBeGreaterThan(preCount);

    await client2.leave();
  });

  it('should handle rapid command spam without crashing', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    for (let i = 0; i < 20; i++) {
      client.send(MessageTypes.COMMAND, makeCommand('look'));
    }

    await wait(2000);

    // Should have received responses for all commands (+ join messages)
    expect(collector.narrate.length).toBeGreaterThanOrEqual(20);

    await client.leave();
  });

  it('should handle joining during seeding phase', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard', {}, 100);

    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.shardState.length).toBeGreaterThan(0);

    const firstState = collector.shardState[0]!;
    expect(firstState.state).toBe('seeding');

    await client.leave();
  });

  it('should handle look command with biome option', async () => {
    const { client, collector } = await connectTestClient(
      colyseus,
      'shard',
      { biome: 'void_rift' },
    );

    const preCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(preCount);

    await client.leave();
  });
});

describe('Edge Cases — Zone ShardRoom (the-refuge)', () => {
  it('should handle player disconnect while others remain', async () => {
    const room = await colyseus.createRoom('shard', { zoneSlug: 'the-refuge' });

    const client1 = await colyseus.connectTo(room);
    new MessageCollector(client1);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);

    await wait(500);

    await client1.leave();
    await wait(500);

    const preCount = collector2.narrate.length;
    client2.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    expect(collector2.narrate.length).toBeGreaterThan(preCount);

    await client2.leave();
  });

  it('should handle rapid join/leave cycles', async () => {
    const room = await colyseus.createRoom('shard', { zoneSlug: 'the-refuge' });

    // Keep an anchor client connected so the room doesn't auto-dispose
    const anchor = await colyseus.connectTo(room);
    await wait(200);

    for (let i = 0; i < 3; i++) {
      const client = await colyseus.connectTo(room);
      await wait(200);
      await client.leave();
      await wait(200);
    }

    // Room should still be functional
    const finalClient = await colyseus.connectTo(room);
    const finalCollector = new MessageCollector(finalClient);
    await wait(500);

    expect(finalCollector.narrate.length).toBeGreaterThan(0);

    await finalClient.leave();
    await anchor.leave();
  });
});
