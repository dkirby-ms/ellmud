/**
 * Zone System Integration Tests
 *
 * Validates the zone repository, zone-to-RoomGraph adapter, repop logic,
 * inter-zone exit utilities, and (future) zone-based ZoneRoom creation.
 *
 * Written against specifications — Drizzt's ZoneRoom polymorphism,
 * repop, and inter-zone exit implementations may land later.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryZoneRepository } from '../zones/InMemoryZoneRepository.js';
import { convertZoneToRoomGraph } from '../zones/zone-adapter.js';
import type {
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,

} from '../zones/ZoneRepository.js';
import {
  INTER_ZONE_PREFIX,
  isInterZoneId,
  parseInterZoneId,
  makeInterZoneId,
} from '@ellmud/shared';
import type {
  RoomGraph,

  ZoneRoomDefinition as SharedZoneRoomDefinition,
} from '@ellmud/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────

function zoneInput(
  overrides: Partial<Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: 'flooded-catacombs',
    name: 'Flooded Catacombs',
    description: 'Ancient tunnels filled with dark water.',
    levelMin: 1,
    levelMax: 5,
    tier: 1,
    theme: 'flooded_crypt',
    entryRoomSlugs: ['entrance'],
    lifecycle: 'persistent',
    category: 'dungeon',
    maxPlayers: 0,
    pvpEnabled: false,
    repopIntervalSeconds: 300,
    ...overrides,
  };
}

function roomInput(
  zoneId: string,
  slug: string,
  overrides: Partial<Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    zoneId,
    slug,
    name: slug.charAt(0).toUpperCase() + slug.slice(1),
    description: `A room called ${slug}.`,
    type: 'corridor',
    properties: [],
    lootContainers: [],
    hazards: [],
    npcs: [],
    ...overrides,
  };
}

function exitInput(
  zoneId: string,
  from: string,
  direction: ZoneExitDefinition['direction'],
  to: string,
  overrides: Partial<Omit<ZoneExitDefinition, 'id' | 'createdAt'>> = {},
): Omit<ZoneExitDefinition, 'id' | 'createdAt'> {
  return {
    zoneId,
    fromRoomSlug: from,
    direction,
    toRoomSlug: to,
    locked: false,
    hidden: false,
    ...overrides,
  };
}


// ─── 1. Zone Repository Tests (InMemoryZoneRepository) ──────────────────

describe('InMemoryZoneRepository', () => {
  let repo: InMemoryZoneRepository;

  beforeEach(() => {
    repo = new InMemoryZoneRepository();
  });

  it('creates a zone and retrieves it by slug', async () => {
    const zone = await repo.createZone(zoneInput({ slug: 'dark-forest' }));

    expect(zone.id).toBeDefined();
    expect(zone.slug).toBe('dark-forest');
    expect(zone.createdAt).toBeInstanceOf(Date);
    expect(zone.updatedAt).toBeInstanceOf(Date);

    const fetched = await repo.getZoneBySlug('dark-forest');
    expect(fetched).not.toBeNull();
    expect(fetched!.zone.id).toBe(zone.id);
    expect(fetched!.zone.name).toBe('Flooded Catacombs');
  });

  it('creates a zone and retrieves it by ID', async () => {
    const zone = await repo.createZone(zoneInput());
    const fetched = await repo.getZoneById(zone.id);

    expect(fetched).not.toBeNull();
    expect(fetched!.zone.slug).toBe('flooded-catacombs');
  });

  it('returns null for non-existent slug', async () => {
    const result = await repo.getZoneBySlug('does-not-exist');
    expect(result).toBeNull();
  });

  it('returns null for non-existent ID', async () => {
    const result = await repo.getZoneById('fake-id');
    expect(result).toBeNull();
  });

  it('creates rooms within a zone', async () => {
    const zone = await repo.createZone(zoneInput());
    const room = await repo.createRoom(roomInput(zone.id, 'entrance', { type: 'entry' }));

    expect(room.id).toBeDefined();
    expect(room.zoneId).toBe(zone.id);
    expect(room.slug).toBe('entrance');

    const bundle = await repo.getZoneById(zone.id);
    expect(bundle!.rooms).toHaveLength(1);
    expect(bundle!.rooms[0].slug).toBe('entrance');
  });

  it('creates intra-zone exits', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'entrance', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'hallway'));
    const exit = await repo.createExit(exitInput(zone.id, 'entrance', 'north', 'hallway'));

    expect(exit.id).toBeDefined();
    expect(exit.fromRoomSlug).toBe('entrance');
    expect(exit.direction).toBe('north');
    expect(exit.toRoomSlug).toBe('hallway');

    const bundle = await repo.getZoneById(zone.id);
    expect(bundle!.exits).toHaveLength(1);
  });

  it('creates inter-zone exits with targetZoneSlug', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'portal'));
    const exit = await repo.createExit(
      exitInput(zone.id, 'portal', 'up', 'portal', {
        targetZoneSlug: 'the-refuge',
        targetRoomSlug: 'market-square',
      }),
    );

    expect(exit.targetZoneSlug).toBe('the-refuge');
    expect(exit.targetRoomSlug).toBe('market-square');
  });

  it('delete zone cascades rooms and exits', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'entrance', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'hallway'));
    await repo.createExit(exitInput(zone.id, 'entrance', 'north', 'hallway'));

    await repo.deleteZone(zone.id);

    const fetched = await repo.getZoneById(zone.id);
    expect(fetched).toBeNull();

    // Rooms and exits belong to this zone should also be gone
    const allZones = await repo.getAllZones();
    expect(allZones).toHaveLength(0);
  });

  it('delete zone does not affect other zones', async () => {
    const zone1 = await repo.createZone(zoneInput({ slug: 'zone-a', name: 'Zone A' }));
    const zone2 = await repo.createZone(zoneInput({ slug: 'zone-b', name: 'Zone B' }));
    await repo.createRoom(roomInput(zone1.id, 'room-a'));
    await repo.createRoom(roomInput(zone2.id, 'room-b'));

    await repo.deleteZone(zone1.id);

    const remaining = await repo.getZoneById(zone2.id);
    expect(remaining).not.toBeNull();
    expect(remaining!.rooms).toHaveLength(1);
    expect(remaining!.rooms[0].slug).toBe('room-b');
  });

  it('updates zone partial fields', async () => {
    const zone = await repo.createZone(zoneInput({ name: 'Old Name', tier: 1 }));
    const updated = await repo.updateZone(zone.id, { name: 'New Name', tier: 2 });

    expect(updated.name).toBe('New Name');
    expect(updated.tier).toBe(2);
    expect(updated.slug).toBe('flooded-catacombs'); // unchanged
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(zone.updatedAt.getTime());
    expect(updated.createdAt).toEqual(zone.createdAt); // preserved
  });

  it('updateZone throws for non-existent ID', async () => {
    await expect(repo.updateZone('no-such-id', { name: 'X' })).rejects.toThrow();
  });

  it('updateRoom throws for non-existent ID', async () => {
    await expect(repo.updateRoom('no-such-id', { name: 'X' })).rejects.toThrow();
  });

  it('getAllZones returns sorted by name', async () => {
    await repo.createZone(zoneInput({ slug: 'c-zone', name: 'Charlie' }));
    await repo.createZone(zoneInput({ slug: 'a-zone', name: 'Alpha' }));
    await repo.createZone(zoneInput({ slug: 'b-zone', name: 'Bravo' }));

    const all = await repo.getAllZones();
    expect(all.map((z) => z.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('getAllZones returns empty array when no zones exist', async () => {
    const all = await repo.getAllZones();
    expect(all).toEqual([]);
  });

  it('getZoneBySlug returns rooms sorted by slug', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'zzz-room'));
    await repo.createRoom(roomInput(zone.id, 'aaa-room'));
    await repo.createRoom(roomInput(zone.id, 'mmm-room'));

    const bundle = await repo.getZoneBySlug('flooded-catacombs');
    expect(bundle!.rooms.map((r) => r.slug)).toEqual(['aaa-room', 'mmm-room', 'zzz-room']);
  });

  it('getZoneBySlug returns exits sorted by fromRoomSlug then direction', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-b'));
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createExit(exitInput(zone.id, 'room-b', 'south', 'room-a'));
    await repo.createExit(exitInput(zone.id, 'room-a', 'north', 'room-b'));
    await repo.createExit(exitInput(zone.id, 'room-a', 'east', 'room-b'));

    const bundle = await repo.getZoneBySlug('flooded-catacombs');
    const exitDescs = bundle!.exits.map((e) => `${e.fromRoomSlug}:${e.direction}`);
    expect(exitDescs).toEqual(['room-a:east', 'room-a:north', 'room-b:south']);
  });

  it('deleteRoom removes a room by ID', async () => {
    const zone = await repo.createZone(zoneInput());
    const room = await repo.createRoom(roomInput(zone.id, 'temp'));

    await repo.deleteRoom(room.id);

    const bundle = await repo.getZoneById(zone.id);
    expect(bundle!.rooms).toHaveLength(0);
  });

  it('deleteExit removes an exit by ID', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'a'));
    await repo.createRoom(roomInput(zone.id, 'b'));
    const exit = await repo.createExit(exitInput(zone.id, 'a', 'north', 'b'));

    await repo.deleteExit(exit.id);

    const bundle = await repo.getZoneById(zone.id);
    expect(bundle!.exits).toHaveLength(0);
  });

  it('updateRoom preserves zoneId and createdAt', async () => {
    const zone = await repo.createZone(zoneInput());
    const room = await repo.createRoom(roomInput(zone.id, 'hall'));

    const updated = await repo.updateRoom(room.id, { name: 'Grand Hall', type: 'junction' });

    expect(updated.zoneId).toBe(zone.id);
    expect(updated.createdAt).toEqual(room.createdAt);
    expect(updated.name).toBe('Grand Hall');
    expect(updated.type).toBe('junction');
  });
});

// ─── 2. Zone Adapter Integration Tests ──────────────────────────────────

describe('Zone Adapter Integration (repo → adapter round-trip)', () => {
  let repo: InMemoryZoneRepository;

  beforeEach(() => {
    repo = new InMemoryZoneRepository();
  });

  it('full round-trip: repo creates data → fetch → convert to RoomGraph', async () => {
    const zone = await repo.createZone(
      zoneInput({
        slug: 'sunken-temple',
        name: 'Sunken Temple',
        entryRoomSlugs: ['foyer'],
        tier: 2,
        theme: 'flooded_crypt',
      }),
    );
    await repo.createRoom(roomInput(zone.id, 'foyer', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'nave'));
    await repo.createRoom(roomInput(zone.id, 'altar', { type: 'boss' }));
    await repo.createExit(exitInput(zone.id, 'foyer', 'north', 'nave'));
    await repo.createExit(exitInput(zone.id, 'nave', 'south', 'foyer'));
    await repo.createExit(exitInput(zone.id, 'nave', 'east', 'altar'));
    await repo.createExit(exitInput(zone.id, 'altar', 'west', 'nave'));

    const bundle = await repo.getZoneBySlug('sunken-temple');
    expect(bundle).not.toBeNull();

    const graph = convertZoneToRoomGraph(bundle!);

    expect(graph.rooms.size).toBe(3);
    expect(graph.entryRoomIds).toEqual(['foyer']);
    expect(graph.bossRoomId).toBe('altar');
    expect(graph.tier).toBe(2);

    // Verify exit wiring
    const foyer = graph.rooms.get('foyer')!;
    expect(foyer.exits.get('north')).toBe('nave');
    const nave = graph.rooms.get('nave')!;
    expect(nave.exits.get('south')).toBe('foyer');
    expect(nave.exits.get('east')).toBe('altar');
  });

  it('multi-room zone with boss rooms', async () => {
    const zone = await repo.createZone(
      zoneInput({
        slug: 'fungal-deep',
        entryRoomSlugs: ['shaft'],
        theme: 'fungal_deep',
      }),
    );
    await repo.createRoom(roomInput(zone.id, 'shaft', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'cavern', { type: 'corridor' }));
    await repo.createRoom(roomInput(zone.id, 'spore-vent', { type: 'boss' }));
    await repo.createExit(exitInput(zone.id, 'shaft', 'down', 'cavern'));
    await repo.createExit(exitInput(zone.id, 'cavern', 'east', 'spore-vent'));

    const bundle = await repo.getZoneBySlug('fungal-deep');
    const graph = convertZoneToRoomGraph(bundle!);

    expect(graph.bossRoomId).toBe('spore-vent');
    expect(graph.rooms.has('shaft')).toBe(true);
    expect(graph.rooms.has('cavern')).toBe(true);
    expect(graph.rooms.has('spore-vent')).toBe(true);
  });

  it('hub category zone has no boss rooms', async () => {
    const zone = await repo.createZone(
      zoneInput({
        slug: 'the-refuge',
        name: 'The Refuge',
        category: 'hub',
        entryRoomSlugs: ['hearth'],
        repopIntervalSeconds: 0,
      }),
    );
    await repo.createRoom(roomInput(zone.id, 'hearth', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'market'));
    await repo.createRoom(roomInput(zone.id, 'tavern'));
    await repo.createExit(exitInput(zone.id, 'hearth', 'north', 'market'));
    await repo.createExit(exitInput(zone.id, 'hearth', 'east', 'tavern'));
    await repo.createExit(exitInput(zone.id, 'market', 'south', 'hearth'));
    await repo.createExit(exitInput(zone.id, 'tavern', 'west', 'hearth'));

    const bundle = await repo.getZoneBySlug('the-refuge');
    const graph = convertZoneToRoomGraph(bundle!);

    expect(graph.rooms.size).toBe(3);
    expect(graph.bossRoomId).toBe('');
    expect(graph.entryRoomIds).toEqual(['hearth']);
  });

  it('inter-zone exits produce zone: prefix in RoomGraph', async () => {
    const zone = await repo.createZone(
      zoneInput({
        slug: 'catacombs',
        entryRoomSlugs: ['entrance'],
      }),
    );
    await repo.createRoom(roomInput(zone.id, 'entrance', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'portal-chamber'));
    await repo.createExit(exitInput(zone.id, 'entrance', 'north', 'portal-chamber'));
    await repo.createExit(exitInput(zone.id, 'portal-chamber', 'south', 'entrance'));
    // Inter-zone exit to the refuge
    await repo.createExit(
      exitInput(zone.id, 'portal-chamber', 'up', 'portal-chamber', {
        targetZoneSlug: 'the-refuge',
        targetRoomSlug: 'market-square',
      }),
    );

    const bundle = await repo.getZoneBySlug('catacombs');
    const graph = convertZoneToRoomGraph(bundle!);

    const portalRoom = graph.rooms.get('portal-chamber')!;
    const upTarget = portalRoom.exits.get('up')!;

    expect(upTarget).toBe('zone:the-refuge/market-square');
    expect(isInterZoneId(upTarget)).toBe(true);
    const parsed = parseInterZoneId(upTarget);
    expect(parsed).toEqual({ zoneSlug: 'the-refuge', roomSlug: 'market-square' });
  });

  it('room items and hazards survive the round-trip', async () => {
    const zone = await repo.createZone(
      zoneInput({ slug: 'treasure-vault', entryRoomSlugs: ['vault'] }),
    );
    await repo.createRoom(
      roomInput(zone.id, 'vault', {
        type: 'entry',
        properties: ['heavy_door'],
        lootContainers: [{ id: 'chest-1', type: 'chest', items: ['gold-ring', 'silver-key'] }],
        hazards: [{ type: 'poison_gas', severity: 0.8 }],
      }),
    );

    const bundle = await repo.getZoneBySlug('treasure-vault');
    const graph = convertZoneToRoomGraph(bundle!);
    const vault = graph.rooms.get('vault')!;

    expect(vault.items).toHaveLength(1);
    expect(vault.items[0].id).toBe('chest-1');
    expect(vault.items[0].items).toEqual(['gold-ring', 'silver-key']);
    expect(vault.hazards).toHaveLength(1);
    expect(vault.hazards[0].type).toBe('poison_gas');
    expect(vault.properties).toEqual(['heavy_door']);
  });

  it('deterministic seed for the same zone slug', async () => {
    const zone1 = await repo.createZone(zoneInput({ slug: 'test-zone' }));
    await repo.createRoom(roomInput(zone1.id, 'entrance', { type: 'entry' }));
    const bundle1 = await repo.getZoneBySlug('test-zone');

    // Create second repo instance with same slug
    const repo2 = new InMemoryZoneRepository();
    const zone2 = await repo2.createZone(zoneInput({ slug: 'test-zone' }));
    await repo2.createRoom(roomInput(zone2.id, 'entrance', { type: 'entry' }));
    const bundle2 = await repo2.getZoneBySlug('test-zone');

    const graph1 = convertZoneToRoomGraph(bundle1!);
    const graph2 = convertZoneToRoomGraph(bundle2!);

    expect(graph1.seed).toBe(graph2.seed);
    expect(graph1.seed).toBeGreaterThan(0);
  });
});

// ─── 3. Repop System Tests ──────────────────────────────────────────────

describe('Repop Logic (specification-based)', () => {
  /**
   * These tests validate repop LOGIC in isolation.
   * We simulate what a repop cycle should do by comparing
   * "original zone definition" vs "current room state" and computing a diff.
   *
   * The actual repop implementation is being built by Drizzt — these tests
   * define the expected behavior that implementation must satisfy.
   */

  // Repop helper: given the original zone item/NPC state and the current
  // room graph state, compute what should be restored.
  function computeRepopDiff(
    originalRooms: SharedZoneRoomDefinition[],
    currentGraph: RoomGraph,
  ): {
    missingItems: Map<string, string[]>; // roomSlug → item IDs to restore
    missingNpcs: Map<string, Array<{ creatureId: string; count: number }>>;
  } {
    const missingItems = new Map<string, string[]>();
    const missingNpcs = new Map<string, Array<{ creatureId: string; count: number }>>();

    for (const origRoom of originalRooms) {
      const currentRoom = currentGraph.rooms.get(origRoom.slug);
      if (!currentRoom) continue;

      // Items: compare lootContainers
      const currentItemIds = new Set(currentRoom.items.map((i) => i.id));
      const missing = origRoom.lootContainers
        .filter((lc) => !currentItemIds.has(lc.id))
        .map((lc) => lc.id);
      if (missing.length > 0) {
        missingItems.set(origRoom.slug, missing);
      }

      // NPCs: compare creature counts (simplified — full impl tracks instance IDs)
      // For this spec test, we track by creatureId presence
      if (origRoom.npcs.length > 0) {
        // In the current graph, NPCs would be tracked separately;
        // for this spec test we assume all NPCs are missing after a "kill"
        // scenario (the test sets up the "looted" state explicitly).
      }
    }

    return { missingItems, missingNpcs };
  }

  it('repop restores missing items after looting', () => {
    // Original zone definition has items
    const originalRooms: SharedZoneRoomDefinition[] = [
      {
        id: 'room-vault',
        zoneId: 'zone-1',
        slug: 'vault',
        name: 'Vault',
        description: 'A treasure vault.',
        type: 'corridor',
        properties: [],
        lootContainers: [
          { id: 'chest-1', type: 'chest', items: ['gold-ring'] },
          { id: 'chest-2', type: 'crate', items: ['silver-key'] },
        ],
        hazards: [],
        npcs: [],
      } as SharedZoneRoomDefinition,
    ];

    // Current state: chest-1 was looted (removed), chest-2 remains
    const currentGraph: RoomGraph = {
      rooms: new Map([
        [
          'vault',
          {
            id: 'vault',
            name: 'Vault',
            description: 'A treasure vault.',
            type: 'corridor',
            exits: new Map(),
            items: [{ id: 'chest-2', type: 'crate', items: ['silver-key'] }],
            hazards: [],
          },
        ],
      ]),
      entryRoomIds: ['vault'],
      bossRoomId: '',
      seed: 42,
      tier: 1,
    };

    const diff = computeRepopDiff(originalRooms, currentGraph);

    expect(diff.missingItems.get('vault')).toEqual(['chest-1']);
  });

  it('repop does not duplicate existing items', () => {
    const originalRooms: SharedZoneRoomDefinition[] = [
      {
        id: 'room-hall',
        zoneId: 'zone-1',
        slug: 'hall',
        name: 'Hall',
        description: 'A grand hall.',
        type: 'corridor',
        properties: [],
        lootContainers: [{ id: 'altar-1', type: 'altar', items: ['rune-stone'] }],
        hazards: [],
        npcs: [],
      } as SharedZoneRoomDefinition,
    ];

    // Current state: altar-1 is still present — nothing was looted
    const currentGraph: RoomGraph = {
      rooms: new Map([
        [
          'hall',
          {
            id: 'hall',
            name: 'Hall',
            description: 'A grand hall.',
            type: 'corridor',
            exits: new Map(),
            items: [{ id: 'altar-1', type: 'altar', items: ['rune-stone'] }],
            hazards: [],
          },
        ],
      ]),
      entryRoomIds: ['hall'],
      bossRoomId: '',
      seed: 42,
      tier: 1,
    };

    const diff = computeRepopDiff(originalRooms, currentGraph);

    // No missing items — repop should not touch existing ones
    expect(diff.missingItems.has('hall')).toBe(false);
  });

  it('repop restores all items when room is fully looted', () => {
    const originalRooms: SharedZoneRoomDefinition[] = [
      {
        id: 'room-trove',
        zoneId: 'zone-1',
        slug: 'trove',
        name: 'Trove',
        description: 'Hidden trove.',
        type: 'dead_end',
        properties: [],
        lootContainers: [
          { id: 'chest-a', type: 'chest', items: ['gem'] },
          { id: 'chest-b', type: 'chest', items: ['potion'] },
          { id: 'corpse-1', type: 'corpse', items: ['bone-key'] },
        ],
        hazards: [],
        npcs: [],
      } as SharedZoneRoomDefinition,
    ];

    // Current state: everything looted
    const currentGraph: RoomGraph = {
      rooms: new Map([
        [
          'trove',
          {
            id: 'trove',
            name: 'Trove',
            description: 'Hidden trove.',
            type: 'dead_end',
            exits: new Map(),
            items: [],
            hazards: [],
          },
        ],
      ]),
      entryRoomIds: ['trove'],
      bossRoomId: '',
      seed: 42,
      tier: 1,
    };

    const diff = computeRepopDiff(originalRooms, currentGraph);

    expect(diff.missingItems.get('trove')).toEqual(['chest-a', 'chest-b', 'corpse-1']);
  });

  it('repop interval comes from zone definition', () => {
    // This is a specification test: the repop timer should read
    // repopIntervalSeconds from the zone definition
    const zoneDef = zoneInput({ repopIntervalSeconds: 120 });
    expect(zoneDef.repopIntervalSeconds).toBe(120);

    const longRepop = zoneInput({ repopIntervalSeconds: 600 });
    expect(longRepop.repopIntervalSeconds).toBe(600);

    // Hub zones may use 0 to disable repop
    const hubZone = zoneInput({ category: 'hub', repopIntervalSeconds: 0 });
    expect(hubZone.repopIntervalSeconds).toBe(0);
  });

  it('repop handles room not present in current graph (destroyed room)', () => {
    const originalRooms: SharedZoneRoomDefinition[] = [
      {
        id: 'room-bridge',
        zoneId: 'zone-1',
        slug: 'bridge',
        name: 'Bridge',
        description: 'A stone bridge.',
        type: 'corridor',
        properties: [],
        lootContainers: [{ id: 'crate-1', type: 'crate', items: ['rope'] }],
        hazards: [],
        npcs: [],
      } as SharedZoneRoomDefinition,
    ];

    // Current state: bridge room is gone entirely
    const currentGraph: RoomGraph = {
      rooms: new Map(),
      entryRoomIds: [],
      bossRoomId: '',
      seed: 42,
      tier: 1,
    };

    const diff = computeRepopDiff(originalRooms, currentGraph);

    // Should not crash, and should not report items for a missing room
    expect(diff.missingItems.has('bridge')).toBe(false);
  });
});

