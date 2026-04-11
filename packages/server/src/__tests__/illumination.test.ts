/**
 * Room illumination tests — Issue #402
 * Verifies dark rooms show darkness message instead of room contents.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CreatureRef } from '../commands/index.js';
import { handleLook } from '../commands/handlers/look.js';
import { handleGo } from '../commands/handlers/go.js';
import { handleGoto } from '../commands/handlers/goto.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import { DARKNESS_MESSAGE } from '@ellmud/shared';
import type { Room, Direction } from '../generator/RoomGraph.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'lit-room',
    name: 'Torch Hall',
    description: 'A well-lit hall with torches on the walls.',
    exits: new Map<Direction, string>([['north', 'dark-room']]),
    items: [{ id: 'sword', name: 'rusty sword', weight: 3, description: 'A rusty blade.' }],
    ...overrides,
  };
}

function makeDarkRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'dark-room',
    name: 'Lightless Pit',
    description: 'A yawning abyss of absolute darkness.',
    exits: new Map<Direction, string>([['south', 'lit-room']]),
    items: [{ id: 'gem', name: 'glowing gem', weight: 1, description: 'A faintly glowing gem.' }],
    illumination: 'dark',
    ...overrides,
  };
}

function creature(overrides: Partial<CreatureRef> = {}): CreatureRef {
  return { id: 'c1', name: 'shadow lurker', ...overrides };
}

function text(result: ReturnType<typeof handleCommand>): string {
  return result.narrations.map(n => n.text).join('\n');
}

// ─── look tests ─────────────────────────────────────────────────────────

describe('illumination system (#402)', () => {
  describe('look in dark rooms', () => {
    it('shows darkness message instead of room description', () => {
      const room = makeDarkRoom();
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
        creaturesInRoom: [creature()],
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain(DARKNESS_MESSAGE);
      expect(output).not.toContain(room.description);
      expect(output).not.toContain('shadow lurker');
      expect(output).not.toContain('glowing gem');
    });

    it('still shows exits in dark rooms', () => {
      const room = makeDarkRoom();
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain('Exits: south');
    });

    it('returns roomHeader even for dark rooms', () => {
      const room = makeDarkRoom();
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      expect(result.roomHeader).toBeDefined();
      expect(result.roomHeader!.roomName).toBe('Lightless Pit');
    });

    it('blocks examining features in dark rooms', () => {
      const room = makeDarkRoom({
        features: [{
          id: 'inscription',
          keywords: ['inscription'],
          name: 'Ancient Inscription',
          description: 'Runes glow faintly.',
          type: 'readable',
        }],
      });
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: ['inscription'],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain(DARKNESS_MESSAGE);
      expect(output).not.toContain('Runes glow faintly');
    });
  });

  describe('look in lit rooms', () => {
    it('shows full room description normally', () => {
      const room = makeRoom();
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
        creaturesInRoom: [creature()],
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain(room.description);
      expect(output).toContain('shadow lurker');
      expect(output).not.toContain(DARKNESS_MESSAGE);
    });

    it('shows full room for rooms without illumination field (default lit)', () => {
      const room = makeRoom(); // no illumination field
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain(room.description);
      expect(output).not.toContain(DARKNESS_MESSAGE);
    });
  });

  // ─── go tests ───────────────────────────────────────────────────────────

  describe('go into dark rooms', () => {
    it('shows darkness message when entering a dark room', () => {
      const litRoom = makeRoom();
      const darkRoom = makeDarkRoom();
      const rooms = new Map<string, Room>([
        [litRoom.id, litRoom],
        [darkRoom.id, darkRoom],
      ]);

      const ctx: CommandContext = {
        player: new PlayerState('test', litRoom.id, 20),
        room: litRoom,
        args: ['north'],
        resolveRoom: id => rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        resolveCreaturesInRoom: () => [creature()],
      };

      const result = handleGo(ctx);
      const output = text(result);
      expect(output).toContain('You move north.');
      expect(output).toContain(DARKNESS_MESSAGE);
      expect(output).toContain('Exits: south');
      expect(output).not.toContain(darkRoom.description);
      expect(output).not.toContain('shadow lurker');
      expect(output).not.toContain('glowing gem');
    });

    it('still moves the player into the dark room', () => {
      const litRoom = makeRoom();
      const darkRoom = makeDarkRoom();
      const rooms = new Map<string, Room>([
        [litRoom.id, litRoom],
        [darkRoom.id, darkRoom],
      ]);

      const player = new PlayerState('test', litRoom.id, 20);
      const ctx: CommandContext = {
        player,
        room: litRoom,
        args: ['north'],
        resolveRoom: id => rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
      };

      handleGo(ctx);
      expect(player.currentRoomId).toBe('dark-room');
    });

    it('shows full description when entering a lit room', () => {
      const darkRoom = makeDarkRoom({
        exits: new Map<Direction, string>([['south', 'lit-room']]),
      });
      const litRoom = makeRoom({
        id: 'lit-room',
        exits: new Map<Direction, string>([['north', 'dark-room']]),
      });
      const rooms = new Map<string, Room>([
        [litRoom.id, litRoom],
        [darkRoom.id, darkRoom],
      ]);

      const ctx: CommandContext = {
        player: new PlayerState('test', darkRoom.id, 20),
        room: darkRoom,
        args: ['south'],
        resolveRoom: id => rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
      };

      const result = handleGo(ctx);
      const output = text(result);
      expect(output).toContain(litRoom.description);
      expect(output).not.toContain(DARKNESS_MESSAGE);
    });
  });

  // ─── goto tests ─────────────────────────────────────────────────────────

  describe('goto dark rooms', () => {
    afterEach(() => {
      delete process.env.DEV_MODE_ENABLED;
      resetConfig();
    });

    it('shows darkness message when teleporting to a dark room', () => {
      process.env.DEV_MODE_ENABLED = 'true';
      resetConfig();

      const litRoom = makeRoom();
      const darkRoom = makeDarkRoom();
      const rooms = new Map<string, Room>([
        [litRoom.id, litRoom],
        [darkRoom.id, darkRoom],
      ]);

      const ctx: CommandContext = {
        player: new PlayerState('test', litRoom.id, 20),
        room: litRoom,
        args: ['dark-room'],
        resolveRoom: id => rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        zoneSlug: 'test-zone',
        resolveCreaturesInRoom: () => [creature()],
      };

      const result = handleGoto(ctx);
      const output = text(result);
      expect(output).toContain('Teleported to Lightless Pit.');
      expect(output).toContain(DARKNESS_MESSAGE);
      expect(output).toContain('Exits: south');
      expect(output).not.toContain(darkRoom.description);
      expect(output).not.toContain('shadow lurker');
    });

    it('shows full description when teleporting to a lit room', () => {
      process.env.DEV_MODE_ENABLED = 'true';
      resetConfig();

      const litRoom = makeRoom();
      const targetRoom = makeRoom({
        id: 'target',
        name: 'Bright Room',
        description: 'Sunlight fills this space.',
        exits: new Map<Direction, string>(),
      });
      const rooms = new Map<string, Room>([
        [litRoom.id, litRoom],
        [targetRoom.id, targetRoom],
      ]);

      const ctx: CommandContext = {
        player: new PlayerState('test', litRoom.id, 20),
        room: litRoom,
        args: ['target'],
        resolveRoom: id => rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        zoneSlug: 'test-zone',
      };

      const result = handleGoto(ctx);
      const output = text(result);
      expect(output).toContain('Sunlight fills this space.');
      expect(output).not.toContain(DARKNESS_MESSAGE);
    });
  });

  // ─── edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('hides other players in dark rooms', () => {
      const room = makeDarkRoom();
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: ['player2'],
        otherPlayerInfo: [{ sessionId: 's2', name: 'Gandalf', anon: false }],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).toContain(DARKNESS_MESSAGE);
      expect(output).not.toContain('Gandalf');
    });

    it('hides items on ground in dark rooms', () => {
      const room = makeDarkRoom({
        items: [
          { id: 'gold', name: 'gold coin', weight: 0.1, description: 'Shiny gold.', roomDescription: 'A gold coin glints on the floor.' },
        ],
      });
      const ctx: CommandContext = {
        player: new PlayerState('test', room.id, 20),
        room,
        args: [],
        resolveRoom: () => undefined,
        otherPlayersInRoom: [],
        stability: 1.0,
      };
      const result = handleLook(ctx);
      const output = text(result);
      expect(output).not.toContain('gold coin');
      expect(output).not.toContain('glints');
    });

    it('DARKNESS_MESSAGE constant is correct', () => {
      expect(DARKNESS_MESSAGE).toBe("It is pitch black. You can't see a thing.");
    });
  });
});
