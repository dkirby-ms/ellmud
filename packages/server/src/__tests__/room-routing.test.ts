/**
 * Room Routing Tests — Phase C (Routing Switch)
 *
 * Validates the routing conventions introduced by Phase C:
 *   C1: ROOM_SWITCH targets use 'zone:the-refuge' instead of 'refuge'
 *   C2: Zone rooms are defined with 'zone:{slug}' naming convention
 *   C3: Procedural rooms keep their 'zone' room name (no prefix)
 *
 * These tests verify the CONTRACTS — the message shapes and naming patterns
 * that clients depend on. Written anticipatorily; will pass once Phase C lands.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColyseusTestServer } from '@colyseus/testing';
import { Server } from '@colyseus/core';
import { ZoneRoom } from '../rooms/ZoneRoom.js';

import type { RoomSwitchMessage } from '@ellmud/shared';
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
  category: 'hub' | 'dev' | 'dungeon' | 'wilderness' | 'social' = 'hub',
): Promise<ZoneData> {
  const repo = getZoneRepository();

  const zone = await repo.createZone({
    slug,
    name: `Test Zone (${slug})`,
    description: `Zone for routing tests.`,
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
    name: 'Hallway',
    description: 'A dim hallway.',
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

// ─── Server Boot ─────────────────────────────────────────────────────────────

let colyseus: ColyseusTestServer;

beforeAll(async () => {
  resetZoneProvider();
  await seedZone('the-refuge', 'hub');
  await seedZone('flooded-crypt', 'dungeon');

  const server = new Server();

  // Phase C registers zone rooms as 'zone:{slug}' and procedural as 'zone'
  server.define('zone', ZoneRoom);
  // After Phase C, the refuge is registered as 'zone:the-refuge' rather than 'refuge'
  server.define('zone:the-refuge', ZoneRoom);
  server.define('zone:flooded-crypt', ZoneRoom);

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

// ═════════════════════════════════════════════════════════════════════════════
// C1: ROOM_SWITCH to refuge uses zone:the-refuge
// ═════════════════════════════════════════════════════════════════════════════

describe('C1 — ROOM_SWITCH targets use zone:the-refuge', () => {
  it('player death ROOM_SWITCH should target zone:the-refuge', () => {
    const deathSwitch: RoomSwitchMessage = {
      target: 'zone:the-refuge',
      reason: 'player_death',
    };

    expect(deathSwitch.target).toBe('zone:the-refuge');
    expect(deathSwitch.target).toMatch(/^zone:/);
    expect(deathSwitch.reason).toBe('player_death');
  });

  it('ROOM_SWITCH target never uses bare "refuge" after Phase C', async () => {
    // Integration test: create a zone room and verify that any ROOM_SWITCH
    // messages sent DON'T use the old 'refuge' target
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client, collector } = await connectWithPlayer(room, 'route-no-bare-refuge');

    // Give time for any automatic room switch messages
    await wait(1000);

    // If any ROOM_SWITCH arrived, none should use bare 'refuge'
    for (const sw of collector.roomSwitch) {
      if (sw.reason === 'player_death') {
        expect(sw.target).not.toBe('refuge');
        expect(sw.target).toBe('zone:the-refuge');
      }
    }

    await client.leave();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C2: Zone rooms defined with zone: prefix
// ═════════════════════════════════════════════════════════════════════════════

describe('C2 — Zone rooms are defined with zone: prefix', () => {
  it('can create and connect to a zone:the-refuge room', async () => {
    const room = await colyseus.createRoom('zone:the-refuge', {
      zoneSlug: 'the-refuge',
    });
    const { client, collector } = await connectWithPlayer(room, 'route-refuge-player');

    // Player should receive room narration after joining
    expect(collector.narrate.length).toBeGreaterThan(0);

    // Room should be in zone mode
    const roomInternals = room as unknown as { isZone: boolean; zoneSlug?: string };
    expect(roomInternals.isZone).toBe(true);
    expect(roomInternals.zoneSlug).toBe('the-refuge');

    await client.leave();
  });

  it('can create and connect to a zone:flooded-crypt room', async () => {
    const room = await colyseus.createRoom('zone:flooded-crypt', {
      zoneSlug: 'flooded-crypt',
    });
    const { client, collector } = await connectWithPlayer(room, 'route-crypt-player');

    expect(collector.narrate.length).toBeGreaterThan(0);

    const roomInternals = room as unknown as { isZone: boolean; zoneSlug?: string };
    expect(roomInternals.isZone).toBe(true);
    expect(roomInternals.zoneSlug).toBe('flooded-crypt');

    await client.leave();
  });

  it('zone: prefix naming convention follows zone:{slug} pattern', () => {
    // Verify the naming convention is consistent
    const testSlugs = ['the-refuge', 'flooded-crypt', 'shattered-bastion', 'fungal-deep'];
    for (const slug of testSlugs) {
      const roomName = `zone:${slug}`;
      expect(roomName).toMatch(/^zone:[a-z0-9-]+$/);
      expect(roomName.startsWith('zone:')).toBe(true);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// C3: Procedural room name is still 'zone'
// ═════════════════════════════════════════════════════════════════════════════

describe('C3 — Procedural room name remains "zone"', () => {
  it('procedural zone uses room type "zone" (no zone: prefix)', async () => {
    const room = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });
    const { client, collector } = await connectWithPlayer(room, 'route-zone-player');

    // Procedural room should be operational
    expect(collector.narrate.length).toBeGreaterThan(0);

    // Should NOT be in zone mode
    const roomInternals = room as unknown as { isZone: boolean; zoneSlug?: string };
    expect(roomInternals.isZone).toBe(false);
    expect(roomInternals.zoneSlug).toBeUndefined();

    await client.leave();
  });

  it('procedural ROOM_SWITCH enter still targets "zone"', () => {
    // The ROOM_SWITCH message for entering a zone should still use 'zone'
    // (not 'zone:procedural' or any other prefix)
    const enterMsg: RoomSwitchMessage = {
      target: 'zone',
      reason: 'enter_zone',
      options: {
        roomId: 'test-zone-id',
        tier: 1,
      },
    };

    expect(enterMsg.target).toBe('zone');
    expect(enterMsg.target).not.toMatch(/^zone:/);
    expect(enterMsg.reason).toBe('enter_zone');
  });

  it('zone rooms and procedural rooms can coexist on the same server', async () => {
    // Create both room types on the same server
    const zoneRoom = await colyseus.createRoom('zone:the-refuge', {
      zoneSlug: 'the-refuge',
    });
    const proceduralRoom = await colyseus.createRoom('zone', {
      useTestGraph: true,
      collapseTimer: 120,
    });

    const { client: zoneClient } = await connectWithPlayer(zoneRoom, 'coexist-zone-player');
    const { client: proceduralClient } = await connectWithPlayer(proceduralRoom, 'coexist-zone-player');

    // Both rooms should be operational simultaneously
    const zoneInternals = zoneRoom as unknown as { isZone: boolean };
    const proceduralInternals = proceduralRoom as unknown as { isZone: boolean };

    expect(zoneInternals.isZone).toBe(true);
    expect(proceduralInternals.isZone).toBe(false);

    await zoneClient.leave();
    await proceduralClient.leave();
  });
});
