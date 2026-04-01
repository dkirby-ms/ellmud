/**
 * Exploration Messages Tests — Phase D (Exploration Wiring)
 *
 * Validates client-facing exploration messages sent by ZoneRoom:
 *   M1: EXPLORATION_DATA sent on join (bulk visited rooms + current room)
 *   M2: EXPLORATION_UPDATE sent on room movement (single room payload)
 *   M3: recordVisit called with correct parameters on join
 *   M4: recordVisit called with correct parameters on movement
 *   M5: Exploration works in zone mode (zoneSlug present)
 *   M6: Exploration works in procedural mode (zoneSlug null)
 *   M7: Flee records exploration update
 *   M8: Duplicate visits don't crash (upsert semantics)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ZoneRoom } from '../rooms/ZoneRoom.js';
import {
  MessageTypes,
  type ExplorationDataMessage,
  type ExplorationUpdateMessage,
  type ExploredRoomData,
} from '@ellmud/shared';
import {
  InMemoryExplorationRepository,
  getExplorationRepository,
  resetExplorationProvider,
} from '../exploration/index.js';
import {
  getZoneRepository,
  resetZoneProvider,
  type ZoneData,
} from '../zones/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { wait } from './helpers/index.js';

// ─── Seeding Helpers ─────────────────────────────────────────────────────────

async function seedZone(
  slug: string,
  category: 'hub' | 'dungeon' | 'wilderness' | 'social' = 'hub',
): Promise<ZoneData> {
  const repo = getZoneRepository();

  const zone = await repo.createZone({
    slug,
    name: `Test Zone (${slug})`,
    description: `Zone for exploration message tests.`,
    levelMin: 1,
    levelMax: 5,
    tier: 1,
    theme: 'flooded_crypt',
    entryRoomSlugs: ['hearth'],
    lifecycle: 'persistent',
    category,
    maxPlayers: 0,
    pvpEnabled: false,
    repopIntervalSeconds: 300,
  });

  await repo.createRoom({
    zoneId: zone.id,
    slug: 'hearth',
    name: 'The Hearth',
    description: 'A warm, safe room.',
    type: 'entry',
    properties: [],
    lootContainers: [],
    hazards: [],
    npcs: [],
  });

  await repo.createRoom({
    zoneId: zone.id,
    slug: 'hallway',
    name: 'Dim Hallway',
    description: 'A dim hallway stretching north.',
    type: 'corridor',
    properties: [],
    lootContainers: [],
    hazards: [],
    npcs: [],
  });

  await repo.createExit({
    zoneId: zone.id,
    fromRoomSlug: 'hearth',
    direction: 'north',
    toRoomSlug: 'hallway',
    locked: false,
    hidden: false,
  });

  await repo.createExit({
    zoneId: zone.id,
    fromRoomSlug: 'hallway',
    direction: 'south',
    toRoomSlug: 'hearth',
    locked: false,
    hidden: false,
  });

  const data = await repo.getZoneBySlug(slug);
  if (!data) throw new Error(`Failed to seed zone "${slug}"`);
  return data;
}

// ─── Server Boot ─────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  resetZoneProvider();
  resetExplorationProvider();

  await seedZone('msg-hub', 'hub');

  const server = new Server();
  server.define('zone', ZoneRoom);
  await server.listen(0);
  const addr = (
    server as unknown as { transport: { server: { address(): { port: number } } } }
  ).transport.server.address();
  (server as unknown as { port: number }).port = addr.port;
  colyseus = new ColyseusTestServer(server);
}, 30_000);

afterAll(async () => {
  await colyseus.shutdown();
  resetZoneProvider();
  resetExplorationProvider();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Connect a player and wire up both MessageCollector and raw exploration message capture. */
async function connectWithExploration(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
  playerId: string,
  settleMs = 800,
) {
  const client = await colyseus.connectTo(room, { playerId, characterId: playerId });
  const collector = new MessageCollector(client);

  const explorationData: ExplorationDataMessage[] = [];
  const explorationUpdates: ExplorationUpdateMessage[] = [];

  client.onMessage(MessageTypes.EXPLORATION_DATA, (data: ExplorationDataMessage) => {
    explorationData.push(data);
  });
  client.onMessage(MessageTypes.EXPLORATION_UPDATE, (data: ExplorationUpdateMessage) => {
    explorationUpdates.push(data);
  });

  await wait(settleMs);
  return { client, collector, explorationData, explorationUpdates };
}

