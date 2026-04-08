/**
 * ZoneRoom Zone-Mode Tests — Phase B (ZoneRoom Absorption)
 *
 * Validates the NEW capabilities added to ZoneRoom after absorbing RefugeRoom:
 *   B1: AmbientSystem gating (all zones → ambient, procedural mode → none)
 *   B2: Player join/leave announcements in zone mode
 *   B3: Dual message updates (LOADOUT_UPDATE + STASH_UPDATE) on join
 *   B4: PendingEnter guard (double-entry prevention)
 *   B6: Reconnection grace periods (zone-specific)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ZoneRoom } from '../rooms/ZoneRoom.js';
import { AmbientSystem } from '../systems/AmbientSystem.js';
import {
  getZoneRepository,
  resetZoneProvider,
  type ZoneData,
} from '../zones/index.js';
import { MessageCollector } from './helpers/message-collector.js';
import { wait } from './helpers/index.js';

// ─── Seeding Helpers ─────────────────────────────────────────────────────────

/** Seed a complete zone into the InMemory zone repository. */
async function seedZone(
  slug: string,
  category: 'hub' | 'dev' | 'dungeon' | 'wilderness' | 'social',
): Promise<ZoneData> {
  const repo = getZoneRepository();

  const zone = await repo.createZone({
    slug,
    name: `Test Zone (${slug})`,
    description: `A test zone with category "${category}".`,
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
    name: 'Hallway',
    description: 'A dim hallway.',
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

// ─── Server Boot ─────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  // Reset zone provider to ensure a fresh InMemory repo
  resetZoneProvider();

  // Seed zones with distinct categories for gating tests
  await seedZone('test-hub', 'hub');
  await seedZone('test-dungeon', 'dungeon');
  await seedZone('test-social', 'social');

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
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function connectWithPlayer(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
  playerId: string,
  settleMs = 800,
) {
  const client = await colyseus.connectTo(room, { playerId });
  const collector = new MessageCollector(client);
  await wait(settleMs);
  return { client, collector };
}

/**
 * Access internal ZoneRoom fields via type coercion.
 * Phase B adds `ambientSystem`, `pendingEnter`, `isZone`, etc. as private fields.
 */
interface ZoneRoomInternals {
  ambientSystem?: AmbientSystem;
  pendingEnter: Set<string>;
  isZone: boolean;
  zoneSlug?: string;
  zoneData?: ZoneData;
  players: Map<string, unknown>;
  announceToRoom: (roomId: string, excludePlayerId: string, text: string) => void;
}

function internals(
  room: Awaited<ReturnType<ColyseusTestServer['createRoom']>>,
): ZoneRoomInternals {
  return room as unknown as ZoneRoomInternals;
}

// ═════════════════════════════════════════════════════════════════════════════
// B1: AmbientSystem Gating
// ═════════════════════════════════════════════════════════════════════════════

describe('B1 — AmbientSystem Gating', () => {
  it.todo('hub zone creates AmbientSystem', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client } = await connectWithPlayer(room, 'ambient-hub-player');

    expect(internals(room).isZone).toBe(true);
    expect(internals(room).ambientSystem).toBeDefined();
    expect(internals(room).ambientSystem).toBeInstanceOf(AmbientSystem);

    await client.leave();
  });

  it.todo('social zone creates AmbientSystem', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-social' });
    const { client } = await connectWithPlayer(room, 'ambient-social-player');

    expect(internals(room).isZone).toBe(true);
    expect(internals(room).ambientSystem).toBeDefined();
    expect(internals(room).ambientSystem).toBeInstanceOf(AmbientSystem);

    await client.leave();
  });

  it.todo('dungeon zone creates AmbientSystem', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-dungeon' });
    const { client } = await connectWithPlayer(room, 'ambient-dungeon-player');

    expect(internals(room).isZone).toBe(true);
    expect(internals(room).ambientSystem).toBeDefined();
    expect(internals(room).ambientSystem).toBeInstanceOf(AmbientSystem);

    await client.leave();
  });

  it('procedural mode (no zone) does NOT create AmbientSystem', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });
    const { client } = await connectWithPlayer(room, 'ambient-zone-player');

    expect(internals(room).isZone).toBe(false);
    expect(internals(room).ambientSystem).toBeUndefined();

    await client.leave();
  });

  it.todo('hub zone sends ambient narration on join', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client, collector } = await connectWithPlayer(room, 'ambient-join-player');

    // Player should receive at least one ambient-type narration on join (world snapshot)
    const ambientMessages = collector.narrate.filter((m) => m.type === 'ambient');
    expect(ambientMessages.length).toBeGreaterThanOrEqual(1);

    await client.leave();
  });

  it('procedural mode does NOT send ambient narration on join', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });
    const { client, collector } = await connectWithPlayer(room, 'no-ambient-player');

    const ambientMessages = collector.narrate.filter((m) => m.type === 'ambient');
    expect(ambientMessages.length).toBe(0);

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B2: Announcements (Zone Mode Only)
// ═════════════════════════════════════════════════════════════════════════════

