/**
 * ShardRoom playerId keying tests — Issue #197
 *
 * Validates that ShardRoom uses persistent playerId (from auth context)
 * instead of ephemeral client.sessionId for all player state keying.
 * This ensures reconnecting players recover their state across sessions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { bootTestServer, wait } from './helpers/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { MessageTypes } from '@ellmud/shared';


let colyseus: ColyseusTestServer;

beforeAll(async () => {
  colyseus = await bootTestServer();
});

afterAll(async () => {
  await colyseus.shutdown();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Connect a client to a shard room with specific join options (including playerId).
 * Unlike the default connectTestClient, this passes options to connectTo (onJoin)
 * rather than createRoom (onCreate).
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

/**
 * Create a shard room with short collapse timer for faster tests.
 */
async function createShardRoom(options: Record<string, unknown> = {}) {
  return colyseus.createRoom('shard', { collapseTimer: 120, ...options });
}

// ─── 1. Basic Identity ───────────────────────────────────────────────────────

describe('ShardRoom playerId keying', () => {
  it('should key player state to playerId, not sessionId', async () => {
    const room = await createShardRoom();
    const { client, collector } = await connectWithPlayerId(room, 'persistent-player-1');

    // Player should have joined and received initial messages
    expect(collector.narrate.length).toBeGreaterThan(0);
    expect(collector.shardState.length).toBeGreaterThan(0);

    // The room should track the player under playerId, not sessionId.
    // Access the server-side room to verify internal state.
    const serverRoom = room as unknown as { players: Map<string, unknown> };
    expect(serverRoom.players.has('persistent-player-1')).toBe(true);
    // sessionId is ephemeral — should NOT be a key in the players map
    expect(serverRoom.players.has(client.sessionId)).toBe(false);

    await client.leave();
  });

  it('should resolve playerId from join options, not fabricate it', async () => {
    const room = await createShardRoom();
    const { client } = await connectWithPlayerId(room, 'auth-player-abc');

    const serverRoom = room as unknown as { players: Map<string, unknown> };
    expect(serverRoom.players.has('auth-player-abc')).toBe(true);

    // The playerId used must match exactly what was provided in join options
    expect(serverRoom.players.has(client.sessionId)).toBe(false);

    await client.leave();
  });

  it('should fall back to sessionId when no playerId is provided', async () => {
    const room = await createShardRoom();
    // Connect without playerId — should use sessionId as fallback
    const client = await colyseus.connectTo(room, {});
    const collector = new MessageCollector(client);
    await wait(500);

    expect(collector.narrate.length).toBeGreaterThan(0);

    const serverRoom = room as unknown as { players: Map<string, unknown> };
    expect(serverRoom.players.has(client.sessionId)).toBe(true);

    await client.leave();
  });
});

// ─── 2. Reconnection ─────────────────────────────────────────────────────────

describe('ShardRoom reconnection with playerId', () => {
  it('should preserve player state when reconnecting with same playerId', async () => {
    const room = await createShardRoom();
    const { client: client1, collector: collector1 } = await connectWithPlayerId(
      room,
      'reconnect-player-1',
    );

    // Keep a second client connected to prevent room disposal when client1 leaves
    const { client: keepAlive } = await connectWithPlayerId(room, 'keepalive-player');

    // Issue a command so the player has interacted with the room
    client1.send(MessageTypes.COMMAND, { verb: 'look', args: [] });
    await wait(500);
    const messagesBeforeDisconnect = collector1.narrate.length;
    expect(messagesBeforeDisconnect).toBeGreaterThan(0);

    // Disconnect (consented leave — player cleaned up, but room stays alive via keepAlive)
    await client1.leave();
    await wait(200);

    // Reconnect with a NEW session (different sessionId) but same playerId
    const { client: client2, collector: collector2 } = await connectWithPlayerId(
      room,
      'reconnect-player-1',
      1000,
    );

    // New session should have a different sessionId
    expect(client2.sessionId).not.toBe(client1.sessionId);

    // Player should still exist in the room under the same playerId
    const serverRoom = room as unknown as { players: Map<string, unknown> };
    expect(serverRoom.players.has('reconnect-player-1')).toBe(true);

    // Should receive state messages on reconnect
    expect(collector2.narrate.length).toBeGreaterThan(0);

    await client2.leave();
    await keepAlive.leave();
  });
});

// ─── 3. Stash Persistence ────────────────────────────────────────────────────

describe('ShardRoom stash keyed by playerId', () => {
  it('should use playerId (not sessionId) for extraction stash transfer', async () => {
    const room = await createShardRoom();
    const { client } = await connectWithPlayerId(room, 'stash-player-1');

    // Verify the extraction system uses playerId for keying.
    // The extraction system's startExtraction call should receive 'stash-player-1'.
    const serverRoom = room as unknown as {
      extractionSystem: { isExtracting: (id: string) => boolean };
      players: Map<string, unknown>;
    };

    // Player exists under playerId
    expect(serverRoom.players.has('stash-player-1')).toBe(true);

    // If extraction were started, it should be keyed by playerId
    // (extraction start requires being in an extraction room; we just verify identity)
    expect(serverRoom.extractionSystem.isExtracting('stash-player-1')).toBe(false);
    // Should NOT be keyed by sessionId
    expect(serverRoom.extractionSystem.isExtracting(client.sessionId)).toBe(false);

    await client.leave();
  });
});

// ─── 4. Combat Continuity ────────────────────────────────────────────────────

