/**
 * Item interaction tests — #390 (get / drop / equip)
 *
 * Anticipatory tests written from requirements while implementation is in progress.
 * Tests cover: take (get), drop, equip commands + edge cases + integration flows.
 *
 * NOTE: "get" in the issue maps to the existing "take" command.
 * If a "get" alias is added by #390, the alias tests below will verify it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { handleTake } from '../commands/handlers/take.js';
import { handleDrop } from '../commands/handlers/drop.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, Item, Direction } from '../generator/RoomGraph.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    name: 'Test Chamber',
    description: 'A test chamber.',
    exits: new Map<Direction, string>(),
    items: [],
    ...overrides,
  };
}

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'rusty sword',
    weight: 3,
    description: 'A rusty sword.',
    ...overrides,
  };
}

function makePlayer(
  sessionId = 'player-1',
  roomId = 'room-1',
  maxWeight = 20,
): PlayerState {
  return new PlayerState(sessionId, roomId, maxWeight);
}

function buildCtx(
  overrides: Partial<CommandContext> & { player?: PlayerState; room?: Room } = {},
): CommandContext {
  const room = overrides.room ?? makeRoom();
  const player = overrides.player ?? makePlayer('player-1', room.id);
  return {
    player,
    room,
    args: [],
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    ...overrides,
  };
}

function text(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

function narType(result: CommandResult): string {
  return result.narrations[0]?.type ?? '';
}

// ─── take (get) ─────────────────────────────────────────────────────────

describe('take command (#390)', () => {
  it('picks up an item from the room by name', () => {
    const sword = makeItem();
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);
    const ctx = buildCtx({ player, room, args: ['rusty', 'sword'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain('pick up');
    expect(text(result)).toContain('rusty sword');
    expect(player.inventory.has('item-1')).toBe(true);
    expect(room.items).toHaveLength(0);
  });

  it('picks up an item by exact id', () => {
    const sword = makeItem({ id: 'blade-7' });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);
    const ctx = buildCtx({ player, room, args: ['blade-7'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain('pick up');
    expect(player.inventory.has('blade-7')).toBe(true);
  });

  it('picks up by partial name match', () => {
    const sword = makeItem({ id: 'sword-1', name: 'ornate longsword' });
    const room = makeRoom({ items: [sword] });
    const ctx = buildCtx({ player: makePlayer('p1', room.id), room, args: ['longsword'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain('pick up');
    expect(room.items).toHaveLength(0);
  });

  it('fails when item is not in the room', () => {
    const room = makeRoom({ items: [] });
    const ctx = buildCtx({ room, args: ['potion'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain("don't see");
    expect(narType(result)).toBe('system');
  });

  it('fails when no argument given', () => {
    const ctx = buildCtx({ args: [] });
    const result = handleCommand('take', ctx);

    expect(text(result).toLowerCase()).toContain('what');
  });

  it('fails when item exceeds carry weight', () => {
    const boulder = makeItem({ id: 'boulder', name: 'boulder', weight: 25 });
    const room = makeRoom({ items: [boulder] });
    const player = makePlayer('p1', room.id, 20);
    const ctx = buildCtx({ player, room, args: ['boulder'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain('heavy');
    expect(room.items).toHaveLength(1); // item stays in room
    expect(player.inventory.size).toBe(0);
  });

  it('updates weight display after pickup', () => {
    const sword = makeItem({ weight: 5 });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id, 20);
    const ctx = buildCtx({ player, room, args: ['rusty', 'sword'] });

    const result = handleCommand('take', ctx);

    expect(text(result)).toContain('5/20');
  });

  it('stacks identical items in inventory', () => {
    const sword1 = makeItem({ id: 'sword', name: 'iron sword', weight: 2 });
    const sword2 = makeItem({ id: 'sword', name: 'iron sword', weight: 2 });
    const room = makeRoom({ items: [sword1, sword2] });
    const player = makePlayer('p1', room.id, 20);

    // Take first
    handleCommand('take', buildCtx({ player, room, args: ['iron', 'sword'] }));
    // Take second
    handleCommand('take', buildCtx({ player, room, args: ['iron', 'sword'] }));

    const entry = player.inventory.get('sword');
    expect(entry?.quantity).toBe(2);
    expect(player.currentWeight).toBe(4);
  });

  it('picks up correct item when multiple items in room', () => {
    const sword = makeItem({ id: 'sword', name: 'iron sword', weight: 3 });
    const potion = makeItem({ id: 'potion', name: 'health potion', weight: 1 });
    const room = makeRoom({ items: [sword, potion] });
    const player = makePlayer('p1', room.id);
    const ctx = buildCtx({ player, room, args: ['health', 'potion'] });

    handleCommand('take', ctx);

    expect(player.inventory.has('potion')).toBe(true);
    expect(player.inventory.has('sword')).toBe(false);
    expect(room.items).toHaveLength(1);
    expect(room.items[0]!.id).toBe('sword');
  });

  it('returns narration type "room" for visibility to others', () => {
    const sword = makeItem();
    const room = makeRoom({ items: [sword] });
    const ctx = buildCtx({ player: makePlayer('p1', room.id), room, args: ['rusty', 'sword'] });

    const result = handleCommand('take', ctx);

    expect(narType(result)).toBe('room');
  });
});

// ─── "get" alias ────────────────────────────────────────────────────────
// Issue #390 says players should be able to 'get' items.
// If Drizzt adds "get" as an alias for "take", these tests verify it.

describe('get alias (#390)', () => {
  it('should work as alias for take', () => {
    const sword = makeItem();
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);
    const ctx = buildCtx({ player, room, args: ['rusty', 'sword'] });

    const result = handleCommand('get', ctx);

    expect(text(result)).toContain('pick up');
    expect(player.inventory.has('item-1')).toBe(true);
    expect(room.items).toHaveLength(0);
  });
});

// ─── drop ───────────────────────────────────────────────────────────────

describe('drop command (#390)', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
    player = makePlayer('p1', room.id);
  });

  it('drops an item from inventory into the room', () => {
    const sword = makeItem();
    player.addItem(sword);

    const result = handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(text(result)).toContain('drop');
    expect(text(result)).toContain('rusty sword');
    expect(player.inventory.size).toBe(0);
    expect(room.items).toHaveLength(1);
    expect(room.items[0]!.id).toBe('item-1');
  });

  it('fails when item is not in inventory', () => {
    const result = handleCommand('drop', buildCtx({ player, room, args: ['potion'] }));

    expect(text(result)).toContain('not carrying');
    expect(narType(result)).toBe('system');
    expect(room.items).toHaveLength(0);
  });

  it('fails when no argument given', () => {
    const result = handleCommand('drop', buildCtx({ player, room, args: [] }));

    expect(text(result).toLowerCase()).toContain('what');
  });

  it('updates weight display after drop', () => {
    const sword = makeItem({ weight: 5 });
    player.addItem(sword);

    const result = handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(text(result)).toContain('0/20');
    expect(player.currentWeight).toBe(0);
  });

  it('drops only one when stacked', () => {
    const sword = makeItem({ id: 'sword', name: 'iron sword', weight: 2 });
    player.addItem(sword);
    player.addItem({ ...sword }); // add a second

    handleCommand('drop', buildCtx({ player, room, args: ['iron', 'sword'] }));

    const entry = player.inventory.get('sword');
    expect(entry?.quantity).toBe(1);
    expect(room.items).toHaveLength(1);
  });

  it('returns narration type "room" for visibility to others', () => {
    const sword = makeItem();
    player.addItem(sword);

    const result = handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(narType(result)).toBe('room');
  });

  it('dropped item retains all properties', () => {
    const sword = makeItem({
      id: 'fancy-blade',
      name: 'enchanted blade',
      weight: 4,
      description: 'A gleaming blade.',
      roomDescription: 'An enchanted blade pulses with light.',
    });
    player.addItem(sword);

    handleCommand('drop', buildCtx({ player, room, args: ['enchanted', 'blade'] }));

    const dropped = room.items[0]!;
    expect(dropped.id).toBe('fancy-blade');
    expect(dropped.name).toBe('enchanted blade');
    expect(dropped.weight).toBe(4);
    expect(dropped.description).toBe('A gleaming blade.');
    expect(dropped.roomDescription).toBe('An enchanted blade pulses with light.');
  });
});

// ─── equip ──────────────────────────────────────────────────────────────

describe('equip command (#390)', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
    player = makePlayer('p1', room.id);
  });

  it('equips an item from inventory', () => {
    const sword = makeItem({ equipSlot: 'weapon' });
    player.addItem(sword);

    const result = handleCommand('equip', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(text(result)).toContain('equip');
    expect(text(result)).toContain('rusty sword');
    expect(player.equipment?.weapon).toBe('rusty sword');
    expect(player.inventory.size).toBe(0);
  });

  it('equips armour from inventory', () => {
    const plate = makeItem({ id: 'plate', name: 'iron plate', weight: 5, description: 'Armour.', equipSlot: 'armour' });
    player.addItem(plate);

    const result = handleCommand('equip', buildCtx({ player, room, args: ['iron', 'plate'] }));

    expect(text(result)).toContain('equip');
    expect(player.equipment?.armour).toBe('iron plate');
    expect(player.inventory.size).toBe(0);
  });

  it('fails when item is not in inventory', () => {
    const result = handleCommand('equip', buildCtx({ player, room, args: ['sword'] }));

    expect(text(result)).toContain('not carrying');
    expect(narType(result)).toBe('system');
  });

  it('fails when item is not equippable', () => {
    const torch = makeItem({ id: 'torch', name: 'torch', weight: 1, description: 'A torch.' });
    player.addItem(torch);

    const result = handleCommand('equip', buildCtx({ player, room, args: ['torch'] }));

    expect(text(result)).toContain("can't be equipped");
    expect(narType(result)).toBe('system');
    expect(player.inventory.size).toBe(1);
  });

  it('fails when no argument given', () => {
    const result = handleCommand('equip', buildCtx({ player, room, args: [] }));

    expect(text(result).toLowerCase()).toContain('equip what');
  });

  it('swaps currently equipped item when slot is occupied', () => {
    const sword = makeItem({ id: 'sword', name: 'iron sword', weight: 3, equipSlot: 'weapon' });
    const axe = makeItem({ id: 'axe', name: 'battle axe', weight: 4, description: 'An axe.', equipSlot: 'weapon' });
    player.addItem(sword);
    player.addItem(axe);

    handleCommand('equip', buildCtx({ player, room, args: ['iron', 'sword'] }));
    expect(player.equipment?.weapon).toBe('iron sword');
    expect(player.inventory.size).toBe(1);

    handleCommand('equip', buildCtx({ player, room, args: ['battle', 'axe'] }));
    expect(player.equipment?.weapon).toBe('battle axe');
    expect(player.inventory.size).toBe(1);
    expect(player.findItem('sword')).not.toBeNull();
  });

  it('does not remove item from inventory if equip fails', () => {
    const torch = makeItem({ id: 'torch', name: 'torch', weight: 1, description: 'A torch.' });
    player.addItem(torch);

    handleCommand('equip', buildCtx({ player, room, args: ['torch'] }));

    expect(player.inventory.size).toBe(1);
  });
});

// ─── unequip ────────────────────────────────────────────────────────────

describe('unequip command (#390)', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    room = makeRoom();
    player = makePlayer('p1', room.id);
  });

  it('unequips a weapon back to inventory', () => {
    const sword = makeItem({ equipSlot: 'weapon' });
    player.addItem(sword);
    handleCommand('equip', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(player.inventory.size).toBe(0);

    const result = handleCommand('unequip', buildCtx({ player, room, args: ['weapon'] }));

    expect(text(result)).toContain('unequip');
    expect(text(result)).toContain('rusty sword');
    expect(player.inventory.size).toBe(1);
    expect(player.equipment?.weapon).toBeUndefined();
  });

  it('unequips armour back to inventory', () => {
    const plate = makeItem({ id: 'plate', name: 'iron plate', weight: 5, description: 'Armour.', equipSlot: 'armour' });
    player.addItem(plate);
    handleCommand('equip', buildCtx({ player, room, args: ['iron', 'plate'] }));

    const result = handleCommand('unequip', buildCtx({ player, room, args: ['armour'] }));

    expect(text(result)).toContain('unequip');
    expect(player.inventory.size).toBe(1);
    expect(player.equipment?.armour).toBeUndefined();
  });

  it('accepts "armor" spelling', () => {
    const plate = makeItem({ id: 'plate', name: 'iron plate', weight: 5, description: 'Armour.', equipSlot: 'armour' });
    player.addItem(plate);
    handleCommand('equip', buildCtx({ player, room, args: ['iron', 'plate'] }));

    const result = handleCommand('unequip', buildCtx({ player, room, args: ['armor'] }));

    expect(text(result)).toContain('unequip');
  });

  it('fails when slot is empty', () => {
    const result = handleCommand('unequip', buildCtx({ player, room, args: ['weapon'] }));

    expect(text(result)).toContain("don't have anything equipped");
    expect(narType(result)).toBe('system');
  });

  it('fails when invalid slot specified', () => {
    const result = handleCommand('unequip', buildCtx({ player, room, args: ['head'] }));

    expect(text(result)).toContain('not a valid equipment slot');
    expect(narType(result)).toBe('system');
  });

  it('fails when no argument given', () => {
    const result = handleCommand('unequip', buildCtx({ player, room, args: [] }));

    expect(text(result).toLowerCase()).toContain('unequip what');
  });
});

// ─── Integration: take → equip flow ─────────────────────────────────────

describe('take → equip integration (#390)', () => {
  it('player can take an item from room and then equip it', () => {
    const sword = makeItem({ equipSlot: 'weapon' });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);

    handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(player.inventory.size).toBe(1);

    const result = handleCommand('equip', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(text(result)).toContain('equip');
    expect(player.equipment?.weapon).toBe('rusty sword');
    expect(player.inventory.size).toBe(0);
  });

  it('player cannot equip an item they have not picked up', () => {
    const sword = makeItem({ equipSlot: 'weapon' });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);

    const result = handleCommand('equip', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(text(result)).toContain('not carrying');
    expect(room.items).toHaveLength(1);
  });
});

// ─── Integration: drop → take round-trip ────────────────────────────────

describe('drop → take round-trip (#390)', () => {
  it('dropped item can be picked back up', () => {
    const sword = makeItem();
    const room = makeRoom();
    const player = makePlayer('p1', room.id);

    // Add to inventory, then drop
    player.addItem(sword);
    handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(player.inventory.size).toBe(0);
    expect(room.items).toHaveLength(1);

    // Pick it back up
    handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(player.inventory.has('item-1')).toBe(true);
    expect(room.items).toHaveLength(0);
  });

  it('weight is consistent through drop → take cycle', () => {
    const sword = makeItem({ weight: 5 });
    const room = makeRoom();
    const player = makePlayer('p1', room.id, 20);

    player.addItem(sword);
    expect(player.currentWeight).toBe(5);

    handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(player.currentWeight).toBe(0);

    handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    expect(player.currentWeight).toBe(5);
  });

  it('item identity is preserved through drop → take', () => {
    const sword = makeItem({
      id: 'unique-blade',
      name: 'soul reaver',
      weight: 6,
      description: 'A blade that hungers.',
    });
    const room = makeRoom();
    const player = makePlayer('p1', room.id);

    player.addItem(sword);
    handleCommand('drop', buildCtx({ player, room, args: ['soul', 'reaver'] }));
    handleCommand('take', buildCtx({ player, room, args: ['soul', 'reaver'] }));

    const entry = player.inventory.get('unique-blade');
    expect(entry).toBeDefined();
    expect(entry!.item.name).toBe('soul reaver');
    expect(entry!.item.description).toBe('A blade that hungers.');
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────

describe('item interaction edge cases (#390)', () => {
  it('take at exact weight limit succeeds', () => {
    const sword = makeItem({ weight: 5 });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id, 5); // exactly 5 capacity

    const result = handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(text(result)).toContain('pick up');
    expect(player.inventory.size).toBe(1);
  });

  it('take at 1 over weight limit fails', () => {
    const sword = makeItem({ weight: 5 });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id, 4); // 1 short

    const result = handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    expect(text(result)).toContain('heavy');
    expect(player.inventory.size).toBe(0);
  });

  it('take with existing inventory weight respects remaining capacity', () => {
    const light = makeItem({ id: 'light', name: 'light stone', weight: 15 });
    const heavy = makeItem({ id: 'heavy', name: 'heavy stone', weight: 10 });
    const room = makeRoom({ items: [heavy] });
    const player = makePlayer('p1', room.id, 20);
    player.addItem(light);

    const result = handleCommand('take', buildCtx({ player, room, args: ['heavy', 'stone'] }));

    expect(text(result)).toContain('heavy');
    expect(room.items).toHaveLength(1); // heavy stone stays
  });

  it('case-insensitive item matching', () => {
    const sword = makeItem({ name: 'Elven Longsword' });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);

    const result = handleCommand('take', buildCtx({ player, room, args: ['elven', 'longsword'] }));

    expect(text(result)).toContain('pick up');
    expect(player.inventory.size).toBe(1);
  });

  it('drop and take do not duplicate items', () => {
    const sword = makeItem();
    const room = makeRoom();
    const player = makePlayer('p1', room.id);

    player.addItem(sword);

    // Drop
    handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    // Total items in the world should be 1 (in room, not in inventory)
    expect(room.items).toHaveLength(1);
    expect(player.inventory.size).toBe(0);

    // Take
    handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));

    // Total items should still be 1 (in inventory, not in room)
    expect(room.items).toHaveLength(0);
    expect(player.inventory.size).toBe(1);
  });

  it('multiple players can take different items from same room', () => {
    const sword = makeItem({ id: 'sword', name: 'iron sword', weight: 3 });
    const shield = makeItem({ id: 'shield', name: 'wooden shield', weight: 4 });
    const room = makeRoom({ items: [sword, shield] });

    const player1 = makePlayer('p1', room.id);
    const player2 = makePlayer('p2', room.id);

    handleCommand('take', buildCtx({ player: player1, room, args: ['iron', 'sword'] }));
    handleCommand('take', buildCtx({ player: player2, room, args: ['wooden', 'shield'] }));

    expect(player1.inventory.has('sword')).toBe(true);
    expect(player2.inventory.has('shield')).toBe(true);
    expect(room.items).toHaveLength(0);
  });

  it('second player cannot take item already taken by first', () => {
    const sword = makeItem({ id: 'sword', name: 'iron sword' });
    const room = makeRoom({ items: [sword] });

    const player1 = makePlayer('p1', room.id);
    const player2 = makePlayer('p2', room.id);

    handleCommand('take', buildCtx({ player: player1, room, args: ['iron', 'sword'] }));
    const result = handleCommand('take', buildCtx({ player: player2, room, args: ['iron', 'sword'] }));

    expect(text(result)).toContain("don't see");
    expect(player1.inventory.has('sword')).toBe(true);
    expect(player2.inventory.size).toBe(0);
  });
});

// ─── Broadcast visibility ───────────────────────────────────────────────
// Verifies that take/drop narrations use "room" type so ZoneRoom
// broadcasts them to other players.

describe('broadcast visibility (#390)', () => {
  it('take narration type is "room" (visible to others)', () => {
    const sword = makeItem();
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);

    const result = handleCommand('take', buildCtx({
      player,
      room,
      args: ['rusty', 'sword'],
      otherPlayersInRoom: ['p2', 'p3'],
    }));

    expect(result.narrations[0]!.type).toBe('room');
  });

  it('drop narration type is "room" (visible to others)', () => {
    const sword = makeItem();
    const room = makeRoom();
    const player = makePlayer('p1', room.id);
    player.addItem(sword);

    const result = handleCommand('drop', buildCtx({
      player,
      room,
      args: ['rusty', 'sword'],
      otherPlayersInRoom: ['p2', 'p3'],
    }));

    expect(result.narrations[0]!.type).toBe('room');
  });

  it('failed take is "system" (not visible to others)', () => {
    const room = makeRoom({ items: [] });
    const ctx = buildCtx({ room, args: ['nonexistent'] });

    const result = handleCommand('take', ctx);

    expect(result.narrations[0]!.type).toBe('system');
  });

  it('failed drop is "system" (not visible to others)', () => {
    const room = makeRoom();
    const ctx = buildCtx({ room, args: ['nonexistent'] });

    const result = handleCommand('drop', ctx);

    expect(result.narrations[0]!.type).toBe('system');
  });
});

// ─── inventory command ──────────────────────────────────────────────────

describe('inventory reflects take/drop (#390)', () => {
  it('shows item after take', () => {
    const sword = makeItem({ weight: 3 });
    const room = makeRoom({ items: [sword] });
    const player = makePlayer('p1', room.id);

    handleCommand('take', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    const result = handleCommand('inventory', buildCtx({ player, room }));

    expect(text(result)).toContain('rusty sword');
    expect(text(result)).toContain('3 wt');
  });

  it('removes item from inventory display after drop', () => {
    const sword = makeItem();
    const room = makeRoom();
    const player = makePlayer('p1', room.id);
    player.addItem(sword);

    handleCommand('drop', buildCtx({ player, room, args: ['rusty', 'sword'] }));
    const result = handleCommand('inventory', buildCtx({ player, room }));

    expect(text(result)).toContain('nothing');
  });

  it('shows quantity after picking up duplicates', () => {
    const sword1 = makeItem({ id: 'sword', name: 'iron sword', weight: 2 });
    const sword2 = makeItem({ id: 'sword', name: 'iron sword', weight: 2 });
    const room = makeRoom({ items: [sword1, sword2] });
    const player = makePlayer('p1', room.id);

    handleCommand('take', buildCtx({ player, room, args: ['iron', 'sword'] }));
    handleCommand('take', buildCtx({ player, room, args: ['iron', 'sword'] }));

    const result = handleCommand('inventory', buildCtx({ player, room }));

    expect(text(result)).toContain('x2');
  });
});
