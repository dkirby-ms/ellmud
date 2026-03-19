/**
 * Message protocol tests — verify ALL message types from shared package are handled.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectTestClient,
  wait,
  makeCommand,
} from './helpers/index.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

describe('Message Protocol — Server → Client', () => {
  it('should send NARRATE messages with correct shape', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    expect(collector.narrate.length).toBeGreaterThan(0);

    for (const msg of collector.narrate) {
      expect(msg.text).toBeTypeOf('string');
      expect(msg.text.length).toBeGreaterThan(0);
      expect(msg.type).toBeTypeOf('string');
      expect(msg.timestamp).toBeTypeOf('number');
    }

    await client.leave();
  });

  it('should send ROOM_HEADER messages with correct shape', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    expect(collector.roomHeader.length).toBeGreaterThan(0);

    for (const msg of collector.roomHeader) {
      expect(msg.roomName).toBeTypeOf('string');
      expect(msg.exits).toBeInstanceOf(Array);
      expect(msg.stability).toBeTypeOf('number');
      expect(msg.stability).toBeGreaterThanOrEqual(0);
      expect(msg.stability).toBeLessThanOrEqual(1);
    }

    await client.leave();
  });

  it('should send SHARD_STATE messages with correct shape', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    expect(collector.shardState.length).toBeGreaterThan(0);

    const validStates = ['seeding', 'open', 'active', 'destabilising', 'collapse'];
    for (const msg of collector.shardState) {
      expect(validStates).toContain(msg.state);
      expect(msg.collapseTimer).toBeTypeOf('number');
    }

    await client.leave();
  });

  it('should deliver all three message types on shard join', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.roomHeader.length).toBeGreaterThan(0);
    expect(collector.shardState.length).toBeGreaterThan(0);

    await client.leave();
  });

  it('should deliver narrate + room_header on refuge join (no shard_state)', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'refuge');

    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.roomHeader.length).toBeGreaterThan(0);
    // Refuge does NOT send shard_state
    expect(collector.shardState.length).toBe(0);

    await client.leave();
  });
});

describe('Message Protocol — Client → Server', () => {
  it('should handle COMMAND messages and respond with NARRATE', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    const preCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('look'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(preCount);

    await client.leave();
  });

  it('should handle unknown verbs without crashing', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    const preCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('xyzzy'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(preCount);
    const response = collector.narrate[collector.narrate.length - 1]!;
    expect(response.type).toBe('system');

    await client.leave();
  });

  it('should handle empty verb gracefully', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    const preCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand(''));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(preCount);

    await client.leave();
  });

  it('should handle command with args', async () => {
    const { client, collector } = await connectTestClient(colyseus, 'shard');

    const preCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('look', 'north'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(preCount);

    await client.leave();
  });
});
