/**
 * rent.test.ts — Rent command tests (WI-7)
 *
 * Verifies that `rent` only works in `feature_inn` rooms, returns
 * the correct narration with action: 'rent', and is properly
 * rejected via the feature gate in all other room types.
 */

import { describe, it, expect } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { handleRent } from '../commands/handlers/rent.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, RoomType, Direction } from '../generator/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> & { type?: RoomType } = {}): Room {
  return {
    id: 'test-room',
    name: 'Test Room',
    description: 'A featureless test chamber.',
    exits: new Map<Direction, string>([['north', 'other-room']]),
    items: [],
    type: undefined,
    ...overrides,
  };
}

function makeOtherRoom(): Room {
  return {
    id: 'other-room',
    name: 'Other Room',
    description: 'Another room.',
    exits: new Map<Direction, string>([['south', 'test-room']]),
    items: [],
  };
}

function buildCtx(
  room: Room,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  const player = new PlayerState('test-session', room.id, 20);
  const otherRoom = makeOtherRoom();
  const rooms = new Map<string, Room>();
  rooms.set(room.id, room);
  rooms.set(otherRoom.id, otherRoom);

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

describe('Rent Command', () => {
  describe('handleRent handler (direct)', () => {
    it('returns narration with action rent in feature_inn room', () => {
      const room = makeRoom({ type: 'feature_inn' });
      const ctx = buildCtx(room);

      const result = handleRent(ctx);

      expect(result.narrations.length).toBeGreaterThan(0);
      expect(result.narrations[0]!.type).toBe('system');
      expect(result.action).toBe('rent');
      expect(narrationText(result)).toContain('settle your account');
    });

    it('rejects with "can\'t do that here" outside feature_inn', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room);

      const result = handleRent(ctx);

      expect(narrationText(result)).toContain("You can't do that here.");
      expect(result.action).toBeUndefined();
    });
  });

  describe('feature gate via handleCommand', () => {
    it('succeeds in feature_inn room', () => {
      const room = makeRoom({ type: 'feature_inn' });
      const ctx = buildCtx(room);

      const result = handleCommand('rent', ctx);
      const text = narrationText(result);

      expect(text).not.toContain("can't do that here");
      expect(result.narrations.length).toBeGreaterThan(0);
      expect(result.action).toBe('rent');
    });

    it('rejects in corridor room', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room);

      const result = handleCommand('rent', ctx);
      const text = narrationText(result).toLowerCase();

      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });

    it('rejects in feature_stash room', () => {
      const room = makeRoom({ type: 'feature_stash' });
      const ctx = buildCtx(room);

      const result = handleCommand('rent', ctx);
      const text = narrationText(result).toLowerCase();

      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });

    it('rejects in room with no type', () => {
      const room = makeRoom({ type: undefined });
      const ctx = buildCtx(room);

      const result = handleCommand('rent', ctx);
      const text = narrationText(result).toLowerCase();

      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });
});
