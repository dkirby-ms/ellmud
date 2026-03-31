import { describe, it, expect } from 'vitest';
import { convertZoneToRoomGraph } from '../zones/zone-adapter.js';
import type {
  ZoneData,
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
} from '@ellmud/shared';
import { INTER_ZONE_PREFIX, isInterZoneId, parseInterZoneId } from '@ellmud/shared';

// ─── Test Helpers ─────────────────────────────────────────────────────────

function makeZone(overrides: Partial<ZoneDefinition> = {}): ZoneDefinition {
  return {
    id: 'zone-1',
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

function makeRoom(
  slug: string,
  overrides: Partial<ZoneRoomDefinition> = {},
): ZoneRoomDefinition {
  return {
    id: `room-${slug}`,
    zoneId: 'zone-1',
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

function makeExit(
  from: string,
  direction: ZoneExitDefinition['direction'],
  to: string,
  overrides: Partial<ZoneExitDefinition> = {},
): ZoneExitDefinition {
  return {
    id: `exit-${from}-${direction}`,
    zoneId: 'zone-1',
    fromRoomSlug: from,
    direction,
    toRoomSlug: to,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('convertZoneToRoomGraph', () => {
  it('converts a 3-room zone with bidirectional exits', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['entrance'] }),
      rooms: [
        makeRoom('entrance', { type: 'entry' }),
        makeRoom('hallway'),
        makeRoom('chamber'),
      ],
      exits: [
        makeExit('entrance', 'north', 'hallway'),
        makeExit('hallway', 'south', 'entrance'),
        makeExit('hallway', 'east', 'chamber'),
        makeExit('chamber', 'west', 'hallway'),
      ],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.rooms.size).toBe(3);
    expect(graph.rooms.has('entrance')).toBe(true);
    expect(graph.rooms.has('hallway')).toBe(true);
    expect(graph.rooms.has('chamber')).toBe(true);

    // Check bidirectional exits
    const entrance = graph.rooms.get('entrance')!;
    expect(entrance.exits.get('north')).toBe('hallway');

    const hallway = graph.rooms.get('hallway')!;
    expect(hallway.exits.get('south')).toBe('entrance');
    expect(hallway.exits.get('east')).toBe('chamber');

    const chamber = graph.rooms.get('chamber')!;
    expect(chamber.exits.get('west')).toBe('hallway');
  });

  it('identifies entry rooms from entryRoomSlugs', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['north-gate', 'south-gate'] }),
      rooms: [
        makeRoom('north-gate', { type: 'entry' }),
        makeRoom('south-gate', { type: 'entry' }),
        makeRoom('courtyard'),
      ],
      exits: [
        makeExit('north-gate', 'south', 'courtyard'),
        makeExit('south-gate', 'north', 'courtyard'),
      ],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.entryRoomIds).toEqual(['north-gate', 'south-gate']);
  });

  it('identifies the boss room by type', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['start'] }),
      rooms: [
        makeRoom('start', { type: 'entry' }),
        makeRoom('lair', { type: 'boss' }),
      ],
      exits: [
        makeExit('start', 'north', 'lair'),
        makeExit('lair', 'south', 'start'),
      ],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.bossRoomId).toBe('lair');
  });

  it('sets bossRoomId to empty string when no boss room exists', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['tavern'] }),
      rooms: [makeRoom('tavern', { type: 'entry' })],
      exits: [],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.bossRoomId).toBe('');
  });

  it('handles inter-zone exits with zone: prefix', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ slug: 'catacombs', entryRoomSlugs: ['entrance'] }),
      rooms: [
        makeRoom('entrance', { type: 'entry' }),
        makeRoom('portal-room'),
      ],
      exits: [
        makeExit('entrance', 'north', 'portal-room'),
        makeExit('portal-room', 'south', 'entrance'),
        // Inter-zone exit to the refuge
        makeExit('portal-room', 'up', 'portal-room', {
          targetZoneSlug: 'the-refuge',
          targetRoomSlug: 'market-square',
        }),
      ],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    const portalRoom = graph.rooms.get('portal-room')!;
    const upTarget = portalRoom.exits.get('up')!;

    expect(upTarget.startsWith(INTER_ZONE_PREFIX)).toBe(true);
    expect(isInterZoneId(upTarget)).toBe(true);

    const parsed = parseInterZoneId(upTarget);
    expect(parsed).toEqual({ zoneSlug: 'the-refuge', roomSlug: 'market-square' });
  });

  it('handles a single room with no exits', () => {
    const zoneData: ZoneData = {
      zone: makeZone({
        slug: 'hermit-cave',
        entryRoomSlugs: ['cave'],
        category: 'social',
      }),
      rooms: [makeRoom('cave', { type: 'entry' })],
      exits: [],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.rooms.size).toBe(1);
    expect(graph.entryRoomIds).toEqual(['cave']);
    expect(graph.rooms.get('cave')!.exits.size).toBe(0);
  });

  it('produces a deterministic seed from zone slug', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ slug: 'the-refuge' }),
      rooms: [makeRoom('entrance', { type: 'entry' })],
      exits: [],
    };

    const graph1 = convertZoneToRoomGraph(zoneData);
    const graph2 = convertZoneToRoomGraph(zoneData);

    expect(graph1.seed).toBe(graph2.seed);
    expect(typeof graph1.seed).toBe('number');
    expect(graph1.seed).toBeGreaterThan(0);
  });

  it('preserves tier from zone definition', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ tier: 2 }),
      rooms: [makeRoom('entrance', { type: 'entry' })],
      exits: [],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.tier).toBe(2);
  });

  it('clamps tier to valid ShardTier range', () => {
    const overTier: ZoneData = {
      zone: makeZone({ tier: 5 }),
      rooms: [makeRoom('entrance', { type: 'entry' })],
      exits: [],
    };

    const underTier: ZoneData = {
      zone: makeZone({ tier: 0 }),
      rooms: [makeRoom('entrance', { type: 'entry' })],
      exits: [],
    };

    expect(convertZoneToRoomGraph(overTier).tier).toBe(3);
    expect(convertZoneToRoomGraph(underTier).tier).toBe(1);
  });

  it('carries room properties, loot containers, and hazards through', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['vault'] }),
      rooms: [
        makeRoom('vault', {
          type: 'entry',
          properties: ['heavy_door'],
          lootContainers: [
            { id: 'chest-1', type: 'chest', items: ['gold-ring'] },
          ],
          hazards: [{ type: 'gas_trap', severity: 0.6 }],
        }),
      ],
      exits: [],
    };

    const graph = convertZoneToRoomGraph(zoneData);
    const vault = graph.rooms.get('vault')!;

    expect(vault.properties).toEqual(['heavy_door']);
    expect(vault.items).toHaveLength(1);
    expect(vault.items[0].id).toBe('chest-1');
    expect(vault.hazards).toHaveLength(1);
    expect(vault.hazards[0].type).toBe('gas_trap');
  });

  it('skips exits referencing non-existent source rooms', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['start'] }),
      rooms: [makeRoom('start', { type: 'entry' })],
      exits: [
        // This exit references a room that doesn't exist in the zone
        makeExit('ghost-room', 'north', 'start'),
      ],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    // Should not throw; ghost-room exit is silently skipped
    expect(graph.rooms.size).toBe(1);
    expect(graph.rooms.get('start')!.exits.size).toBe(0);
  });

  it('filters entry room slugs to only existing rooms', () => {
    const zoneData: ZoneData = {
      zone: makeZone({ entryRoomSlugs: ['real-entrance', 'missing-room'] }),
      rooms: [makeRoom('real-entrance', { type: 'entry' })],
      exits: [],
    };

    const graph = convertZoneToRoomGraph(zoneData);

    expect(graph.entryRoomIds).toEqual(['real-entrance']);
  });
});
