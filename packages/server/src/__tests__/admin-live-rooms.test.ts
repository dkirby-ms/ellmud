/**
 * Integration tests for the Admin Live Rooms API (Issue #344, PR #353).
 *
 * Tests 4 new endpoints:
 *   GET  /admin/api/rooms/live                  → live rooms with occupancy
 *   POST /admin/api/rooms/:roomId/broadcast     → message delivery
 *   POST /admin/api/rooms/:roomId/teleport      → player movement
 *   POST /admin/api/rooms/:roomId/spawn-creature → creature spawning
 *
 * All endpoints require: Authorization: Bearer {ADMIN_TOKEN}
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { ContentEntity, IContentStore } from '../admin/content/ContentStore.js';
import type { ContentEntityType } from '../admin/content/content-types.js';

// ─── Mock matchMaker ──────────────────────────────────────────────────────────

const mockRooms = vi.hoisted(() => new Map<string, unknown>());

vi.mock('@colyseus/core', () => ({
  matchMaker: {
    query: vi.fn(async () => {
      const result: unknown[] = [];
      for (const [roomId, room] of mockRooms) {
        result.push({
          roomId,
          name: (room as Record<string, unknown>)._mockName ?? 'zone',
          clients: 0,
          maxClients: 10,
          locked: false,
        });
      }
      return result;
    }),
    getLocalRoomById: vi.fn((roomId: string) => mockRooms.get(roomId) ?? null),
  },
  Room: class {},
}));

// Import createAdminRouter AFTER the mock is set up
import { createAdminRouter, type AdminRouterDeps } from '../admin/routes.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const TEST_TOKEN = 'test-admin-token-12345';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function createTestApp(deps: AdminRouterDeps = {}): express.Express {
  const app = express();
  app.use(express.json());
  app.use(createAdminRouter(deps));
  return app;
}

async function request(
  app: express.Express,
  method: 'get' | 'post',
  path: string,
  opts?: { body?: Record<string, unknown>; token?: string },
): Promise<{ status: number; body: Record<string, unknown>; text: string }> {
  const server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const headers: Record<string, string> = {};
    if (opts?.token) {
      headers['Authorization'] = `Bearer ${opts.token}`;
    }
    if (opts?.body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method.toUpperCase(),
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      // non-JSON response
    }
    return { status: res.status, body: json, text };
  } finally {
    server.close();
  }
}

/** Create a minimal mock zone room with admin methods. */
function createMockZoneRoom(overrides: {
  liveRooms?: import('@ellmud/shared').AdminLiveRoomInfo[];
  broadcastResult?: { success: boolean; error?: string };
  teleportResult?: { success: boolean; error?: string; roomName?: string };
  spawnResult?: { success: boolean; error?: string; creatureId?: string; creatureName?: string };
} = {}) {
  return {
    _mockName: 'zone',
    roomId: 'zone-room-1',
    state: {},
    clock: { running: true },
    clients: [],
    adminGetLiveRooms: vi.fn(() => overrides.liveRooms ?? []),
    adminBroadcastToRoom: vi.fn((_targetRoomId: string, _message: string, _type?: string) =>
      overrides.broadcastResult ?? { success: true },
    ),
    adminTeleportPlayer: vi.fn((_sessionId: string, _targetRoomId: string, _notify?: boolean) =>
      overrides.teleportResult ?? { success: true, roomName: 'Great Hall' },
    ),
    adminSpawnCreature: vi.fn((_template: unknown, _targetRoomId: string) =>
      overrides.spawnResult ?? { success: true, creatureId: 'creature-1', creatureName: 'Drowned Revenant' },
    ),
    getZoneSlug: vi.fn(() => 'crypt'),
  };
}

/** Create a mock content store with an optional creature template. */
function createMockContentStores(creatures?: Record<string, unknown>[]): Map<ContentEntityType, IContentStore<ContentEntity>> {
  const store: IContentStore<ContentEntity> = {
    entityType: 'creatures',
    getAll: async () => (creatures as ContentEntity[]) ?? [],
    getById: async (id: string) => (creatures ?? []).find((c) => (c as ContentEntity).id === id) as ContentEntity | undefined,
    create: async (e: ContentEntity) => e,
    update: async (_id: string, partial: Partial<ContentEntity>) => partial as ContentEntity,
    delete: async () => true,
  };
  return new Map([['creatures' as ContentEntityType, store]]);
}

// ─── Test Setup ─────────────────────────────────────────────────────────────

beforeEach(() => {
  process.env['ADMIN_TOKEN'] = TEST_TOKEN;
  mockRooms.clear();
});

afterEach(() => {
  delete process.env['ADMIN_TOKEN'];
  mockRooms.clear();
});

// ─── GET /admin/api/rooms/live ──────────────────────────────────────────────

