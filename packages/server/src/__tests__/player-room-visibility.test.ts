/**
 * Player Room Visibility — Unit tests for Issue #370.
 *
 * When a player enters a room or uses "look", other visible players
 * should be listed by name. Anonymous players are hidden.
 */

import { describe, it, expect } from 'vitest';
import { handleLook } from '../commands/handlers/look.js';
import { handleCommand, type CommandContext, type PlayerRef } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import { createTestRoomGraph, type Room, type Direction } from '../generator/RoomGraph.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'test-room',
    name: 'Test Chamber',
    description: 'A plain room for testing.',
    exits: new Map<Direction, string>([['north', 'north-room']]),
    items: [],
    ...overrides,
  };
}

function buildCtx(
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const rooms = new Map<string, Room>();
  rooms.set(room.id, room);
  // Add any rooms needed by resolveRoom
  if (extras.resolveRoom) {
    // use caller's resolver
  }
  return {
    player: new PlayerState('viewer-session', room.id, 20),
    room,
    args,
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    ...extras,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Player Room Visibility (Issue #370)', () => {
  describe('look command — player listing', () => {
    it('should list a visible player by name with "is here"', () => {
      const room = makeRoom();
      const ctx = buildCtx(room, [], {
        otherPlayersInRoom: ['alice-session'],
        otherPlayerInfo: [{ sessionId: 'alice-session', name: 'Alice', anon: false }],
      });

      const result = handleLook(ctx);
      expect(result.narrations[0]!.text).toContain('Alice is here.');
    });

    it('should list multiple visible players', () => {
      const room = makeRoom();
      const ctx = buildCtx(room, [], {
        otherPlayersInRoom: ['alice-session', 'bob-session'],
        otherPlayerInfo: [
          { sessionId: 'alice-session', name: 'Alice', anon: false },
          { sessionId: 'bob-session', name: 'Bob', anon: false },
        ],
      });

      const result = handleLook(ctx);
      const text = result.narrations[0]!.text;
      expect(text).toContain('Alice is here.');
      expect(text).toContain('Bob is here.');
    });

    it('should NOT list anonymous players', () => {
      const room = makeRoom();
      const ctx = buildCtx(room, [], {
        otherPlayersInRoom: ['alice-session', 'anon-session'],
        otherPlayerInfo: [
          { sessionId: 'alice-session', name: 'Alice', anon: false },
          { sessionId: 'anon-session', name: 'SneakyPete', anon: true },
        ],
      });

      const result = handleLook(ctx);
      const text = result.narrations[0]!.text;
      expect(text).toContain('Alice is here.');
      expect(text).not.toContain('SneakyPete');
    });

    it('should show nothing when all players are anonymous', () => {
      const room = makeRoom();
      const ctx = buildCtx(room, [], {
        otherPlayersInRoom: ['anon1', 'anon2'],
        otherPlayerInfo: [
          { sessionId: 'anon1', name: 'Ghost', anon: true },
          { sessionId: 'anon2', name: 'Shadow', anon: true },
        ],
      });

      const result = handleLook(ctx);
      const text = result.narrations[0]!.text;
      expect(text).not.toContain('is here.');
      expect(text).not.toContain('Ghost');
      expect(text).not.toContain('Shadow');
    });

    it('should show empty room when no other players present', () => {
      const room = makeRoom();
      const ctx = buildCtx(room);

      const result = handleLook(ctx);
      const text = result.narrations[0]!.text;
      expect(text).not.toContain('is here.');
      expect(text).not.toContain('wanderer');
    });

    it('should fall back to legacy count when otherPlayerInfo is not provided', () => {
      const room = makeRoom();
      const ctx = buildCtx(room, [], {
        otherPlayersInRoom: ['session-1', 'session-2'],
        // No otherPlayerInfo — legacy path
      });

      const result = handleLook(ctx);
      const text = result.narrations[0]!.text;
      expect(text).toContain('2 other wanderers linger here.');
    });
  });

  describe('go command — player listing in target room', () => {
    it('should list visible players in the target room after moving', () => {
      const graph = createTestRoomGraph();
      const player = new PlayerState('viewer-session', 'entry', 20);

      const playersInCorridor: PlayerRef[] = [
        { sessionId: 'alice-session', name: 'Alice', anon: false },
      ];

      const ctx: CommandContext = {
        player,
        room: graph.rooms.get('entry')!,
        args: ['north'],
        resolveRoom: (id) => graph.rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        resolvePlayersInRoom: (roomId: string) =>
          roomId === 'corridor' ? playersInCorridor : [],
      };

      const result = handleCommand('go', ctx);
      expect(result.narrations[0]!.text).toContain('Alice is here.');
    });

    it('should NOT list anon players in the target room after moving', () => {
      const graph = createTestRoomGraph();
      const player = new PlayerState('viewer-session', 'entry', 20);

      const playersInCorridor: PlayerRef[] = [
        { sessionId: 'alice-session', name: 'Alice', anon: false },
        { sessionId: 'anon-session', name: 'SneakyPete', anon: true },
      ];

      const ctx: CommandContext = {
        player,
        room: graph.rooms.get('entry')!,
        args: ['north'],
        resolveRoom: (id) => graph.rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        resolvePlayersInRoom: (roomId: string) =>
          roomId === 'corridor' ? playersInCorridor : [],
      };

      const result = handleCommand('go', ctx);
      const text = result.narrations[0]!.text;
      expect(text).toContain('Alice is here.');
      expect(text).not.toContain('SneakyPete');
    });

    it('should show no player lines when target room is empty', () => {
      const graph = createTestRoomGraph();
      const player = new PlayerState('viewer-session', 'entry', 20);

      const ctx: CommandContext = {
        player,
        room: graph.rooms.get('entry')!,
        args: ['north'],
        resolveRoom: (id) => graph.rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        resolvePlayersInRoom: () => [],
      };

      const result = handleCommand('go', ctx);
      expect(result.narrations[0]!.text).not.toContain('is here.');
    });

    it('should still work without resolvePlayersInRoom (backwards compat)', () => {
      const graph = createTestRoomGraph();
      const player = new PlayerState('viewer-session', 'entry', 20);

      const ctx: CommandContext = {
        player,
        room: graph.rooms.get('entry')!,
        args: ['north'],
        resolveRoom: (id) => graph.rooms.get(id),
        otherPlayersInRoom: [],
        stability: 1.0,
        // No resolvePlayersInRoom
      };

      const result = handleCommand('go', ctx);
      // Should not crash, just no player lines
      expect(result.narrations[0]!.text).not.toContain('is here.');
      expect(player.currentRoomId).toBe('corridor');
    });
  });
});