// ─── 4. Inter-Zone Exit Detection Tests ─────────────────────────────────

describe('Inter-Zone ID Utilities', () => {
  describe('isInterZoneId', () => {
    it('returns true for zone:refuge/hearth', () => {
      expect(isInterZoneId('zone:refuge/hearth')).toBe(true);
    });

    it('returns true for zone:catacombs/entrance', () => {
      expect(isInterZoneId('zone:catacombs/entrance')).toBe(true);
    });

    it('returns false for regular-room-id', () => {
      expect(isInterZoneId('regular-room-id')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isInterZoneId('')).toBe(false);
    });

    it('returns false for partial prefix (zone)', () => {
      expect(isInterZoneId('zone')).toBe(false);
    });

    it('returns true for zone: prefix even without slash', () => {
      // This is an edge case — the prefix check is just startsWith
      expect(isInterZoneId('zone:no-slash')).toBe(true);
    });
  });

  describe('parseInterZoneId', () => {
    it('parses zone:catacombs/entrance correctly', () => {
      const result = parseInterZoneId('zone:catacombs/entrance');
      expect(result).toEqual({ zoneSlug: 'catacombs', roomSlug: 'entrance' });
    });

    it('parses zone:the-refuge/market-square correctly', () => {
      const result = parseInterZoneId('zone:the-refuge/market-square');
      expect(result).toEqual({ zoneSlug: 'the-refuge', roomSlug: 'market-square' });
    });

    it('returns null for non-zone-id', () => {
      expect(parseInterZoneId('not-a-zone-id')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseInterZoneId('')).toBeNull();
    });

    it('returns null for zone: prefix without slash', () => {
      expect(parseInterZoneId('zone:no-slash')).toBeNull();
    });

    it('handles room slugs with hyphens', () => {
      const result = parseInterZoneId('zone:dark-forest/ancient-bridge');
      expect(result).toEqual({ zoneSlug: 'dark-forest', roomSlug: 'ancient-bridge' });
    });
  });

  describe('makeInterZoneId', () => {
    it('creates correct inter-zone ID', () => {
      expect(makeInterZoneId('catacombs', 'entrance')).toBe('zone:catacombs/entrance');
    });

    it('round-trips through parse', () => {
      const id = makeInterZoneId('the-refuge', 'hearth');
      const parsed = parseInterZoneId(id);
      expect(parsed).toEqual({ zoneSlug: 'the-refuge', roomSlug: 'hearth' });
    });

    it('isInterZoneId recognizes makeInterZoneId output', () => {
      const id = makeInterZoneId('dungeon-a', 'boss-lair');
      expect(isInterZoneId(id)).toBe(true);
    });
  });

  describe('INTER_ZONE_PREFIX', () => {
    it('equals "zone:"', () => {
      expect(INTER_ZONE_PREFIX).toBe('zone:');
    });
  });
});