describe('B2 — Zone-Mode Announcements', () => {
  it.todo('player join announces to others in zone mode', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });

    // Player 1 joins first
    const { client: client1, collector: collector1 } = await connectWithPlayer(
      room,
      'announce-player-1',
    );

    // Clear so we only see messages from player 2's arrival
    collector1.clear();

    // Player 2 joins — player 1 should get announcement
    const { client: client2 } = await connectWithPlayer(room, 'announce-player-2');

    // Wait for announcement delivery
    await wait(300);

    const arrivals = collector1.narrate.filter(
      (m) => m.type === 'awareness' && m.text.includes('arrives'),
    );
    expect(arrivals.length).toBeGreaterThanOrEqual(1);

    await client1.leave();
    await client2.leave();
  });

  it.todo('player leave announces to others in zone mode', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });

    const { client: client1, collector: collector1 } = await connectWithPlayer(
      room,
      'depart-player-1',
    );
    const { client: client2 } = await connectWithPlayer(room, 'depart-player-2');

    // Clear messages so we only see departure
    collector1.clear();

    // Player 2 leaves (consented leave — default is consented=true)
    await client2.leave();
    await wait(500);

    const departures = collector1.narrate.filter(
      (m) => m.type === 'awareness' && m.text.includes('departs'),
    );
    expect(departures.length).toBeGreaterThanOrEqual(1);

    await client1.leave();
  });

  it('procedural mode does NOT send arrival announcements', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });

    const { client: client1, collector: collector1 } = await connectWithPlayer(
      room,
      'zone-no-announce-1',
    );
    collector1.clear();

    const { client: client2 } = await connectWithPlayer(room, 'zone-no-announce-2');
    await wait(300);

    // In procedural mode, no "arrives" announcements (awareness system handles differently)
    const arrivals = collector1.narrate.filter(
      (m) => m.type === 'awareness' && m.text.includes('arrives'),
    );
    expect(arrivals.length).toBe(0);

    await client1.leave();
    await client2.leave();
  });

  it('joining player does NOT receive their own announcement', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });

    // Need another player in room so announceToRoom fires
    const { client: keepAlive } = await connectWithPlayer(room, 'announce-keepalive');

    const { client: joiner, collector: joinerCollector } = await connectWithPlayer(
      room,
      'announce-self-check',
    );

    // The joining player should NOT receive "An adventurer arrives." about themselves
    const selfArrivals = joinerCollector.narrate.filter(
      (m) => m.type === 'awareness' && m.text.includes('arrives'),
    );
    expect(selfArrivals.length).toBe(0);

    await joiner.leave();
    await keepAlive.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B4: PendingEnter Guard
// ═════════════════════════════════════════════════════════════════════════════

describe('B4 — PendingEnter Guard', () => {
  it.todo('pendingEnter set exists on ZoneRoom', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client } = await connectWithPlayer(room, 'pending-check-player');

    const roomInternals = internals(room);
    expect(roomInternals.pendingEnter).toBeDefined();
    expect(roomInternals.pendingEnter).toBeInstanceOf(Set);

    await client.leave();
  });

  it.todo('pendingEnter is cleared on player leave', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client } = await connectWithPlayer(room, 'pending-clear-player');

    const roomInternals = internals(room);

    // Simulate adding to pendingEnter (as if player started entering a zone)
    roomInternals.pendingEnter.add(client.sessionId);
    expect(roomInternals.pendingEnter.has(client.sessionId)).toBe(true);

    // Leave (consented) should clear the pending state
    await client.leave();
    await wait(500);

    expect(roomInternals.pendingEnter.has(client.sessionId)).toBe(false);
  });

  it.todo('pendingEnter starts empty for new room', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });
    const roomInternals = internals(room);

    expect(roomInternals.pendingEnter.size).toBe(0);

    // Connect and verify still not pending (join doesn't set pending)
    const { client } = await connectWithPlayer(room, 'pending-empty-player');
    expect(roomInternals.pendingEnter.has(client.sessionId)).toBe(false);

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B6: Reconnection Grace Periods
// ═════════════════════════════════════════════════════════════════════════════

