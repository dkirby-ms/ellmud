/**
 * Item room appearance tests — #386
 * Verifies each item gets its own descriptive line (no aggregation).
 * Mirrors creature-appearance.test.ts (#383).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Item, Direction } from '../generator/RoomGraph.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-a',
    name: 'Dusty Hall',
    description: 'A dusty hall.',
    exits: new Map<Direction, string>([['north', 'room-b']]),
    items: [],
    ...overrides,
  };
}

function makeTargetRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-b',
    name: 'Dark Chamber',
    description: 'A dark chamber.',
    exits: new Map<Direction, string>([['south', 'room-a']]),
    items: [],
    ...overrides,
  };
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    name: 'rusty sword',
    weight: 3,
    description: 'A rusty sword.',
    ...overrides,
  };
}

function buildLookCtx(items: Item[], room?: Room): CommandContext {
  const r = room ?? makeRoom({ items });
  return {
    player: new PlayerState('test', r.id, 20),
    room: r,
    args: [],
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
  };
}

function buildGoCtx(items: Item[]): CommandContext {
  const roomA = makeRoom();
  const roomB = makeTargetRoom({ items });
  const rooms = new Map<string, Room>([[roomA.id, roomA], [roomB.id, roomB]]);

  return {
    player: new PlayerState('test', roomA.id, 20),
    room: roomA,
    args: ['north'],
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
  };
}

function buildGotoCtx(items: Item[]): CommandContext {
  const roomA = makeRoom();
  const roomB = makeTargetRoom({ items });
  const rooms = new Map<string, Room>([[roomA.id, roomA], [roomB.id, roomB]]);

  return {
    player: new PlayerState('test', roomA.id, 20),
    room: roomA,
    args: ['room-b'],
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
  };
}

function text(result: ReturnType<typeof handleCommand>): string {
  return result.narrations.map((n) => n.text).join('\n');
}

// ─── look tests ─────────────────────────────────────────────────────────

describe('item appearance in room (#386)', () => {
  describe('look', () => {
    it('shows one line per item even when multiple present', () => {
      const items = [
        item({ id: 'i1', name: 'rusty sword', roomDescription: 'A rusty sword leans against the wall.' }),
        item({ id: 'i2', name: 'rusty sword', roomDescription: 'A rusty sword leans against the wall.' }),
        item({ id: 'i3', name: 'dented shield', roomDescription: 'A dented shield rests on the floor.' }),
      ];
      const output = text(handleCommand('look', buildLookCtx(items)));

      const swordMatches = output.match(/A rusty sword leans against the wall\./g);
      expect(swordMatches).toHaveLength(2);
      expect(output).toContain('A dented shield rests on the floor.');
      expect(output).not.toContain('You see:');
    });

    it('uses roomDescription when present', () => {
      const i = item({ roomDescription: 'A battered torch flickers in the dust.' });
      const output = text(handleCommand('look', buildLookCtx([i])));
      expect(output).toContain('A battered torch flickers in the dust.');
    });

    it('falls back to default text when no roomDescription', () => {
      const i = item({ name: 'crude bandage' });
      const output = text(handleCommand('look', buildLookCtx([i])));
      expect(output).toContain('A crude bandage lies here.');
    });

    it('passes ANSI tags through verbatim', () => {
      const i = item({ roomDescription: '[cyan]An anomalous relic[/cyan] hums with energy.' });
      const output = text(handleCommand('look', buildLookCtx([i])));
      expect(output).toContain('[cyan]An anomalous relic[/cyan] hums with energy.');
    });

    it('shows nothing when no items present', () => {
      const output = text(handleCommand('look', buildLookCtx([])));
      expect(output).not.toContain('lies here');
      expect(output).not.toContain('You see:');
    });
  });

  // ─── go tests ───────────────────────────────────────────────────────

  describe('go', () => {
    it('shows one line per item in target room', () => {
      const items = [
        item({ id: 'i1', name: 'rusty sword', roomDescription: 'A rusty sword leans against the wall.' }),
        item({ id: 'i2', name: 'dented shield', roomDescription: 'A dented shield rests on the floor.' }),
      ];
      const output = text(handleCommand('go', buildGoCtx(items)));

      expect(output).toContain('A rusty sword leans against the wall.');
      expect(output).toContain('A dented shield rests on the floor.');
      expect(output).not.toContain('You see:');
    });

    it('uses roomDescription for items in target room', () => {
      const i = item({ roomDescription: 'A corroded halberd juts from the rubble.' });
      const output = text(handleCommand('go', buildGoCtx([i])));
      expect(output).toContain('A corroded halberd juts from the rubble.');
    });

    it('falls back to default text for items without roomDescription', () => {
      const i = item({ name: 'old key' });
      const output = text(handleCommand('go', buildGoCtx([i])));
      expect(output).toContain('A old key lies here.');
    });
  });

  // ─── goto tests ─────────────────────────────────────────────────────

  describe('goto', () => {
    beforeEach(() => {
      process.env.DEV_MODE_ENABLED = 'true';
      resetConfig();
    });

    afterEach(() => {
      delete process.env.DEV_MODE_ENABLED;
      resetConfig();
    });

    it('shows one line per item in teleport target', () => {
      const items = [
        item({ id: 'i1', name: 'rusty sword', roomDescription: 'A rusty sword leans against the wall.' }),
        item({ id: 'i2', name: 'dented shield', roomDescription: 'A dented shield rests on the floor.' }),
      ];
      const output = text(handleCommand('goto', buildGotoCtx(items)));

      expect(output).toContain('A rusty sword leans against the wall.');
      expect(output).toContain('A dented shield rests on the floor.');
      expect(output).not.toContain('You see:');
    });

    it('uses roomDescription for items in teleport target', () => {
      const i = item({ roomDescription: '[bold]A glowing shard[/bold] pulses on the ground.' });
      const output = text(handleCommand('goto', buildGotoCtx([i])));
      expect(output).toContain('[bold]A glowing shard[/bold] pulses on the ground.');
    });

    it('falls back to default text for items without roomDescription', () => {
      const i = item({ name: 'bone fragment' });
      const output = text(handleCommand('goto', buildGotoCtx([i])));
      expect(output).toContain('A bone fragment lies here.');
    });
  });
});
