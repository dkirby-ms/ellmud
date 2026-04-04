/**
 * Corpse/Loot-on-Death System Tests (Issue #237)
 *
 * Tests the corpse lifecycle: creation on death, soulbound filtering,
 * loot command, corpse decay, and integration with the command system.
 *
 * GDD §6.5, §6.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CorpseSystem, resetCorpseIdCounter, type Corpse } from '../systems/CorpseSystem.js';
import { PlayerState } from '../state/PlayerState.js';
import { handleLoot } from '../commands/handlers/loot.js';
import { handleLook } from '../commands/handlers/look.js';
import { parseCommand } from '../commands/parser.js';
import type { CommandContext } from '../commands/index.js';
import type { Room, Item } from '../zone/RoomGraph.js';

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

function makeContext(
  player: PlayerState,
  room: Room,
  corpseSystem: CorpseSystem,
  args: string[] = [],
): CommandContext {
  return {
    player,
    room,
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    corpseSystem,
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
  let system: CorpseSystem;
  let room: Room;

  beforeEach(() => {
    resetCorpseIdCounter();
    system = new CorpseSystem();
    room = makeRoom();
  });

  it('reports no corpses when room is empty', () => {
    const player = makePlayer();
    const ctx = makeContext(player, room, system);
    const result = handleLoot(ctx);
    expect(result.narrations[0]!.text).toContain('no corpses');
  });

  it('loots all items from first corpse when no args given', () => {
    system.addCorpse('room-1', 'p-dead', 'Victim', [
      makeItem('sword', 'Rusty Sword', 2),
      makeItem('shield', 'Dented Shield', 3),
    ], 600);

    const player = makePlayer();
    const ctx = makeContext(player, room, system);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Rusty Sword');
    expect(result.narrations[0]!.text).toContain('Dented Shield');
    expect(result.narrations[0]!.text).toContain('Victim');
    expect(player.inventory.size).toBe(2);
  });

  it('loots specific item with "loot <item> from corpse"', () => {
    system.addCorpse('room-1', 'p-dead', 'Victim', [
      makeItem('sword', 'Rusty Sword', 2),
      makeItem('shield', 'Dented Shield', 3),
    ], 600);

    const player = makePlayer();
    const ctx = makeContext(player, room, system, ['sword', 'from', 'corpse']);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Rusty Sword');
    expect(player.inventory.size).toBe(1);
    // Shield still in corpse
    const corpses = system.getCorpsesInRoom('room-1');
    expect(corpses[0]!.items).toHaveLength(1);
    expect(corpses[0]!.items[0]!.name).toBe('Dented Shield');
  });

  it('loots from specific player corpse with "loot corpse of <name>"', () => {
    system.addCorpse('room-1', 'p1', 'Alice', [makeItem('s1', 'Alice Sword', 2)], 600);
    system.addCorpse('room-1', 'p2', 'Bob', [makeItem('s2', 'Bob Shield', 3)], 600);

    const player = makePlayer();
    const ctx = makeContext(player, room, system, ['corpse', 'of', 'Bob']);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Bob Shield');
    expect(result.narrations[0]!.text).toContain('Bob');
    expect(player.inventory.size).toBe(1);
  });

  it('reports empty corpse', () => {
    const corpse = system.addCorpse('room-1', 'p-dead', 'Victim', [makeItem('s', 'S', 1)], 600);
    system.lootAll(corpse.id);

    const player = makePlayer();
    const ctx = makeContext(player, room, system);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('stripped bare');
  });

  it('handles weight limit — too heavy items stay in corpse', () => {
    system.addCorpse('room-1', 'p-dead', 'Victim', [
      makeItem('heavy', 'Heavy Boulder', 100),
    ], 600);

    const player = makePlayer('p1', 'room-1');
    const ctx = makeContext(player, room, system);
    const result = handleLoot(ctx);

    expect(result.narrations[0]!.text).toContain('Too heavy');
    expect(player.inventory.size).toBe(0);
    // Item should be back in corpse
    const corpses = system.getCorpsesInRoom('room-1');
    expect(corpses[0]!.items).toHaveLength(1);
  });

  it('handles missing item in "loot <item> from corpse"', () => {
    system.addCorpse('room-1', 'p-dead', 'Victim', [makeItem('s', 'Sword', 1)], 600);

    const player = makePlayer();
    const ctx = makeContext(player, room, system, ['potion', 'from', 'corpse']);
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
  it('displays corpse with item count in room description', () => {
    const system = new CorpseSystem();
    resetCorpseIdCounter();
    system.addCorpse('room-1', 'p-dead', 'Fallen Hero', [
      makeItem('s', 'Sword', 1),
      makeItem('sh', 'Shield', 2),
    ], 600);

    const player = makePlayer();
    const room = makeRoom();
    const ctx = makeContext(player, room, system);
    const result = handleLook(ctx);

    const text = result.narrations[0]!.text;
    expect(text).toContain('corpse of Fallen Hero');
    expect(text).toContain('2 items');
  });

  it('displays stripped corpse when empty', () => {
    const system = new CorpseSystem();
    resetCorpseIdCounter();
    const corpse = system.addCorpse('room-1', 'p-dead', 'Fallen Hero', [makeItem('s', 'S', 1)], 600);
    system.lootAll(corpse.id);

    const player = makePlayer();
    const room = makeRoom();
    const ctx = makeContext(player, room, system);
    const result = handleLook(ctx);

    const text = result.narrations[0]!.text;
    expect(text).toContain('stripped corpse');
    expect(text).toContain('Fallen Hero');
  });
});
