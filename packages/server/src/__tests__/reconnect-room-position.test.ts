/**
 * Reconnect Room Position — Issue #355
 *
 * Regression test: when a player disconnects (browser refresh) and reconnects,
 * they should land in their CURRENT room, not the spawn/entry room.
 *
 * Root cause: ZoneRoom.onJoin() always created a fresh PlayerState at the
 * entry room on duplicate joins, discarding the player's currentRoomId.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { MessageTypes } from '@ellmud/shared';
import { bootTestServer, wait } from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

/**
 * Connect a client with a specific playerId to an existing room.
 */
async function connectWithPlayerId(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
  playerId: string,
  settleMs = 500,
) {
  const client = await colyseus.connectTo(room, { playerId });
  const collector = new MessageCollector(client);
  await wait(settleMs);
  return { client, collector };
}

describe('Reconnect Room Position (#355)', () => {
  it('reconnecting player (duplicate join) should stay in their current room, not reset to entry', async () => {
    // Create a zone room with the test graph (entry → corridor → shrine, etc.)
    const room = await colyseus.createRoom('zone', { useTestGraph: true });

    // Keep a second client connected to prevent room disposal
    const { client: keepAlive } = await connectWithPlayerId(room, 'keepalive');

    // Player joins at 'entry' (startRoomId of the test graph)
    const { client: client1, collector: _collector1 } = await connectWithPlayerId(room, 'wanderer');

    const serverRoom = room as unknown as {
      players: Map<string, { currentRoomId: string }>;
    };

    // Verify player starts at 'entry'
    expect(serverRoom.players.get('wanderer')?.currentRoomId).toBe('entry');

    // Move north to 'corridor'
    client1.send(MessageTypes.COMMAND, { verb: 'go', args: ['north'] });
    await wait(500);

    // Verify player is now in 'corridor'
    expect(serverRoom.players.get('wanderer')?.currentRoomId).toBe('corridor');

    // Simulate browser refresh: new connection with same playerId (triggers duplicate join path)
    const { client: client2, collector: collector2 } = await connectWithPlayerId(room, 'wanderer', 1000);

    // The reconnected player should be in 'corridor', NOT back at 'entry'
    expect(serverRoom.players.get('wanderer')?.currentRoomId).toBe('corridor');

    // New session should have a different sessionId
    expect(client2.sessionId).not.toBe(client1.sessionId);

    // Player should have received room description for corridor, not entry
    const roomHeaders = collector2.roomHeader;
    const lastHeader = roomHeaders[roomHeaders.length - 1];
    expect(lastHeader).toBeDefined();
    expect(lastHeader!.roomName).toContain('Corridor');

    await client2.leave();
    await keepAlive.leave();
  });

  it('reconnecting player in a deeper room should preserve position through multiple moves', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true });
    const { client: keepAlive } = await connectWithPlayerId(room, 'keepalive2');
    const { client: client1 } = await connectWithPlayerId(room, 'explorer');

    const serverRoom = room as unknown as {
      players: Map<string, { currentRoomId: string }>;
    };

    // Move: entry → corridor → shrine (north, north)
    client1.send(MessageTypes.COMMAND, { verb: 'go', args: ['north'] });
    await wait(400);
    expect(serverRoom.players.get('explorer')?.currentRoomId).toBe('corridor');

    client1.send(MessageTypes.COMMAND, { verb: 'go', args: ['north'] });
    await wait(400);
    expect(serverRoom.players.get('explorer')?.currentRoomId).toBe('shrine');

    // Simulate browser refresh
    const { client: client2 } = await connectWithPlayerId(room, 'explorer', 1000);

    // Should still be in 'shrine'
    expect(serverRoom.players.get('explorer')?.currentRoomId).toBe('shrine');

    await client2.leave();
    await keepAlive.leave();
  });

  it('genuinely new player should still start at entry room', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true });
    const { client } = await connectWithPlayerId(room, 'fresh-player');

    const serverRoom = room as unknown as {
      players: Map<string, { currentRoomId: string }>;
    };

    // New player starts at entry as usual
    expect(serverRoom.players.get('fresh-player')?.currentRoomId).toBe('entry');

    await client.leave();
  });
});
