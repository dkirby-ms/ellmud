/**
 * Container command tests — Issue #409 Phase 4.
 *
 * Covers: open, put X in Y, take X from Y commands for container items.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ALL_FIXTURE_ITEMS,
  buildFixtureRegistry,
  TATTERED_SATCHEL,
  EXPEDITION_PACK,
  APOTHECARY_POUCH,
  RUSTY_BLADE,
  HEALING_DRAUGHT,
} from './helpers/item-fixtures.js';

// Mock ContentRegistry so open/put/take handlers can resolve item definitions.
const FIXTURE_MAP = buildFixtureRegistry();
vi.mock('../content/index.js', () => ({
  getContentRegistry: () => ({
    isInitialized: () => true,
    getItem: (id: string) => FIXTURE_MAP.get(id),
    getAllItems: () => Array.from(FIXTURE_MAP.values()),
  }),
}));

import { handleCommand, type CommandContext } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Item, Room } from '../generator/RoomGraph.js';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeItem(def: { id: string; name: string; weight: number; description: string; soulbound?: boolean }, containerContents?: Item['containerContents']): Item {
  return {
    id: def.id,
    name: def.name,
    weight: def.weight,
    description: def.description,
    soulbound: def.soulbound,
    containerContents,
  };
}

function makeRoom(): Room {
  return {
    id: 'test-room',
    name: 'Test Room',
    description: 'A plain room.',
    exits: new Map(),
    items: [],
  };
}

function buildCtx(player: PlayerState, room: Room, args: string[] = [], characterName?: string): CommandContext {
  return {
    player,
    room,
    args,
    resolveRoom: () => room,
    otherPlayersInRoom: [],
    stability: 1.0,
    characterName,
  };
}

// ─── Parser Tests ───────────────────────────────────────────────────────────

describe('Container Command Parser', () => {
  it('should parse "open" as a known verb', () => {
    const result = parseCommand('open satchel');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('open');
      expect(result.command.args).toEqual(['satchel']);
    }
  });

  it('should parse "put" as a known verb', () => {
    const result = parseCommand('put blade in satchel');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('put');
      expect(result.command.args).toEqual(['blade', 'in', 'satchel']);
    }
  });
});

// ─── Open Command ───────────────────────────────────────────────────────────

describe('open command', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    player = new PlayerState('test-session', 'test-room', 50);
    room = makeRoom();
  });

  it('should show empty container contents', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, []));
    const result = handleCommand('open', buildCtx(player, room, ['satchel']));

    expect(result.narrations[0]!.text).toContain('Tattered Satchel');
    expect(result.narrations[0]!.text).toContain('(empty)');
    expect(result.narrations[0]!.text).toContain('Slots: 0/4');
  });

  it('should show container contents with items', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
      { definitionId: 'healing_draught', quantity: 3, durability: null },
    ]));
    const result = handleCommand('open', buildCtx(player, room, ['satchel']));
    const text = result.narrations[0]!.text;

    expect(text).toContain('Tattered Satchel');
    expect(text).toContain('Rusty Blade');
    expect(text).toContain('Healing Draught (x3)');
    expect(text).toContain('Slots: 2/4');
  });

  it('should show weight info when container has maxWeight', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
    ]));
    const result = handleCommand('open', buildCtx(player, room, ['satchel']));

    expect(result.narrations[0]!.text).toContain('Weight: 5/10');
  });

  it('should error on non-container item', () => {
    player.addItem(makeItem(RUSTY_BLADE));
    const result = handleCommand('open', buildCtx(player, room, ['blade']));

    expect(result.narrations[0]!.text).toContain('not a container');
  });

  it('should error when item not in inventory', () => {
    const result = handleCommand('open', buildCtx(player, room, ['satchel']));

    expect(result.narrations[0]!.text).toContain('not carrying');
  });

  it('should error with no args', () => {
    const result = handleCommand('open', buildCtx(player, room));

    expect(result.narrations[0]!.text).toContain('Open what?');
  });
});

// ─── Put Command ────────────────────────────────────────────────────────────

describe('put command', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    player = new PlayerState('test-session', 'test-room', 50);
    room = makeRoom();
  });

  it('should put an item into a container', () => {
    player.addItem(makeItem(RUSTY_BLADE));
    player.addItem(makeItem(TATTERED_SATCHEL, []));

    const result = handleCommand('put', buildCtx(player, room, ['rusty', 'blade', 'in', 'satchel']));
    const text = result.narrations[0]!.text;

    expect(text).toContain('You put Rusty Blade in Tattered Satchel');
    // Item removed from inventory
    expect(player.findItem('rusty_blade')).toBeNull();
    // Item added to container contents
    const satchel = player.findItem('tattered_satchel')!;
    expect(satchel.item.containerContents).toHaveLength(1);
    expect(satchel.item.containerContents![0]!.definitionId).toBe('rusty_blade');
  });

  it('should generate room event', () => {
    player.addItem(makeItem(RUSTY_BLADE));
    player.addItem(makeItem(TATTERED_SATCHEL, []));

    const result = handleCommand('put', buildCtx(player, room, ['blade', 'in', 'satchel'], 'TestPlayer')) as CommandResult & { _roomEvent?: string };

    expect(result._roomEvent).toContain('TestPlayer');
    expect(result._roomEvent).toContain('Tattered Satchel');
  });

  it('should reject when container is full', () => {
    // Tattered satchel has 4 slots max
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'item_a', quantity: 1, durability: null },
      { definitionId: 'item_b', quantity: 1, durability: null },
      { definitionId: 'item_c', quantity: 1, durability: null },
      { definitionId: 'item_d', quantity: 1, durability: null },
    ]));
    player.addItem(makeItem(RUSTY_BLADE));

    const result = handleCommand('put', buildCtx(player, room, ['blade', 'in', 'satchel']));

    expect(result.narrations[0]!.text).toContain('full');
    // Item should still be in inventory
    expect(player.findItem('rusty_blade')).not.toBeNull();
  });

  it('should reject restricted item type (allowedItemTypes)', () => {
    // Apothecary's pouch only accepts consumables
    player.addItem(makeItem(APOTHECARY_POUCH, []));
    player.addItem(makeItem(RUSTY_BLADE));

    const result = handleCommand('put', buildCtx(player, room, ['blade', 'in', 'pouch']));

    expect(result.narrations[0]!.text).toContain('does not accept');
    expect(player.findItem('rusty_blade')).not.toBeNull();
  });

  it('should accept correct item type in restricted container', () => {
    player.addItem(makeItem(APOTHECARY_POUCH, []));
    player.addItem(makeItem(HEALING_DRAUGHT));

    const result = handleCommand('put', buildCtx(player, room, ['draught', 'in', 'pouch']));

    expect(result.narrations[0]!.text).toContain('You put');
    expect(player.findItem('healing_draught')).toBeNull();
    const pouch = player.findItem('apothecary')!;
    expect(pouch.item.containerContents).toHaveLength(1);
  });

  it('should reject putting a container inside another container', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, []));
    player.addItem(makeItem(EXPEDITION_PACK, []));

    const result = handleCommand('put', buildCtx(player, room, ['satchel', 'in', 'expedition', 'pack']));

    expect(result.narrations[0]!.text).toContain('Cannot place a container');
  });

  it('should reject when weight limit exceeded', () => {
    // Tattered satchel maxWeight = 10, rusty blade weight = 5
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
    ]));
    // Add a second rusty blade (5 + 5 = 10, exactly at limit)
    player.addItem(makeItem(RUSTY_BLADE));
    const result1 = handleCommand('put', buildCtx(player, room, ['blade', 'in', 'satchel']));
    expect(result1.narrations[0]!.text).toContain('You put');

    // Add a heavy item that would exceed limit
    const heavyItem: Item = { id: 'iron_sword', name: 'Iron Sword', weight: 6, description: 'A sword.' };
    player.addItem(heavyItem);
    const result2 = handleCommand('put', buildCtx(player, room, ['sword', 'in', 'satchel']));
    expect(result2.narrations[0]!.text).toContain('weight limit');
  });

  it('should error with no args', () => {
    const result = handleCommand('put', buildCtx(player, room));

    expect(result.narrations[0]!.text).toContain('Put what where?');
  });

  it('should error without "in" preposition', () => {
    const result = handleCommand('put', buildCtx(player, room, ['blade']));

    expect(result.narrations[0]!.text).toContain('Put it where?');
  });

  it('should error on non-container target', () => {
    player.addItem(makeItem(RUSTY_BLADE));
    player.addItem(makeItem({ id: 'healing_draught', name: 'Healing Draught', weight: 1, description: 'A potion.' }));

    const result = handleCommand('put', buildCtx(player, room, ['blade', 'in', 'draught']));

    expect(result.narrations[0]!.text).toContain('not a container');
  });

  it('should not put item into itself', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, []));

    const result = handleCommand('put', buildCtx(player, room, ['satchel', 'in', 'satchel']));

    expect(result.narrations[0]!.text).toContain("can't put");
  });

  it('should stack items with same definitionId', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'healing_draught', quantity: 1, durability: null },
    ]));
    player.addItem(makeItem(HEALING_DRAUGHT));

    const result = handleCommand('put', buildCtx(player, room, ['draught', 'in', 'satchel']));

    expect(result.narrations[0]!.text).toContain('You put');
    const satchel = player.findItem('satchel')!;
    expect(satchel.item.containerContents).toHaveLength(1);
    expect(satchel.item.containerContents![0]!.quantity).toBe(2);
  });
});

// ─── Take From Container ────────────────────────────────────────────────────

describe('take from container', () => {
  let player: PlayerState;
  let room: Room;

  beforeEach(() => {
    player = new PlayerState('test-session', 'test-room', 50);
    room = makeRoom();
  });

  it('should take an item from a container', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
    ]));

    const result = handleCommand('take', buildCtx(player, room, ['blade', 'from', 'satchel']));
    const text = result.narrations[0]!.text;

    expect(text).toContain('You take Rusty Blade from Tattered Satchel');
    // Item added to inventory
    expect(player.findItem('rusty_blade')).not.toBeNull();
    // Item removed from container
    const satchel = player.findItem('tattered_satchel')!;
    expect(satchel.item.containerContents).toHaveLength(0);
  });

  it('should generate room event', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
    ]));

    const result = handleCommand('take', buildCtx(player, room, ['blade', 'from', 'satchel'], 'TestPlayer')) as CommandResult & { _roomEvent?: string };

    expect(result._roomEvent).toContain('TestPlayer');
    expect(result._roomEvent).toContain('Tattered Satchel');
  });

  it('should reduce stack quantity on partial take', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'healing_draught', quantity: 3, durability: null },
    ]));

    const result = handleCommand('take', buildCtx(player, room, ['draught', 'from', 'satchel']));

    expect(result.narrations[0]!.text).toContain('You take');
    const satchel = player.findItem('tattered_satchel')!;
    expect(satchel.item.containerContents).toHaveLength(1);
    expect(satchel.item.containerContents![0]!.quantity).toBe(2);
  });

  it('should error on empty container', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, []));

    const result = handleCommand('take', buildCtx(player, room, ['blade', 'from', 'satchel']));

    expect(result.narrations[0]!.text).toContain('empty');
  });

  it('should error when item not in container', () => {
    player.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'healing_draught', quantity: 1, durability: null },
    ]));

    const result = handleCommand('take', buildCtx(player, room, ['blade', 'from', 'satchel']));

    expect(result.narrations[0]!.text).toContain("doesn't contain");
  });

  it('should error when container not in inventory', () => {
    const result = handleCommand('take', buildCtx(player, room, ['blade', 'from', 'satchel']));

    expect(result.narrations[0]!.text).toContain('not carrying');
  });

  it('should error on non-container item', () => {
    player.addItem(makeItem(RUSTY_BLADE));

    const result = handleCommand('take', buildCtx(player, room, ['something', 'from', 'blade']));

    expect(result.narrations[0]!.text).toContain('not a container');
  });

  it('should reject when too heavy to carry', () => {
    const lightPlayer = new PlayerState('test-session', 'test-room', 3);
    lightPlayer.addItem(makeItem(TATTERED_SATCHEL, [
      { definitionId: 'rusty_blade', quantity: 1, durability: null },
    ]));

    const result = handleCommand('take', buildCtx(lightPlayer, room, ['blade', 'from', 'satchel']));

    expect(result.narrations[0]!.text).toContain('too heavy');
  });

  it('should still pick up from room when no "from" preposition', () => {
    room.items.push({ id: 'rusty_blade', name: 'Rusty Blade', weight: 5, description: 'A blade.' });

    const result = handleCommand('take', buildCtx(player, room, ['blade']));

    expect(result.narrations[0]!.text).toContain('pick up');
    expect(player.findItem('rusty_blade')).not.toBeNull();
  });
});

// Augment CommandResult for _roomEvent
type CommandResult = ReturnType<typeof handleCommand>;
