/**
 * goto command tests — dev-only teleport to any room by slug.
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
    items: [{ id: 'gem', name: 'glowing gem', weight: 1, description: 'A softly glowing gem.' }],
  };
}

function buildCtx(
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = new PlayerState('test-session', room.id, 20);
  const rooms = new Map<string, Room>();
  const targetRoom = makeTargetRoom();
  rooms.set(room.id, room);
  rooms.set(targetRoom.id, targetRoom);

  return {
    player,
    room,
    args,
    resolveRoom: (id) => rooms.get(id),
    otherPlayersInRoom: [],
    stability: 1.0,
    ...extras,
  };
}

function narrationText(result: CommandResult): string {
  return result.narrations.map((n) => n.text).join('\n');
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('goto command', () => {
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
    const ctx = buildCtx(room, ['target-room']);
    const result = handleCommand('goto', ctx);
    const text = narrationText(result);

    expect(text).toContain('not available');
  });

  it('teleports to valid room slug', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['target-room']);
    const result = handleCommand('goto', ctx);
    const text = narrationText(result);

    expect(ctx.player.currentRoomId).toBe('target-room');
    expect(text).toContain('Teleported to Secret Chamber.');
    expect(text).toContain('A hidden chamber deep underground.');
    expect(text).toContain('glowing gem');
    expect(result.roomHeader).toBeDefined();
    expect(result.roomHeader!.roomName).toBe('Secret Chamber');
  });

  it('returns error on invalid room slug', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, ['nonexistent-room']);
    const result = handleCommand('goto', ctx);
    const text = narrationText(result);

    expect(text).toContain("No room with slug 'nonexistent-room' in this zone.");
    expect(ctx.player.currentRoomId).toBe('start-room');
  });

  it('requires an argument (no bare goto)', () => {
    process.env.DEV_MODE_ENABLED = 'true';
    resetConfig();

    const room = makeRoom();
    const ctx = buildCtx(room, []);
    const result = handleCommand('goto', ctx);
    const text = narrationText(result);

    expect(text).toContain('goto <room-slug>');
  });

  it('parses correctly as a known verb', () => {
    const result = parseCommand('goto target-room');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.command.verb).toBe('goto');
      expect(result.command.args).toEqual(['target-room']);
    }
  });
});