describe('GET /admin/api/rooms/live', () => {
  it('returns empty list when no zone rooms are active', async () => {
    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/rooms/live', { token: TEST_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rooms');
    expect(res.body).toHaveProperty('totalPlayers');
    expect(res.body).toHaveProperty('totalCreatures');
    expect(res.body.rooms).toEqual([]);
    expect(res.body.totalPlayers).toBe(0);
    expect(res.body.totalCreatures).toBe(0);
  });

  it('returns live rooms with occupancy data from zone rooms', async () => {
    const mockRoom = createMockZoneRoom({
      liveRooms: [
        {
          roomId: 'room-a',
          roomName: 'Great Hall',
          roomType: 'chamber',
          playerCount: 2,
          creatureCount: 1,
          players: [
            { sessionId: 'p1', characterName: 'Drizzt' },
            { sessionId: 'p2', characterName: 'Bruenor' },
          ],
          creatures: [{ id: 'c1', name: 'Goblin', hp: 20, maxHp: 20 }],
        },
        {
          roomId: 'room-b',
          roomName: 'Dark Corridor',
          roomType: 'corridor',
          playerCount: 0,
          creatureCount: 0,
          players: [],
          creatures: [],
        },
      ],
    });
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/rooms/live', { token: TEST_TOKEN });

    expect(res.status).toBe(200);
    const body = res.body as { rooms: unknown[]; totalPlayers: number; totalCreatures: number };
    expect(body.rooms).toHaveLength(2);
    expect(body.totalPlayers).toBe(2);
    expect(body.totalCreatures).toBe(1);
    expect(mockRoom.adminGetLiveRooms).toHaveBeenCalledOnce();
  });

  it('includes persistent zone rooms (zone:<slug> names)', async () => {
    const mockRoom = createMockZoneRoom({
      liveRooms: [
        {
          roomId: 'crypt-room-a',
          roomName: 'Flooded Chamber',
          roomType: 'chamber',
          playerCount: 1,
          creatureCount: 0,
          players: [{ sessionId: 'p1', characterName: 'Drizzt' }],
          creatures: [],
        },
      ],
    });
    (mockRoom as Record<string, unknown>)._mockName = 'zone:flooded-crypt';
    mockRooms.set('zone-room-2', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/rooms/live', { token: TEST_TOKEN });

    expect(res.status).toBe(200);
    const body = res.body as { rooms: unknown[]; totalPlayers: number; totalCreatures: number };
    expect(body.rooms).toHaveLength(1);
    expect(body.totalPlayers).toBe(1);
    expect(mockRoom.adminGetLiveRooms).toHaveBeenCalledOnce();
  });

  it('skips non-zone rooms', async () => {
    const refugeRoom = { _mockName: 'refuge', roomId: 'refuge-1', state: {}, clock: { running: true }, clients: [] };
    mockRooms.set('refuge-1', refugeRoom);

    const app = createTestApp();
    const res = await request(app, 'get', '/admin/api/rooms/live', { token: TEST_TOKEN });

    expect(res.status).toBe(200);
    expect((res.body.rooms as unknown[]).length).toBe(0);
  });
});

// ─── POST /admin/api/rooms/:roomId/broadcast ────────────────────────────────

describe('POST /admin/api/rooms/:roomId/broadcast', () => {
  it('returns 404 when room does not exist', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/nonexistent/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'room-a', message: 'Hello!' },
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: {},
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('returns 400 for invalid message type', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'room-a', message: 'Hello!', type: 'invalid' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type must be/i);
  });

  it('returns 400 when message exceeds 500 characters', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'room-a', message: 'x'.repeat(501) },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/500 characters/i);
  });

  it('broadcasts message successfully', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'room-a', message: 'Server restarting in 5 minutes' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockRoom.adminBroadcastToRoom).toHaveBeenCalledWith('room-a', 'Server restarting in 5 minutes', 'system');
  });

  it('forwards admin broadcast type', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'room-a', message: 'Admin notice', type: 'admin' },
    });

    expect(res.status).toBe(200);
    expect(mockRoom.adminBroadcastToRoom).toHaveBeenCalledWith('room-a', 'Admin notice', 'admin');
  });

  it('returns 400 when zone room reports broadcast failure', async () => {
    const mockRoom = createMockZoneRoom({
      broadcastResult: { success: false, error: 'Room "bad-room" not found in zone graph' },
    });
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/broadcast', {
      token: TEST_TOKEN,
      body: { targetRoomId: 'bad-room', message: 'Hello' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found in zone graph/i);
  });
});

// ─── POST /admin/api/rooms/:roomId/teleport ─────────────────────────────────

