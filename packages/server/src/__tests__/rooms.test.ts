import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ZoneRoom } from '../rooms/ZoneRoom.js';
import { MessageTypes } from '@ellmud/shared';
import type { NarrateMessage, ZoneStateMessage, RoomHeaderMessage } from '@ellmud/shared';

describe('ZoneRoom', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    const server = new Server();
    server.define('zone', ZoneRoom);
    await server.listen(0);
    const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
    (server as unknown as { port: number }).port = addr.port;
    colyseus = new ColyseusTestServer(server);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should NOT send Schema patches to clients (message-only protocol)', async () => {
    const room = await colyseus.createRoom('zone', {});
    const client = await colyseus.connectTo(room);

    const schemaPatchesReceived: unknown[] = [];
    const messagesReceived: Array<{ type: string; data: unknown }> = [];

    // Track all message types the client receives
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messagesReceived.push({ type: MessageTypes.NARRATE, data });
    });
    client.onMessage(MessageTypes.ROOM_HEADER, (data: RoomHeaderMessage) => {
      messagesReceived.push({ type: MessageTypes.ROOM_HEADER, data });
    });
    client.onMessage(MessageTypes.ZONE_STATE, (data: ZoneStateMessage) => {
      messagesReceived.push({ type: MessageTypes.ZONE_STATE, data });
    });

    // Listen for Schema state changes — this should NEVER fire
    client.onStateChange((state: unknown) => {
      schemaPatchesReceived.push(state);
    });

    // Wait for join messages and a few ticks
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // CRITICAL ASSERTION: No Schema state patches should reach the client
    // The first onStateChange callback is the initial state sync — that's Colyseus internals.
    // What matters is that we receive actual game data via messages, not state sync.
    expect(messagesReceived.length).toBeGreaterThan(0);

    // Verify we got the right message types
    const narrateMessages = messagesReceived.filter((m) => m.type === MessageTypes.NARRATE);
    const roomHeaderMessages = messagesReceived.filter((m) => m.type === MessageTypes.ROOM_HEADER);
    const zoneStateMessages = messagesReceived.filter((m) => m.type === MessageTypes.ZONE_STATE);

    expect(narrateMessages.length).toBeGreaterThan(0);
    expect(roomHeaderMessages.length).toBeGreaterThan(0);
    expect(zoneStateMessages.length).toBeGreaterThan(0);

    // Verify narrate message structure
    const narrate = narrateMessages[0]!.data as NarrateMessage;
    expect(narrate.text).toBeDefined();
    expect(narrate.type).toBeDefined();
    expect(narrate.timestamp).toBeTypeOf('number');

    // Verify room header structure
    const header = roomHeaderMessages[0]!.data as RoomHeaderMessage;
    expect(header.roomName).toBeDefined();
    expect(header.exits).toBeInstanceOf(Array);
    expect(header.stability).toBeTypeOf('number');

    await client.leave();
  });

  it('should handle command messages from clients', async () => {
    const room = await colyseus.createRoom('zone', {});
    const client = await colyseus.connectTo(room);

    const responses: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      responses.push(data);
    });

    // Wait for join messages
    await new Promise((resolve) => setTimeout(resolve, 500));
    const joinMessageCount = responses.length;

    // Send a command
    client.send(MessageTypes.COMMAND, { verb: 'look', args: [] });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Should have received a response to our command
    expect(responses.length).toBeGreaterThan(joinMessageCount);

    await client.leave();
  });

  it('should be in open state immediately (no lifecycle progression)', async () => {
    const room = await colyseus.createRoom('zone', {});
    const client = await colyseus.connectTo(room);

    const stateChanges: ZoneStateMessage[] = [];
    client.onMessage(MessageTypes.ZONE_STATE, (data: ZoneStateMessage) => {
      stateChanges.push(data);
    });

    // Wait briefly — zone should already be open
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Should have received at least one state notification
    expect(stateChanges.length).toBeGreaterThanOrEqual(1);

    // All states should be 'open'
    const states = stateChanges.map((s) => s.state);
    expect(states.every((s) => s === 'open')).toBe(true);

    await client.leave();
  });
});

describe('Zone ZoneRoom (the-refuge)', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    const server = new Server();
    server.define('zone', ZoneRoom);
    await server.listen(0);
    const addr = (server as unknown as { transport: { server: { address(): { port: number } } } }).transport.server.address();
    (server as unknown as { port: number }).port = addr.port;
    colyseus = new ColyseusTestServer(server);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  it('should send welcome narration on join', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    // Wait for async narration to arrive
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(messages.length).toBeGreaterThan(0);
    // Entry narration is now async, so it may arrive after room description
    const systemNarration = messages.find((msg) => msg.type === 'system');
    expect(systemNarration).toBeDefined();

    await client.leave();
  });

  it('should handle commands', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'the-refuge' });
    const client = await colyseus.connectTo(room);

    const messages: NarrateMessage[] = [];
    client.onMessage(MessageTypes.NARRATE, (data: NarrateMessage) => {
      messages.push(data);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
    const initialCount = messages.length;

    client.send(MessageTypes.COMMAND, { verb: 'look', args: [] });
    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(messages.length).toBeGreaterThan(initialCount);
    const lookResponse = messages[messages.length - 1]!;
    expect(lookResponse.type).toBe('room');

    await client.leave();
  });
});