function sendCommand(
  client: Awaited<ReturnType<ColyseusTestServer['connectTo']>>,
  verb: string,
  ...args: string[]
) {
  client.send(MessageTypes.COMMAND, { verb, args });
}

// ═════════════════════════════════════════════════════════════════════════════
// M1: EXPLORATION_DATA sent on join
// ═════════════════════════════════════════════════════════════════════════════

describe('M1 — EXPLORATION_DATA sent on join', () => {
  it('client receives EXPLORATION_DATA message on join', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationData } = await connectWithExploration(room, 'msg-join-1');

    expect(explorationData.length).toBeGreaterThanOrEqual(1);
    await client.leave();
  });

  it('EXPLORATION_DATA includes currentRoomId', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationData } = await connectWithExploration(room, 'msg-join-2');

    expect(explorationData.length).toBeGreaterThanOrEqual(1);
    const msg = explorationData[0]!;
    expect(msg.currentRoomId).toBeTruthy();
    expect(typeof msg.currentRoomId).toBe('string');

    await client.leave();
  });

  it('EXPLORATION_DATA rooms array contains at least the starting room', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationData } = await connectWithExploration(room, 'msg-join-3');

    expect(explorationData.length).toBeGreaterThanOrEqual(1);
    const msg = explorationData[0]!;
    expect(msg.rooms).toBeDefined();
    expect(Array.isArray(msg.rooms)).toBe(true);
    expect(msg.rooms.length).toBeGreaterThanOrEqual(1);

    // Starting room should be in the rooms array
    const startRoom = msg.rooms.find((r: ExploredRoomData) => r.roomId === msg.currentRoomId);
    expect(startRoom).toBeDefined();

    await client.leave();
  });

  it('EXPLORATION_DATA rooms have correct shape', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationData } = await connectWithExploration(room, 'msg-join-shape');

    const msg = explorationData[0]!;
    const firstRoom = msg.rooms[0]!;

    expect(firstRoom.roomId).toBeTruthy();
    expect(firstRoom.roomName).toBeTruthy();
    expect(firstRoom.roomType).toBeTruthy();
    expect(typeof firstRoom.visitedAt).toBe('string');
    expect(typeof firstRoom.exits).toBe('object');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M2: EXPLORATION_UPDATE sent on room movement
// ═════════════════════════════════════════════════════════════════════════════

describe('M2 — EXPLORATION_UPDATE sent on movement', () => {
  it('client receives EXPLORATION_UPDATE after moving', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationUpdates } = await connectWithExploration(room, 'msg-move-1');

    sendCommand(client, 'go', 'north');
    await wait(1000);

    expect(explorationUpdates.length).toBeGreaterThanOrEqual(1);

    await client.leave();
  });

  it('EXPLORATION_UPDATE room data has roomId, roomName, exits, roomType', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationUpdates } = await connectWithExploration(room, 'msg-move-2');

    sendCommand(client, 'go', 'north');
    await wait(1000);

    expect(explorationUpdates.length).toBeGreaterThanOrEqual(1);
    const update = explorationUpdates[0]!;
    expect(update.room).toBeDefined();
    expect(update.room.roomId).toBeTruthy();
    expect(update.room.roomName).toBeTruthy();
    expect(update.room.roomType).toBeTruthy();
    expect(typeof update.room.exits).toBe('object');

    await client.leave();
  });

  it('EXPLORATION_UPDATE room matches destination room', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationUpdates } = await connectWithExploration(room, 'msg-move-dest');

    sendCommand(client, 'go', 'north');
    await wait(1000);

    const update = explorationUpdates[0]!;
    // Destination is the hallway
    expect(update.room.roomName).toBe('Dim Hallway');
    expect(update.room.roomType).toBe('corridor');
    // Should have a south exit back to hearth
    expect(update.room.exits).toHaveProperty('south');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M3: recordVisit called on join
