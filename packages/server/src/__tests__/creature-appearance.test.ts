/**
 * Creature room appearance tests — #383
 * Verifies each creature gets its own line (no type-aggregation).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CreatureRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Direction } from '../generator/RoomGraph.js';

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

function creature(overrides: Partial<CreatureRef> = {}): CreatureRef {
  return { id: 'c1', name: 'goblin', ...overrides };
}

function buildLookCtx(
  creatures: CreatureRef[],
  room?: Room,
): CommandContext {
  const r = room ?? makeRoom();
  return {
    player: new PlayerState('test', r.id, 20),
    room: r,
    args: [],
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    creaturesInRoom: creatures,
  };
}

function buildGoCtx(
  creatures: CreatureRef[],
): CommandContext {
  const roomA = makeRoom();
  const roomB = makeTargetRoom();
  const rooms = new Map<string, Room>([[roomA.id, roomA], [roomB.id, roomB]]);

  return {
    player: new PlayerState('test', roomA.id, 20),
    room: roomA,
    args: ['north'],
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    resolveCreaturesInRoom: () => creatures,
  };
}

function buildGotoCtx(
  creatures: CreatureRef[],
): CommandContext {
  const roomA = makeRoom();
  const roomB = makeTargetRoom();
  const rooms = new Map<string, Room>([[roomA.id, roomA], [roomB.id, roomB]]);

  return {
    player: new PlayerState('test', roomA.id, 20),
    room: roomA,
    args: ['room-b'],
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    resolveCreaturesInRoom: () => creatures,
  };
}

function text(result: ReturnType<typeof handleCommand>): string {
  return result.narrations.map((n) => n.text).join('\n');
}

// ─── look tests ─────────────────────────────────────────────────────────

describe('creature appearance in room (#383)', () => {
  describe('look', () => {
    it('shows one line per creature even when same type', () => {
      const creatures = [
        creature({ id: 'r1', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
        creature({ id: 'r2', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
        creature({ id: 'r3', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
      ];
      const output = text(handleCommand('look', buildLookCtx(creatures)));

      const matches = output.match(/A slum rat sniffs along the ground\./g);
      expect(matches).toHaveLength(3);
      expect(output).not.toContain('(x3)');
    });

    it('uses roomDescription when present', () => {
      const c = creature({ roomDescription: 'A goblin crouches here.' });
      const output = text(handleCommand('look', buildLookCtx([c])));
      expect(output).toContain('A goblin crouches here.');
    });

    it('falls back to default text when no roomDescription', () => {
      const c = creature({ name: 'kobold' });
      const output = text(handleCommand('look', buildLookCtx([c])));
      expect(output).toContain('A kobold lurks here.');
    });

    it('passes ANSI tags through verbatim', () => {
      const c = creature({ roomDescription: '[red]A fire imp[/red] smolders here.' });
      const output = text(handleCommand('look', buildLookCtx([c])));
      expect(output).toContain('[red]A fire imp[/red] smolders here.');
    });

    it('shows nothing when no creatures present', () => {
      const output = text(handleCommand('look', buildLookCtx([])));
      expect(output).not.toContain('lurks here');
    });
  });

  // ─── go tests ───────────────────────────────────────────────────────

  describe('go', () => {
    it('shows one line per creature in target room', () => {
      const creatures = [
        creature({ id: 'r1', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
        creature({ id: 'r2', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
      ];
      const output = text(handleCommand('go', buildGoCtx(creatures)));

      const matches = output.match(/A slum rat sniffs along the ground\./g);
      expect(matches).toHaveLength(2);
      expect(output).not.toContain('(x2)');
    });

    it('uses roomDescription for creatures in target room', () => {
      const c = creature({ roomDescription: 'A hollow stalker drifts in the shadows.' });
      const output = text(handleCommand('go', buildGoCtx([c])));
      expect(output).toContain('A hollow stalker drifts in the shadows.');
    });

    it('falls back to default text for creatures without roomDescription', () => {
      const c = creature({ name: 'troll' });
      const output = text(handleCommand('go', buildGoCtx([c])));
      expect(output).toContain('A troll lurks here.');
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

    it('shows one line per creature in teleport target', () => {
      const creatures = [
        creature({ id: 'r1', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
        creature({ id: 'r2', name: 'slum rat', type: 'slum_rat', roomDescription: 'A slum rat sniffs along the ground.' }),
      ];
      const output = text(handleCommand('goto', buildGotoCtx(creatures)));

      const matches = output.match(/A slum rat sniffs along the ground\./g);
      expect(matches).toHaveLength(2);
      expect(output).not.toContain('(x2)');
    });

    it('uses roomDescription for creatures in teleport target', () => {
      const c = creature({ roomDescription: '[bold]The Collapsed One[/bold] looms here.' });
      const output = text(handleCommand('goto', buildGotoCtx([c])));
      expect(output).toContain('[bold]The Collapsed One[/bold] looms here.');
    });

    it('falls back to default text for creatures without roomDescription', () => {
      const c = creature({ name: 'shade' });
      const output = text(handleCommand('goto', buildGotoCtx([c])));
      expect(output).toContain('A shade lurks here.');
    });
  });
});