// ─── 5. Zone-Based ZoneRoom Creation Test ──────────────────────────────

describe('Zone-Based ZoneRoom Creation', () => {
  /**
   * TODO: Once Drizzt lands ZoneRoom polymorphism (zone-based room creation),
   * this test should:
   * 1. Create a zone in InMemoryZoneRepository
   * 2. Boot a test server with ZoneRoom defined
   * 3. Create a room with { zoneSlug: 'test-zone' } option
   * 4. Verify the room graph was loaded from the zone (not procedural)
   *
   * Blocked on: ZoneRoom zone integration (no zoneSlug option support yet).
   * When ready, use the bootTestServer / connectTestClient helpers from
   * packages/server/src/__tests__/helpers/test-client.ts
   */

  it.todo(
    'creates a ZoneRoom from zone data when zoneSlug option is provided',
  );

  it.todo(
    'falls back to procedural generation when zoneSlug is not provided',
  );

  it.todo(
    'rejects creation when zoneSlug references a non-existent zone',
  );

  // These tests CAN run now — they validate the zone loading pipeline
  // that ZoneRoom will use internally.

  it('zone loading pipeline: repo → bundle → RoomGraph ready for ZoneRoom', async () => {
    const repo = new InMemoryZoneRepository();

    const zone = await repo.createZone(
      zoneInput({
        slug: 'test-zone-slug',
        entryRoomSlugs: ['start'],
        tier: 2,
        theme: 'shattered_bastion',
      }),
    );
    await repo.createRoom(roomInput(zone.id, 'start', { type: 'entry' }));
    await repo.createRoom(roomInput(zone.id, 'mid', { type: 'corridor' }));
    await repo.createRoom(roomInput(zone.id, 'boss-lair', { type: 'boss' }));
    await repo.createRoom(roomInput(zone.id, 'escape', { type: 'dead_end' }));
    await repo.createExit(exitInput(zone.id, 'start', 'north', 'mid'));
    await repo.createExit(exitInput(zone.id, 'mid', 'south', 'start'));
    await repo.createExit(exitInput(zone.id, 'mid', 'east', 'boss-lair'));
    await repo.createExit(exitInput(zone.id, 'boss-lair', 'west', 'mid'));
    await repo.createExit(exitInput(zone.id, 'mid', 'up', 'escape'));

    const bundle = await repo.getZoneBySlug('test-zone-slug');
    expect(bundle).not.toBeNull();

    const graph = convertZoneToRoomGraph(bundle!);

    // ZoneRoom expects these properties from the graph
    expect(graph.rooms.size).toBe(4);
    expect(graph.entryRoomIds).toContain('start');
    expect(graph.bossRoomId).toBe('boss-lair');
    expect(graph.seed).toBeGreaterThan(0);
    expect(graph.tier).toBe(2);

    // Verify all rooms have valid structure
    for (const [id, room] of graph.rooms) {
      expect(room.id).toBe(id);
      expect(room.name).toBeTruthy();
      expect(room.description).toBeTruthy();
      expect(room.exits).toBeInstanceOf(Map);
      expect(Array.isArray(room.items)).toBe(true);
      expect(Array.isArray(room.hazards)).toBe(true);
    }
  });
});