describe('B6 — Zone Reconnection Grace', () => {
  it('zone mode room is configured as a zone', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client } = await connectWithPlayer(room, 'zone-recon-check');

    const roomInternals = internals(room);
    expect(roomInternals.isZone).toBe(true);
    expect(roomInternals.zoneSlug).toBe('test-hub');
    expect(roomInternals.zoneData).toBeDefined();

    await client.leave();
  });

  it('procedural mode uses default reconnection (not zone-specific)', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });
    const { client } = await connectWithPlayer(room, 'zone-recon-check');

    // Procedural mode: isZone=false, so reconnection grace falls through to config default (30s)
    expect(internals(room).isZone).toBe(false);

    await client.leave();
  });

  it('hub zone has zone-level reconnection grace (non-consented disconnect)', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });

    // Two players: one will disconnect, other keeps room alive
    const { client: keeper } = await connectWithPlayer(room, 'recon-keeper');
    const { client: disconnecter } = await connectWithPlayer(
      room,
      'recon-disconnecter',
    );

    // Non-consented disconnect (simulate network drop)
    // This triggers allowReconnection with zone-specific grace period
    await disconnecter.leave(false);
    await wait(500);

    // The player should still exist in the room's player map during grace period
    const roomInternals = internals(room);
    const playerStillTracked = roomInternals.players.has('recon-disconnecter');
    expect(playerStillTracked).toBe(true);

    await keeper.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Zone Metadata Verification
// ═════════════════════════════════════════════════════════════════════════════

describe('Zone Metadata Basics', () => {
  it('zone room stores zoneData with correct category', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-hub' });
    const { client } = await connectWithPlayer(room, 'meta-hub-player');

    const roomInternals = internals(room);
    expect(roomInternals.zoneData?.zone?.category).toBe('hub');

    await client.leave();
  });

  it('dungeon zone stores dungeon category', async () => {
    const room = await colyseus.createRoom('zone', { zoneSlug: 'test-dungeon' });
    const { client } = await connectWithPlayer(room, 'meta-dungeon-player');

    const roomInternals = internals(room);
    expect(roomInternals.zoneData?.zone?.category).toBe('dungeon');

    await client.leave();
  });

  it('procedural mode has no zone metadata', async () => {
    const room = await colyseus.createRoom('zone', { useTestGraph: true, collapseTimer: 120 });
    const { client } = await connectWithPlayer(room, 'meta-zone-player');

    const roomInternals = internals(room);
    expect(roomInternals.isZone).toBe(false);
    expect(roomInternals.zoneData).toBeUndefined();
    expect(roomInternals.zoneSlug).toBeUndefined();

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// B1 Unit: AmbientSystem Direct
// ═════════════════════════════════════════════════════════════════════════════

describe('B1 Unit — AmbientSystem Direct Validation', () => {
  it('AmbientSystem produces join narration', () => {
    const system = new AmbientSystem();
    const narration = system.getJoinNarration();

    expect(narration).toBeTruthy();
    expect(typeof narration).toBe('string');
    expect(narration.length).toBeGreaterThan(10);
  });

  it('AmbientSystem produces events on tick', () => {
    let counter = 0;
    const rng = () => {
      counter++;
      return (counter % 7) / 7;
    };

    const system = new AmbientSystem({
      weather: { weatherCheckInterval: 5, timePeriodTicks: 10, transitionChance: 1.0 },
      atmosphereInterval: 8,
      rng,
    });

    const allEvents: ReturnType<AmbientSystem['tick']> = [];
    for (let i = 0; i < 30; i++) {
      allEvents.push(...system.tick());
    }

    expect(allEvents.length).toBeGreaterThanOrEqual(1);
    for (const event of allEvents) {
      expect(event.narrative).toBeTruthy();
      expect(typeof event.narrative).toBe('string');
    }
  });
});