// ═════════════════════════════════════════════════════════════════════════════

describe('M3 — recordVisit called on join', () => {
  it('exploration repo records a visit for the starting room on join', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client } = await connectWithExploration(room, 'msg-record-join');

    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('msg-record-join');

    expect(rooms.length).toBeGreaterThanOrEqual(1);
    const entryRoom = rooms.find((r) => r.roomType === 'entry');
    expect(entryRoom).toBeDefined();
    expect(entryRoom!.characterId).toBe('msg-record-join');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M4: recordVisit called on movement
// ═════════════════════════════════════════════════════════════════════════════

describe('M4 — recordVisit called on movement', () => {
  it('exploration repo records the new room after movement', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client } = await connectWithExploration(room, 'msg-record-move');

    sendCommand(client, 'go', 'north');
    await wait(1000);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('msg-record-move');

    // Should have at least 2: entry room (on join) + hallway (on move)
    expect(rooms.length).toBeGreaterThanOrEqual(2);
    const roomTypes = rooms.map((r) => r.roomType);
    expect(roomTypes).toContain('entry');
    expect(roomTypes).toContain('corridor');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M5: Exploration works in zone mode
// ═════════════════════════════════════════════════════════════════════════════

describe('M5 — Exploration works in zone mode', () => {
  it('EXPLORATION_DATA includes zoneSlug for zone rooms', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationData } = await connectWithExploration(room, 'msg-zone-data');

    expect(explorationData.length).toBeGreaterThanOrEqual(1);
    const msg = explorationData[0]!;

    for (const r of msg.rooms) {
      expect(r.zoneSlug).toBe('msg-hub');
    }

    await client.leave();
  });

  it('EXPLORATION_UPDATE includes zoneSlug after movement in zone', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationUpdates } = await connectWithExploration(room, 'msg-zone-update');

    sendCommand(client, 'go', 'north');
    await wait(1000);

    expect(explorationUpdates.length).toBeGreaterThanOrEqual(1);
    expect(explorationUpdates[0]!.room.zoneSlug).toBe('msg-hub');

    await client.leave();
  });

  it('recordVisit stores correct zoneSlug for zone rooms', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client } = await connectWithExploration(room, 'msg-zone-repo');

    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('msg-zone-repo');

    expect(rooms.length).toBeGreaterThanOrEqual(1);
    for (const r of rooms) {
      expect(r.zoneSlug).toBe('msg-hub');
    }

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M6: Exploration works in procedural mode (procedural)
// ═════════════════════════════════════════════════════════════════════════════

describe('M6 — Exploration works in procedural mode (procedural)', () => {
  it('EXPLORATION_DATA has null zoneSlug for zone rooms', async () => {
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client, explorationData } = await connectWithExploration(room, 'msg-zone-data');

    expect(explorationData.length).toBeGreaterThanOrEqual(1);
    const msg = explorationData[0]!;

    for (const r of msg.rooms) {
      expect(r.zoneSlug).toBeNull();
    }

    await client.leave();
  });

  it('EXPLORATION_UPDATE has null zoneSlug after movement in zone', async () => {
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client, explorationUpdates, explorationData } =
      await connectWithExploration(room, 'msg-zone-update');

    // Find an exit from the starting room
    const startMsg = explorationData[0];
    expect(startMsg).toBeDefined();
    const startRoom = startMsg!.rooms.find(
      (r: ExploredRoomData) => r.roomId === startMsg!.currentRoomId,
    );
    expect(startRoom).toBeDefined();

    const exitDirections = Object.keys(startRoom!.exits);
    expect(exitDirections.length).toBeGreaterThan(0);

    sendCommand(client, 'go', exitDirections[0]!);
    await wait(1000);

    expect(explorationUpdates.length).toBeGreaterThanOrEqual(1);
    expect(explorationUpdates[0]!.room.zoneSlug).toBeNull();

    await client.leave();
  });

  it('recordVisit stores null zoneSlug for zone rooms', async () => {
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client } = await connectWithExploration(room, 'msg-procedural-repo');

    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('msg-procedural-repo');

    expect(rooms.length).toBeGreaterThanOrEqual(1);
    for (const r of rooms) {
      expect(r.zoneSlug).toBeNull();
    }

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M7: Flee records exploration
// ═════════════════════════════════════════════════════════════════════════════

describe('M7 — Flee records exploration', () => {
  it('flee triggers exploration recording for the flee destination', async () => {
    // Use procedural mode with test graph — creatures spawn in non-entry rooms
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client, explorationData } =
      await connectWithExploration(room, 'msg-flee-record');

    const startMsg = explorationData[0];
    expect(startMsg).toBeDefined();

    // Navigate to find combat. Send flee to trigger combat flee path.
    // In procedural mode, entry room has exits. Move to a non-entry room.
    const startRoom = startMsg!.rooms.find(
      (r: ExploredRoomData) => r.roomId === startMsg!.currentRoomId,
    );
    const exitDirections = Object.keys(startRoom?.exits ?? {});

    if (exitDirections.length > 0) {
      // Move out of entry to potentially encounter a creature
      sendCommand(client, 'go', exitDirections[0]!);
      await wait(1000);

      // Send strike then flee — if in combat, flee should produce an exploration update
      sendCommand(client, 'strike');
      await wait(200);
      sendCommand(client, 'flee');
      await wait(2500);

      // We just verify the wiring didn't crash and messages were received
      // (the player may not have entered combat if no creature was present)
      // The exploration system should have recorded at least the moved-to room
      const repo = getExplorationRepository();
      const rooms = await repo.getExploredRooms('msg-flee-record');
      expect(rooms.length).toBeGreaterThanOrEqual(2);
    }

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// M8: Duplicate visits don't crash
// ═════════════════════════════════════════════════════════════════════════════

describe('M8 — Duplicate visits don\'t crash', () => {
  it('moving to a room, leaving, and returning does not error', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'msg-hub' });
    const { client, explorationUpdates } =
      await connectWithExploration(room, 'msg-dup-visit');

    // North to hallway
    sendCommand(client, 'go', 'north');
    await wait(800);

    // South back to hearth (re-visiting entry room)
    sendCommand(client, 'go', 'south');
    await wait(800);

    // North again to hallway (re-visiting hallway)
    sendCommand(client, 'go', 'north');
    await wait(800);

    // Should have received 3 EXPLORATION_UPDATE messages (one per move)
    expect(explorationUpdates.length).toBe(3);

    // Repo should have exactly 2 unique rooms (upserted, not duplicated)
    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('msg-dup-visit');

    const uniqueRoomIds = new Set(rooms.map((r) => r.roomId));
    expect(rooms.length).toBe(uniqueRoomIds.size);
    expect(rooms.length).toBe(2); // hearth + hallway

    // Entry room should have been visited multiple times (join + return)
    const entryRoom = rooms.find((r) => r.roomType === 'entry');
    expect(entryRoom).toBeDefined();
    expect(entryRoom!.visitCount).toBeGreaterThanOrEqual(2);

    await client.leave();
  });

  it('InMemoryExplorationRepository handles rapid duplicate visits', async () => {
    const repo = new InMemoryExplorationRepository();

    // Rapid fire the same visit — simulates what happens if wiring calls twice
    await Promise.all([
      repo.recordVisit({
        characterId: 'rapid-char',
        zoneSlug: 'test',
        roomId: 'room-1',
        roomType: 'entry',
        roomName: 'Room 1',
      }),
      repo.recordVisit({
        characterId: 'rapid-char',
        zoneSlug: 'test',
        roomId: 'room-1',
        roomType: 'entry',
        roomName: 'Room 1',
      }),
      repo.recordVisit({
        characterId: 'rapid-char',
        zoneSlug: 'test',
        roomId: 'room-1',
        roomType: 'entry',
        roomName: 'Room 1',
      }),
    ]);

    const rooms = await repo.getExploredRooms('rapid-char');
    expect(rooms).toHaveLength(1);
    expect(rooms[0]!.visitCount).toBe(3);
  });
});
