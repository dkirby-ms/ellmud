/**
 * RefugeRoom tests — verify multi-player behavior and welcome messages.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import {
  bootTestServer,
  connectToExistingRoom,
  wait,
  makeCommand,
} from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';

describe('RefugeRoom Multi-Player', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await bootTestServer();
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should send welcome narration to each player individually', async () => {
    const room = await colyseus.createRoom('refuge', {});

    const client1 = await colyseus.connectTo(room);
    const collector1 = new MessageCollector(client1);
    await wait(500);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);
    await wait(500);

    // Both players should have received welcome messages
    expect(collector1.narrate.length).toBeGreaterThan(0);
    expect(collector2.narrate.length).toBeGreaterThan(0);

    // Welcome messages should be system type
    expect(collector1.narrateByType('system').length).toBeGreaterThan(0);
    expect(collector2.narrateByType('system').length).toBeGreaterThan(0);

    await client1.leave();
    await client2.leave();
  });

  it('should send room header to each player on join', async () => {
    const room = await colyseus.createRoom('refuge', {});

    const client1 = await colyseus.connectTo(room);
    const collector1 = new MessageCollector(client1);
    await wait(500);

    const client2 = await colyseus.connectTo(room);
    const collector2 = new MessageCollector(client2);
    await wait(500);

    // Both should receive room_header
    expect(collector1.roomHeader.length).toBeGreaterThan(0);
    expect(collector2.roomHeader.length).toBeGreaterThan(0);

    // Room header should be The Refuge
    expect(collector1.roomHeader[0]!.roomName).toContain('Refuge');
    expect(collector2.roomHeader[0]!.roomName).toContain('Refuge');

    // Refuge is always stable
    expect(collector1.roomHeader[0]!.stability).toBe(1.0);

    await client1.leave();
    await client2.leave();
  });

  it('should handle three or more concurrent players', async () => {
    const room = await colyseus.createRoom('refuge', {});

    const clients: Array<Awaited<ReturnType<typeof colyseus.connectTo>>> = [];
    const collectors: MessageCollector[] = [];

    for (let i = 0; i < 3; i++) {
      const client = await colyseus.connectTo(room);
      const collector = new MessageCollector(client);
      clients.push(client);
      collectors.push(collector);
      await wait(200);
    }

    // All three should have received messages
    for (const collector of collectors) {
      expect(collector.narrate.length).toBeGreaterThan(0);
      expect(collector.roomHeader.length).toBeGreaterThan(0);
    }

    for (const client of clients) {
      await client.leave();
    }
  });

  it('should handle shardboard command in refuge', async () => {
    const room = await colyseus.createRoom('refuge', {});
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    const initialCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('shardboard'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(initialCount);
    const response = collector.narrate[collector.narrate.length - 1]!;
    expect(response.text).toContain('Shardboard');

    await client.leave();
  });

  it('should handle unknown commands gracefully', async () => {
    const room = await colyseus.createRoom('refuge', {});
    const client = await colyseus.connectTo(room);
    const collector = new MessageCollector(client);
    await wait(500);

    const initialCount = collector.narrate.length;
    client.send(MessageTypes.COMMAND, makeCommand('dance'));
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(initialCount);
    const response = collector.narrate[collector.narrate.length - 1]!;
    expect(response.type).toBe('system');
    expect(response.text).toContain('dance');

    await client.leave();
  });
});