describe('POST /admin/api/rooms/:roomId/teleport', () => {
  it('returns 404 when room does not exist', async () => {
    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/nonexistent/teleport', {
      token: TEST_TOKEN,
      body: { sessionId: 'player-1', targetRoomId: 'room-b' },
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/teleport', {
      token: TEST_TOKEN,
      body: {},
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('teleports player successfully', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/teleport', {
      token: TEST_TOKEN,
      body: { sessionId: 'player-1', targetRoomId: 'room-b' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Great Hall/);
    expect(mockRoom.adminTeleportPlayer).toHaveBeenCalledWith('player-1', 'room-b', true);
  });

  it('passes notify=false to zone room', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/teleport', {
      token: TEST_TOKEN,
      body: { sessionId: 'player-1', targetRoomId: 'room-b', notify: false },
    });

    expect(res.status).toBe(200);
    expect(mockRoom.adminTeleportPlayer).toHaveBeenCalledWith('player-1', 'room-b', false);
  });

  it('returns 400 when player is not found', async () => {
    const mockRoom = createMockZoneRoom({
      teleportResult: { success: false, error: 'Player "ghost" not found in this zone' },
    });
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/teleport', {
      token: TEST_TOKEN,
      body: { sessionId: 'ghost', targetRoomId: 'room-b' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when player is already in target room', async () => {
    const mockRoom = createMockZoneRoom({
      teleportResult: { success: false, error: 'Player is already in room "room-a"' },
    });
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp();
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/teleport', {
      token: TEST_TOKEN,
      body: { sessionId: 'player-1', targetRoomId: 'room-a' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already in room/i);
  });
});

// ─── POST /admin/api/rooms/:roomId/spawn-creature ───────────────────────────

describe('POST /admin/api/rooms/:roomId/spawn-creature', () => {
  // Use the flat ContentEntity shape returned by the real creature content store
  // (PgCreatureDefinitionsStore / InMemoryContentStore) — stats are top-level.
  const creatureTemplate = {
    id: 'drowned-revenant',
    type: 'drowned_revenant',
    name: 'Drowned Revenant',
    maxHp: 50,
    attack: 8,
    defence: 4,
    armour: 2,
    agility: 0,
    lootTable: [],
    minCount: 1,
    maxCount: 3,
    preferredRooms: [],
    forbiddenRooms: [],
    idleTicksMin: 3,
    idleTicksMax: 6,
    fleeThreshold: 0.2,
    aggressive: true,
  };

  it('returns 404 when room does not exist', async () => {
    const contentStores = createMockContentStores([creatureTemplate]);
    const app = createTestApp({ contentStores });
    const res = await request(app, 'post', '/admin/api/rooms/nonexistent/spawn-creature', {
      token: TEST_TOKEN,
      body: { templateId: 'drowned-revenant', targetRoomId: 'room-a' },
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when required fields are missing', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const contentStores = createMockContentStores([creatureTemplate]);
    const app = createTestApp({ contentStores });
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/spawn-creature', {
      token: TEST_TOKEN,
      body: {},
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/missing required fields/i);
  });

  it('returns 404 when creature template is not found', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const contentStores = createMockContentStores([]);
    const app = createTestApp({ contentStores });
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/spawn-creature', {
      token: TEST_TOKEN,
      body: { templateId: 'nonexistent', targetRoomId: 'room-a' },
    });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 500 when content store is not available', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const app = createTestApp(); // No contentStores
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/spawn-creature', {
      token: TEST_TOKEN,
      body: { templateId: 'drowned-revenant', targetRoomId: 'room-a' },
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/content store/i);
  });

  it('spawns creature successfully', async () => {
    const mockRoom = createMockZoneRoom();
    mockRooms.set('zone-room-1', mockRoom);

    const contentStores = createMockContentStores([creatureTemplate]);
    const app = createTestApp({ contentStores });
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/spawn-creature', {
      token: TEST_TOKEN,
      body: { templateId: 'drowned-revenant', targetRoomId: 'room-a' },
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.creatureId).toBe('creature-1');
    expect(res.body.creatureName).toBe('Drowned Revenant');
    expect(res.body.spawnRoomId).toBe('room-a');
    expect(mockRoom.adminSpawnCreature).toHaveBeenCalledOnce();
  });

  it('returns 400 when zone room reports spawn failure (bad target room)', async () => {
    const mockRoom = createMockZoneRoom({
      spawnResult: { success: false, error: 'Room "bad-room" not found in zone graph' },
    });
    mockRooms.set('zone-room-1', mockRoom);

    const contentStores = createMockContentStores([creatureTemplate]);
    const app = createTestApp({ contentStores });
    const res = await request(app, 'post', '/admin/api/rooms/zone-room-1/spawn-creature', {
      token: TEST_TOKEN,
      body: { templateId: 'drowned-revenant', targetRoomId: 'bad-room' },
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found in zone graph/i);
  });
});