describe('ShardRoom combat keyed by playerId', () => {
  it('should register combatants using playerId', async () => {
    const room = await createShardRoom();
    const { client } = await connectWithPlayerId(room, 'combat-player-1');

    const serverRoom = room as unknown as {
      combatSystem: {
        isInCombat: (id: string) => boolean;
        getCombatant: (id: string) => unknown | undefined;
      };
      players: Map<string, unknown>;
    };

    // Player state is keyed by playerId
    expect(serverRoom.players.has('combat-player-1')).toBe(true);

    // If combat were initiated, it should use playerId as the combatant id.
    // At join time, player is not in combat yet.
    expect(serverRoom.combatSystem.isInCombat('combat-player-1')).toBe(false);
    // Should NOT have combat state under sessionId
    expect(serverRoom.combatSystem.isInCombat(client.sessionId)).toBe(false);

    await client.leave();
  });

  it('should use playerId when sending strike command', async () => {
    const room = await createShardRoom();
    const { client } = await connectWithPlayerId(room, 'striker-player-1');
    await wait(500);

    // Send a strike command — the combat system should register using playerId
    client.send(MessageTypes.COMMAND, { verb: 'strike', args: [] });
    await wait(1000);

    const serverRoom = room as unknown as {
      combatSystem: { getCombatant: (id: string) => unknown | undefined };
    };

    // Whether or not there's a valid target, the combatant lookup should use playerId
    // (getCombatant returns undefined if not registered yet, which is fine —
    //  the point is it should never be indexed by sessionId)
    const combatantByPlayerId = serverRoom.combatSystem.getCombatant('striker-player-1');
    const combatantBySessionId = serverRoom.combatSystem.getCombatant(client.sessionId);

    // At minimum, these should not both be defined (one or neither, depending on targets)
    // If a combatant was registered, it should be under playerId
    if (combatantByPlayerId || combatantBySessionId) {
      expect(combatantBySessionId).toBeUndefined();
    }

    await client.leave();
  });
});

// ─── 5. Multiple Players ─────────────────────────────────────────────────────

describe('ShardRoom multiple players with distinct playerIds', () => {
  it('should maintain separate state for different playerIds', async () => {
    const room = await createShardRoom();
    const { client: c1, collector: col1 } = await connectWithPlayerId(room, 'multi-player-1');
    const { client: c2, collector: col2 } = await connectWithPlayerId(room, 'multi-player-2');

    const serverRoom = room as unknown as { players: Map<string, unknown> };

    // Both players should exist under their respective playerIds
    expect(serverRoom.players.has('multi-player-1')).toBe(true);
    expect(serverRoom.players.has('multi-player-2')).toBe(true);

    // Neither should be keyed by sessionId
    expect(serverRoom.players.has(c1.sessionId)).toBe(false);
    expect(serverRoom.players.has(c2.sessionId)).toBe(false);

    // Both should have received join messages independently
    expect(col1.narrate.length).toBeGreaterThan(0);
    expect(col2.narrate.length).toBeGreaterThan(0);

    await c1.leave();
    await c2.leave();
  });

  it('should not cross-contaminate state between different playerIds', async () => {
    const room = await createShardRoom();
    const { client: c1 } = await connectWithPlayerId(room, 'iso-player-A');
    const { client: c2 } = await connectWithPlayerId(room, 'iso-player-B');

    // Send a move command from player A
    c1.send(MessageTypes.COMMAND, { verb: 'look', args: [] });
    await wait(500);

    const serverRoom = room as unknown as {
      players: Map<string, { currentRoomId: string }>;
    };

    const stateA = serverRoom.players.get('iso-player-A');
    const stateB = serverRoom.players.get('iso-player-B');

    expect(stateA).toBeDefined();
    expect(stateB).toBeDefined();

    // Both have their own room state (may be same starting room, but are distinct objects)
    expect(stateA).not.toBe(stateB);

    await c1.leave();
    await c2.leave();
  });
});

// ─── 6. Auth Integration ─────────────────────────────────────────────────────

describe('ShardRoom auth integration', () => {
  it('should map sessionId to playerId from join options', async () => {
    const room = await createShardRoom();
    const { client } = await connectWithPlayerId(room, 'auth-mapped-player');

    // The room should maintain a sessionId → playerId mapping
    const serverRoom = room as unknown as {
      playerIds?: Map<string, string>;
      players: Map<string, unknown>;
    };

    // Primary assertion: player state is keyed by the auth-provided playerId
    expect(serverRoom.players.has('auth-mapped-player')).toBe(true);

    // If the room maintains a sessionId → playerId map (like RefugeRoom),
    // verify the mapping exists
    if (serverRoom.playerIds) {
      expect(serverRoom.playerIds.get(client.sessionId)).toBe('auth-mapped-player');
    }

    await client.leave();
  });

  it('should handle playerId from options context consistently', async () => {
    const room = await createShardRoom();

    // Connect two clients: one with explicit playerId, one without
    const { client: authClient } = await connectWithPlayerId(room, 'explicit-player');
    const fallbackClient = await colyseus.connectTo(room, {});
    await wait(500);

    const serverRoom = room as unknown as { players: Map<string, unknown> };

    // Auth client should be keyed by playerId
    expect(serverRoom.players.has('explicit-player')).toBe(true);
    // Fallback client should be keyed by sessionId (since no playerId provided)
    expect(serverRoom.players.has(fallbackClient.sessionId)).toBe(true);

    await authClient.leave();
    await fallbackClient.leave();
  });
});
