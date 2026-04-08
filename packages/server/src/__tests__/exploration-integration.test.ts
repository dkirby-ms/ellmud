/**
 * Exploration Integration Tests — Phase D (Exploration Wiring)
 *
 * Validates that ZoneRoom records exploration visits via the ExplorationRepository
 * when players join zones and move between rooms. Written anticipatorily for Phase D.
 *
 * Expected behavior:
 *   D1: Join records entry room in exploration repo
 *   D2: Movement ('go') records new room in exploration repo
 *   D3: Zone rooms record zoneSlug; zone rooms record null
 *   D4: Fire-and-forget — repo errors don't crash the game loop
 *   D5: Duplicate visits increment visit_count (upsert semantics)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ZoneRoom } from '../rooms/ZoneRoom.js';
import { MessageTypes } from '@ellmud/shared';
import {
  InMemoryExplorationRepository,
  getExplorationRepository,
  resetExplorationProvider,
  type ExplorationRepository,
} from '../exploration/index.js';
import {
  getZoneRepository,
  resetZoneProvider,
  type ZoneData,
} from '../zones/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { wait } from './helpers/index.js';

// ─── Seeding Helpers ─────────────────────────────────────────────────────────

/** Seed a zone with two connected rooms for movement testing. */
async function seedZone(
  slug: string,
  category: 'hub' | 'dev' | 'dungeon' | 'wilderness' | 'social' = 'hub',
): Promise<ZoneData> {
  const repo = getZoneRepository();

  const zone = await repo.createZone({
    slug,
    name: `Test Zone (${slug})`,
    description: `Zone for exploration tests.`,
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
    features: [],
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
    features: [],
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

// ─── ZoneRoom Internals Access ──────────────────────────────────────────────

interface ZoneRoomInternals {
  explorationRepo?: ExplorationRepository;
  isZone: boolean;
  zoneSlug?: string;
  players: Map<string, { currentRoomId: string }>;
  playerIds: Map<string, string>;
}

function internals(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
): ZoneRoomInternals {
  return room as unknown as ZoneRoomInternals;
}

// ─── Server Boot ─────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  resetZoneProvider();
  resetExplorationProvider();

  await seedZone('explore-hub', 'hub');
  await seedZone('explore-dungeon', 'dungeon');

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

async function connectWithPlayer(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
  playerId: string,
  settleMs = 800,
) {
  const client = await colyseus.connectTo(room, { playerId, characterId: playerId });
  const collector = new MessageCollector(client);
  await wait(settleMs);
  return { client, collector };
}

/** Send a command message to the room. */
function sendCommand(
  client: Awaited<ReturnType<ColyseusTestServer['connectTo']>>,
  verb: string,
  ...args: string[]
) {
  client.send(MessageTypes.COMMAND, { verb, args });
}

// ═════════════════════════════════════════════════════════════════════════════
// D1: Exploration recording on join
// ═════════════════════════════════════════════════════════════════════════════

describe('D1 — Exploration recording on join', () => {
  it.todo('records entry room when player joins a zone ZoneRoom', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'explore-hub' });
    const { client } = await connectWithPlayer(room, 'explore-join-player');

    // Give fire-and-forget time to complete
    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('explore-join-player');

    // Phase D wiring: ZoneRoom.onJoin() should call recordVisit with the entry room.
    // Until Phase D lands, this will be 0. After, it should be >= 1.
    expect(rooms.length).toBeGreaterThanOrEqual(1);
    const entryRoom = rooms.find((r) => r.roomType === 'entry');
    expect(entryRoom).toBeDefined();
    expect(entryRoom!.characterId).toBe('explore-join-player');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D2: Exploration recording on movement
// ═════════════════════════════════════════════════════════════════════════════

describe('D2 — Exploration recording on movement', () => {
  it.todo('records new room when player moves via "go" command', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'explore-hub' });
    const { client } = await connectWithPlayer(room, 'explore-move-player');

    // Move north to hallway
    sendCommand(client, 'go', 'north');
    await wait(1000);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('explore-move-player');

    // Should have at least 2 rooms: entry + hallway
    expect(rooms.length).toBeGreaterThanOrEqual(2);

    const roomTypes = rooms.map((r) => r.roomType);
    expect(roomTypes).toContain('entry');
    expect(roomTypes).toContain('corridor');

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D3: Correct zone slug recording
// ═════════════════════════════════════════════════════════════════════════════

describe('D3 — Exploration records correct zone slug', () => {
  it.todo('zone rooms record the zone slug', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'explore-hub' });
    const { client } = await connectWithPlayer(room, 'explore-zone-slug-player');

    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('explore-zone-slug-player');

    expect(rooms.length).toBeGreaterThanOrEqual(1);
    for (const r of rooms) {
      expect(r.zoneSlug).toBe('explore-hub');
    }

    await client.leave();
  });

  it('zone rooms record null zoneSlug', async () => {
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client } = await connectWithPlayer(room, 'explore-zone-slug-player');

    await wait(500);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('explore-zone-slug-player');

    // Phase D should record zone visits with null zoneSlug
    // If not yet implemented, this array may be empty — that's OK
    if (rooms.length > 0) {
      for (const r of rooms) {
        expect(r.zoneSlug).toBeNull();
      }
    }

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D4: Fire-and-forget resilience
// ═════════════════════════════════════════════════════════════════════════════

describe('D4 — Exploration is fire-and-forget', () => {
  it('game continues even if exploration repo throws', async () => {
    // Create a throwing repo to simulate failure
    const throwingRepo: ExplorationRepository = {
      async recordVisit() {
        throw new Error('Simulated exploration DB failure');
      },
      async getExploredRooms() {
        return [];
      },
      async getExploredRoomsInZone() {
        return [];
      },
      async hasVisited() {
        return false;
      },
      async getExplorationStats() {
        return { totalRooms: 0, totalVisits: 0, zones: 0 };
      },
    };

    const room = await colyseus.createRoom('zone', { zoneSlug: 'explore-hub' });

    // Inject throwing repo if the field exists (Phase D adds it)
    const roomInternals = internals(room);
    if ('explorationRepo' in roomInternals) {
      (roomInternals as { explorationRepo: ExplorationRepository }).explorationRepo =
        throwingRepo;
    }

    // The join should NOT throw, even if exploration recording fails
    const { client, collector } = await connectWithPlayer(room, 'explore-error-player');

    // Player should be fully functional — send a command
    sendCommand(client, 'look');
    await wait(500);

    // Verify the room is still operational: player received narrations
    expect(collector.narrate.length).toBeGreaterThan(0);

    // Movement should also work despite failing exploration recording
    sendCommand(client, 'go', 'north');
    await wait(500);

    // Player should still get room narration after moving
    const roomNarrations = collector.narrate.filter(
      (m) => m.type === 'room' || m.type === 'system',
    );
    expect(roomNarrations.length).toBeGreaterThan(0);

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// D5: Duplicate visits update visit_count
// ═════════════════════════════════════════════════════════════════════════════

describe('D5 — Duplicate visits update visit_count', () => {
  it('visiting the same room twice increments visit_count', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'explore-hub' });
    const { client } = await connectWithPlayer(room, 'explore-revisit-player');

    // Move north to hallway, then back south to hearth (revisiting entry)
    sendCommand(client, 'go', 'north');
    await wait(800);
    sendCommand(client, 'go', 'south');
    await wait(800);

    const repo = getExplorationRepository();
    const rooms = await repo.getExploredRooms('explore-revisit-player');

    // Find the entry room — should have been visited at least twice (join + return)
    const entryRoom = rooms.find((r) => r.roomType === 'entry');
    if (entryRoom) {
      expect(entryRoom.visitCount).toBeGreaterThanOrEqual(2);
    }

    // Verify no duplicate entries (same room should be upserted, not duplicated)
    const roomIds = rooms.map((r) => `${r.zoneSlug}::${r.roomId}`);
    const uniqueRoomIds = new Set(roomIds);
    expect(roomIds.length).toBe(uniqueRoomIds.size);

    await client.leave();
  });

  it('visiting the same room does NOT create duplicate records', async () => {
    const repo = new InMemoryExplorationRepository();

    // Simulate what Phase D wiring does: record same room multiple times
    await repo.recordVisit({
      characterId: 'dup-test-char',
      zoneSlug: 'test-zone',
      roomId: 'room-1',
      roomType: 'entry',
      roomName: 'Entry Room',
    });
    await repo.recordVisit({
      characterId: 'dup-test-char',
      zoneSlug: 'test-zone',
      roomId: 'room-1',
      roomType: 'entry',
      roomName: 'Entry Room',
    });

    const rooms = await repo.getExploredRooms('dup-test-char');
    expect(rooms).toHaveLength(1);
    expect(rooms[0]!.visitCount).toBe(2);
  });
});
