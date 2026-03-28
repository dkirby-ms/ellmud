/**
 * Orphaned-exit cleanup tests.
 *
 * Validates findOrphanedExits() and removeOrphanedExits() against
 * the InMemoryZoneRepository. Covers all four orphan categories:
 *   1. from_room_slug references a missing room
 *   2. to_room_slug references a missing room (intra-zone)
 *   3. cross-zone exit targets a non-existent zone
 *   4. cross-zone exit targets a non-existent room in the target zone
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryZoneRepository } from '../zones/InMemoryZoneRepository.js';
import type {
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
} from '../zones/ZoneRepository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function zoneInput(
  overrides: Partial<Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'>> = {},
): Omit<ZoneDefinition, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    slug: 'test-zone',
    name: 'Test Zone',
    description: 'A test zone',
    levelMin: 1,
    levelMax: 5,
    tier: 1,
    biome: 'flooded_crypt',
    entryRoomSlugs: ['room-a'],
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
): Omit<ZoneRoomDefinition, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    zoneId,
    slug,
    name: slug,
    description: `Room ${slug}`,
    type: 'corridor',
    properties: [],
    lootContainers: [],
    hazards: [],
    npcs: [],
  };
}

function exitInput(
  zoneId: string,
  from: string,
  to: string,
  direction: string,
  crossZone?: { targetZoneSlug: string; targetRoomSlug: string },
): Omit<ZoneExitDefinition, 'id' | 'createdAt'> {
  return {
    zoneId,
    fromRoomSlug: from,
    toRoomSlug: to,
    direction: direction as ZoneExitDefinition['direction'],
    targetZoneSlug: crossZone?.targetZoneSlug,
    targetRoomSlug: crossZone?.targetRoomSlug,
    locked: false,
    hidden: false,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('orphaned-exit cleanup', () => {
  let repo: InMemoryZoneRepository;

  beforeEach(() => {
    repo = new InMemoryZoneRepository();
  });

  it('should return empty when there are no orphaned exits', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createRoom(roomInput(zone.id, 'room-b'));
    await repo.createExit(exitInput(zone.id, 'room-a', 'room-b', 'north'));

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(0);
  });

  it('should detect exit with missing from_room_slug', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-b'));
    // from_room_slug "ghost" doesn't exist
    await repo.createExit(exitInput(zone.id, 'ghost', 'room-b', 'north'));

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toContain('from_room_slug');
  });

  it('should detect intra-zone exit with missing to_room_slug', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    // to_room_slug "ghost" doesn't exist, intra-zone
    await repo.createExit(exitInput(zone.id, 'room-a', 'ghost', 'south'));

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toContain('to_room_slug');
  });

  it('should detect cross-zone exit to a non-existent zone', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createExit(
      exitInput(zone.id, 'room-a', 'room-x', 'east', {
        targetZoneSlug: 'nonexistent-zone',
        targetRoomSlug: 'room-x',
      }),
    );

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toContain('target zone');
  });

  it('should detect cross-zone exit to a non-existent room in target zone', async () => {
    const zone = await repo.createZone(zoneInput());
    const targetZone = await repo.createZone(zoneInput({ slug: 'target-zone', name: 'Target Zone' }));
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createRoom(roomInput(targetZone.id, 'real-room'));

    // points at "missing-room" which doesn't exist in target-zone
    await repo.createExit(
      exitInput(zone.id, 'room-a', 'missing-room', 'west', {
        targetZoneSlug: 'target-zone',
        targetRoomSlug: 'missing-room',
      }),
    );

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toContain('target room');
  });

  it('should not flag cross-zone exit when target room exists', async () => {
    const zone = await repo.createZone(zoneInput());
    const targetZone = await repo.createZone(zoneInput({ slug: 'target-zone', name: 'Target Zone' }));
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createRoom(roomInput(targetZone.id, 'room-x'));

    await repo.createExit(
      exitInput(zone.id, 'room-a', 'room-x', 'east', {
        targetZoneSlug: 'target-zone',
        targetRoomSlug: 'room-x',
      }),
    );

    const orphans = await repo.findOrphanedExits();
    expect(orphans).toHaveLength(0);
  });

  it('removeOrphanedExits should delete only orphans and return them', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createRoom(roomInput(zone.id, 'room-b'));

    // valid exit
    await repo.createExit(exitInput(zone.id, 'room-a', 'room-b', 'north'));
    // orphaned: from_room_slug missing
    await repo.createExit(exitInput(zone.id, 'ghost', 'room-b', 'south'));
    // orphaned: to_room_slug missing (intra-zone)
    await repo.createExit(exitInput(zone.id, 'room-a', 'phantom', 'east'));

    const removed = await repo.removeOrphanedExits();
    expect(removed).toHaveLength(2);

    // After removal, the only exit left should be the valid one
    const bundle = await repo.getZoneById(zone.id);
    expect(bundle!.exits).toHaveLength(1);
    expect(bundle!.exits[0].fromRoomSlug).toBe('room-a');
    expect(bundle!.exits[0].toRoomSlug).toBe('room-b');
  });

  it('removeOrphanedExits returns empty array when nothing to clean', async () => {
    const zone = await repo.createZone(zoneInput());
    await repo.createRoom(roomInput(zone.id, 'room-a'));
    await repo.createRoom(roomInput(zone.id, 'room-b'));
    await repo.createExit(exitInput(zone.id, 'room-a', 'room-b', 'north'));

    const removed = await repo.removeOrphanedExits();
    expect(removed).toHaveLength(0);
  });

  it('should detect multiple categories of orphans on the same exit', async () => {
    const zone = await repo.createZone(zoneInput());
    // No rooms at all — from_room_slug will fail first
    await repo.createExit(exitInput(zone.id, 'ghost-a', 'ghost-b', 'north'));

    const orphans = await repo.findOrphanedExits();
    // from_room_slug is checked first and triggers early continue
    expect(orphans).toHaveLength(1);
    expect(orphans[0].reason).toContain('from_room_slug');
  });
});
