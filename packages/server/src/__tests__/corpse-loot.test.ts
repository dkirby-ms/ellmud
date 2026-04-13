/**
 * Corpse/Loot-on-Death System Tests (Issue #237)
 *
 * Tests the corpse lifecycle: creation on death, soulbound filtering,
 * loot command, corpse decay, and integration with the command system.
 *
 * GDD §6.5, §6.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildFixtureRegistry } from './helpers/item-fixtures.js';

// Mock ContentRegistry so take command (used by loot) can resolve item definitions.
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import { CorpseSystem, resetCorpseIdCounter } from '../systems/CorpseSystem.js';
import { PlayerState } from '../state/PlayerState.js';
import { handleLoot } from '../commands/handlers/loot.js';
import { handleLook } from '../commands/handlers/look.js';
import { parseCommand } from '../commands/parser.js';
import type { CommandContext } from '../commands/index.js';
import type { Room, Item } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(id = 'room-1'): Room {
  return {
    id,
    name: 'Test Room',
    description: 'A test room.',
    exits: new Map(),
    items: [],
  };
}

function makeItem(id: string, name: string, weight = 1): Item {
  return { id, name, weight, description: `A ${name}.` };
}

function makePlayer(sessionId = 'player-1', roomId = 'room-1'): PlayerState {
  return new PlayerState(sessionId, roomId, 50);
}

function _makeContext(
  player: PlayerState,
  room: Room,
  _corpseSystem: CorpseSystem,
  args: string[] = [],
): CommandContext {
  return {
    player,
    room,
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
  };
}

// ─── CorpseSystem Unit Tests ────────────────────────────────────────────────

describe('CorpseSystem', () => {
  let system: CorpseSystem;

  beforeEach(() => {
    resetCorpseIdCounter();
    system = new CorpseSystem();
  });

  describe('addCorpse', () => {
    it('creates a corpse in the specified room', () => {
      const items = [makeItem('sword', 'Rusty Sword')];
      const corpse = system.addCorpse('room-1', 'player-1', 'Alice', items, 600);

      expect(corpse.id).toBe('corpse-0');
      expect(corpse.roomId).toBe('room-1');
      expect(corpse.ownerId).toBe('player-1');
      expect(corpse.ownerName).toBe('Alice');
      expect(corpse.items).toHaveLength(1);
      expect(corpse.items[0]!.name).toBe('Rusty Sword');
      expect(corpse.ttlSeconds).toBe(600);
    });

    it('auto-increments corpse IDs', () => {
      const c1 = system.addCorpse('room-1', 'p1', 'A', [], 600);
      const c2 = system.addCorpse('room-1', 'p2', 'B', [], 600);
      expect(c1.id).toBe('corpse-0');
      expect(c2.id).toBe('corpse-1');
    });

    it('stores multiple corpses in the same room', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s1', 'Sword')], 600);
      system.addCorpse('room-1', 'p2', 'Bob', [makeItem('s2', 'Shield')], 600);

      const corpses = system.getCorpsesInRoom('room-1');
      expect(corpses).toHaveLength(2);
    });

    it('copies items (does not share reference)', () => {
      const items = [makeItem('sword', 'Sword')];
      const corpse = system.addCorpse('room-1', 'p1', 'A', items, 600);
      items.push(makeItem('shield', 'Shield'));
      expect(corpse.items).toHaveLength(1);
    });
  });

  describe('getCorpsesInRoom', () => {
    it('returns empty array for room with no corpses', () => {
      expect(system.getCorpsesInRoom('empty-room')).toHaveLength(0);
    });

    it('filters out expired corpses', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 1);
      // Backdate creation to make it expired
      corpse.createdAt = Date.now() - 2000;

      expect(system.getCorpsesInRoom('room-1')).toHaveLength(0);
    });

    it('keeps corpses within TTL', () => {
      system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 600);
      expect(system.getCorpsesInRoom('room-1')).toHaveLength(1);
    });
  });

  describe('findCorpse', () => {
    it('returns first corpse for empty query', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s', 'S')], 600);
      const found = system.findCorpse('room-1', '');
      expect(found?.ownerName).toBe('Alice');
    });

    it('returns first corpse for "corpse" query', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s', 'S')], 600);
      const found = system.findCorpse('room-1', 'corpse');
      expect(found?.ownerName).toBe('Alice');
    });

    it('finds corpse by owner name', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s', 'S')], 600);
      system.addCorpse('room-1', 'p2', 'Bob', [makeItem('s2', 'S2')], 600);
      const found = system.findCorpse('room-1', 'Bob');
      expect(found?.ownerName).toBe('Bob');
    });

    it('finds corpse by "corpse of <name>" syntax', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s', 'S')], 600);
      system.addCorpse('room-1', 'p2', 'Bob', [makeItem('s2', 'S2')], 600);
      const found = system.findCorpse('room-1', 'corpse of Bob');
      expect(found?.ownerName).toBe('Bob');
    });

    it('returns undefined for no match', () => {
      system.addCorpse('room-1', 'p1', 'Alice', [], 600);
      const found = system.findCorpse('room-1', 'Charlie');
      expect(found).toBeUndefined();
    });
  });

  describe('lootItem', () => {
    it('removes and returns a specific item from corpse', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'Alice', [
        makeItem('sword', 'Rusty Sword'),
        makeItem('shield', 'Dented Shield'),
      ], 600);

      const result = system.lootItem(corpse.id, 'sword');
      expect(result).toBeDefined();
      expect(result!.item.name).toBe('Rusty Sword');
      expect(corpse.items).toHaveLength(1);
      expect(corpse.items[0]!.name).toBe('Dented Shield');
    });

    it('finds item by partial name match', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'Alice', [
        makeItem('sword', 'Rusty Sword'),
      ], 600);

      const result = system.lootItem(corpse.id, 'rusty');
      expect(result).toBeDefined();
      expect(result!.item.id).toBe('sword');
    });

    it('returns undefined for unknown item', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'Alice', [
        makeItem('sword', 'Sword'),
      ], 600);

      expect(system.lootItem(corpse.id, 'potion')).toBeUndefined();
    });
  });

  describe('lootAll', () => {
    it('removes and returns all items from corpse', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'Alice', [
        makeItem('sword', 'Sword'),
        makeItem('shield', 'Shield'),
      ], 600);

      const result = system.lootAll(corpse.id);
      expect(result).toBeDefined();
      expect(result!.items).toHaveLength(2);
      expect(corpse.items).toHaveLength(0);
    });
  });

  describe('tick (decay)', () => {
    it('removes expired corpses', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 1);
      corpse.createdAt = Date.now() - 2000;

      system.tick(1000);
      expect(system.getCorpsesInRoom('room-1')).toHaveLength(0);
    });

    it('removes empty corpses (all items looted)', () => {
      const corpse = system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 600);
      system.lootAll(corpse.id);

      system.tick(1000);
      expect(system.getCorpsesInRoom('room-1')).toHaveLength(0);
    });

    it('keeps non-expired corpses with items', () => {
      system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 600);
      system.tick(1000);
      expect(system.getCorpsesInRoom('room-1')).toHaveLength(1);
    });
  });

  describe('totalCorpseCount', () => {
    it('counts all alive corpses across rooms', () => {
      system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 600);
      system.addCorpse('room-2', 'p2', 'B', [makeItem('s2', 'S2')], 600);
      expect(system.totalCorpseCount).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all corpses', () => {
      system.addCorpse('room-1', 'p1', 'A', [makeItem('s', 'S')], 600);
      system.addCorpse('room-2', 'p2', 'B', [makeItem('s2', 'S2')], 600);
      system.clear();
      expect(system.totalCorpseCount).toBe(0);
    });
  });
});

// ─── Loot Command Tests ─────────────────────────────────────────────────────

describe('loot command', () => {
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
  });

  function makeCorpseItem(name: string, items: Item[]): Item {
    return {
      id: `corpse-${name.toLowerCase()}`,
      name: `corpse of ${name}`,
      weight: 10,
      description: `The remains of ${name}.`,
      roomDescription: `The corpse of ${name} lies here.`,
      containerContents: items.map(item => ({
        definitionId: item.id,
        quantity: 1,
        durability: null,
      })),
      createdAt: Date.now(),
      ttlSeconds: 600,
    };
  }

  function makeContext2(
    player: PlayerState,
    room: Room,
    args: string[] = [],
  ): CommandContext {
    return {
      player,
      room,
      args,
      resolveRoom: () => undefined,
      otherPlayersInRoom: [],
      stability: 1.0,
    };
  }

  it('reports no corpses when room is empty', () => {
    const player = makePlayer();
    const ctx = makeContext2(player, room);
    const result = handleLoot(ctx);
    expect(result.narrations[0]!.text).toContain('no corpses');
  });

  it('loots all items from first corpse when no args given', () => {
    room.items.push({
      id: 'corpse-victim',
      name: 'corpse of Victim',
      weight: 10,
      description: 'The remains of Victim.',
      roomDescription: 'The corpse of Victim lies here.',
      containerContents: [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
        { definitionId: 'tattered_leather', quantity: 1, durability: null },
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });

    const player = makePlayer();
    const ctx = makeContext2(player, room);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Rusty Blade');
    expect(result.narrations[0]!.text).toContain('Tattered Leather');
    expect(player.inventory.size).toBe(2);
  });

  it('loots specific item with "loot <item> from corpse"', () => {
    room.items.push({
      id: 'corpse-victim',
      name: 'corpse of Victim',
      weight: 10,
      description: 'The remains of Victim.',
      roomDescription: 'The corpse of Victim lies here.',
      containerContents: [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
        { definitionId: 'tattered_leather', quantity: 1, durability: null },
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });

    const player = makePlayer();
    const ctx = makeContext2(player, room, ['rusty', 'from', 'corpse']);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Rusty Blade');
    expect(player.inventory.size).toBe(1);
    // Leather still in corpse container
    const corpse = room.items.find(i => i.id.startsWith('corpse-'));
    expect(corpse?.containerContents).toHaveLength(1);
  });

  it('loots from specific player corpse with "loot corpse of <name>"', () => {
    room.items.push({
      id: 'corpse-alice',
      name: 'corpse of Alice',
      weight: 10,
      description: 'The remains of Alice.',
      roomDescription: 'The corpse of Alice lies here.',
      containerContents: [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });
    room.items.push({
      id: 'corpse-bob',
      name: 'corpse of Bob',
      weight: 10,
      description: 'The remains of Bob.',
      roomDescription: 'The corpse of Bob lies here.',
      containerContents: [
        { definitionId: 'tattered_leather', quantity: 1, durability: null },
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });

    const player = makePlayer();
    const ctx = makeContext2(player, room, ['corpse', 'of', 'Bob']);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Tattered Leather');
    expect(player.inventory.size).toBe(1);
  });

  it('reports empty corpse', () => {
    room.items.push(makeCorpseItem('Victim', []));

    const player = makePlayer();
    const ctx = makeContext2(player, room);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('empty');
  });

  it('handles weight limit — too heavy items stay in corpse', () => {
    room.items.push({
      id: 'corpse-victim',
      name: 'corpse of Victim',
      weight: 10,
      description: 'The remains of Victim.',
      roomDescription: 'The corpse of Victim lies here.',
      containerContents: [
        { definitionId: 'corroded_halberd', quantity: 1, durability: null }, // weight: 12, player max: 50, but already carrying weight
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });

    const player = makePlayer('p1', 'room-1');
    // Fill up the player's weight capacity so they can't carry the halberd
    for (let i = 0; i < 8; i++) {
      player.addItem(makeItem(`heavy${i}`, `Heavy Item ${i}`, 5));
    }

    const ctx = makeContext2(player, room);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Too heavy');
    expect(player.inventory.size).toBe(8); // Only the items we added, not the halberd
    // Item should remain in corpse container
    const corpse = room.items.find(i => i.id.startsWith('corpse-'));
    expect(corpse?.containerContents).toHaveLength(1);
  });

  it('handles missing item in "loot <item> from corpse"', () => {
    room.items.push({
      id: 'corpse-victim',
      name: 'corpse of Victim',
      weight: 10,
      description: 'The remains of Victim.',
      roomDescription: 'The corpse of Victim lies here.',
      containerContents: [
        { definitionId: 'rusty_blade', quantity: 1, durability: null },
      ],
      createdAt: Date.now(),
      ttlSeconds: 600,
    });

    const player = makePlayer();
    const ctx = makeContext2(player, room, ['potion', 'from', 'corpse']);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain("doesn't contain");
  });
});

// ─── Parser Tests ───────────────────────────────────────────────────────────

describe('loot verb parsing', () => {
  it('"loot" is a recognised verb', () => {
    const result = parseCommand('loot');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('loot');
    }
  });

  it('"loot corpse" parses with args', () => {
    const result = parseCommand('loot corpse');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('loot');
      expect(result.command.args).toEqual(['corpse']);
    }
  });

  it('"loot sword from corpse of Alice" parses correctly', () => {
    const result = parseCommand('loot sword from corpse of Alice');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('loot');
      expect(result.command.args).toEqual(['sword', 'from', 'corpse', 'of', 'Alice']);
    }
  });
});

// ─── Look Command Integration ───────────────────────────────────────────────

describe('look command shows corpses', () => {
  it('displays corpse with roomDescription in room description', () => {
    const room = makeRoom();
    room.items.push({
      id: 'corpse-hero',
      name: 'corpse of Fallen Hero',
      weight: 10,
      description: 'The remains of Fallen Hero.',
      roomDescription: 'The corpse of Fallen Hero lies here.',
      containerContents: [
        { definitionId: 's', quantity: 1, durability: null },
        { definitionId: 'sh', quantity: 1, durability: null },
      ],
    });

    const player = makePlayer();
    const ctx = {
      player,
      room,
      args: [],
      resolveRoom: () => undefined,
      otherPlayersInRoom: [],
      stability: 1.0,
    };
    const result = handleLook(ctx);

    const text = result.narrations[0]!.text;
    expect(text).toContain('corpse of Fallen Hero');
  });

  it('displays stripped corpse when empty', () => {
    const room = makeRoom();
    room.items.push({
      id: 'corpse-hero',
      name: 'corpse of Fallen Hero',
      weight: 10,
      description: 'The remains of Fallen Hero.',
      roomDescription: 'The stripped corpse of Fallen Hero lies here.',
      containerContents: [],
    });

    const player = makePlayer();
    const ctx = {
      player,
      room,
      args: [],
      resolveRoom: () => undefined,
      otherPlayersInRoom: [],
      stability: 1.0,
    };
    const result = handleLook(ctx);

    const text = result.narrations[0]!.text;
    expect(text).toContain('stripped corpse');
    expect(text).toContain('Fallen Hero');
  });
});
