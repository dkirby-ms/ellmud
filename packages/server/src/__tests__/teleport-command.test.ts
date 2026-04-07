/**
 * teleport command tests — dev-only teleport of a target player to any room by slug.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { parseCommand } from '../commands/parser.js';
import { PlayerState } from '../state/PlayerState.js';
import { resetConfig } from '../config.js';
import type { Room, Direction } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'start-room',
    name: 'Start Room',
    description: 'The starting room.',
    exits: new Map<Direction, string>([['north', 'target-room']]),
    items: [],
    ...overrides,
  };
}

function makeTargetRoom(): Room {
  return {
    id: 'target-room',
    name: 'Secret Chamber',
    description: 'A hidden chamber deep underground.',
    exits: new Map<Direction, string>([['south', 'start-room']]),
    items: [],
  };
}

function buildCtx(
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = new PlayerState('admin-session', room.id, 20);
  const targetPlayer = new PlayerState('target-session', room.id, 20);
  const rooms = new Map<string, Room>();
  const targetRoom = makeTargetRoom();
  rooms.set(room.id, room);
  rooms.set(targetRoom.id, targetRoom);

  const knownPlayers = new Map<string, { sessionId: string; player: PlayerState; characterName: string }>();
  knownPlayers.set('gandalf', { sessionId: 'target-session', player: targetPlayer, characterName: 'Gandalf' });

  return {
    player,
    room,
    args,
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: ['target-session'],
    stability: 1.0,
    resolvePlayerByName: (name: string) => knownPlayers.get(name.toLowerCase()),
    ...extras,
  };
}

function narrationText(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('teleport command', () => {
  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    delete process.env.DEV_MODE_ENABLED;
    resetConfig();
  });

  it('rejects when DEV_MODE_ENABLED is false', () => {
    process.env.DEV_MODE_ENABLED = 'false';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['Gandalf', 'target-room']);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    expect(text).toContain('not available');
  });

  it('successfully teleports target player to room', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['Gandalf', 'target-room']);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    // Admin sees confirmation
    expect(text).toContain('You teleported Gandalf to Secret Chamber.');

    // Target player was moved
    const target = ctx.resolvePlayerByName!('Gandalf')!;
    expect(target.player.currentRoomId).toBe('target-room');

    // Target narrations are set
    expect(result.targetNarrations).toBeDefined();
    expect(result.targetNarrations!.sessionId).toBe('target-session');
    const targetText = result.targetNarrations!.narrations.map((n) => n.text).join('\n');
    expect(targetText).toContain('You have been teleported to Secret Chamber.');
  });

  it('returns error when player not found', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['UnknownPlayer', 'target-room']);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    expect(text).toContain("No player named 'UnknownPlayer' found in this zone.");
  });

  it('returns error when room not found', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['Gandalf', 'nonexistent-room']);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    expect(text).toContain("No room with slug 'nonexistent-room' in this zone.");
    // Player should NOT have been moved
    const target = ctx.resolvePlayerByName!('Gandalf')!;
    expect(target.player.currentRoomId).toBe('start-room');
  });

  it('requires both arguments (missing all)', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, []);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    expect(text).toContain('teleport <player-name> <room-slug>');
  });

  it('requires both arguments (missing room)', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['Gandalf']);
    const result = handleCommand('teleport', ctx);
    const text = narrationText(result);

    expect(text).toContain('teleport <player-name> <room-slug>');
  });

  it('parses correctly as a known verb', () => {
    const result = parseCommand('teleport Gandalf target-room');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('teleport');
      expect(result.command.args).toEqual(['Gandalf', 'target-room']);
    }
  });
});
