/**
 * Feature-Gate Command Tests — Phase A
 *
 * Verifies that feature-gated commands (shardboard, enter, stash, store, loadout)
 * only work in rooms with the correct RoomType, while non-gated commands
 * (look, go, say, take) continue to work everywhere.
 *
 * Feature gates:
 *   feature_shardboard → shardboard, enter
 *   feature_stash      → stash, store, loadout
 *   (no gate)          → take, look, go, say, drop, inventory
 */

import { describe, it, expect } from 'vitest';
import { handleCommand, type CommandContext, type CommandResult } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, RoomType, Direction } from '../shard/RoomGraph.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<Room> & { type?: RoomType } = {}): Room {
  return {
    id: 'test-room',
    name: 'Test Room',
    description: 'A featureless test chamber.',
    exits: new Map<Direction, string>([['north', 'other-room']]),
    items: [
      { id: 'torch', name: 'battered torch', weight: 1, description: 'a torch' },
    ],
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

// ─── Feature-Gated: Shardboard ─────────────────────────────────────────────

describe('Feature-Gated Commands', () => {
  describe('shardboard command', () => {
    it('succeeds in feature_shardboard room', () => {
      const room = makeRoom({ type: 'feature_shardboard' });
      const ctx = buildCtx(room);

      const result = handleCommand('shardboard', ctx);
      // Should NOT be a "can't do that here" rejection
      const text = narrationText(result);
      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('cannot do that here');
      // Should return some meaningful response (narration about shards)
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects in non-shardboard room', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room);

      const result = handleCommand('shardboard', ctx);
      const text = narrationText(result).toLowerCase();
      // Should indicate the command is location-restricted
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('no shardboard') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });

    it('rejects in room with no type', () => {
      const room = makeRoom({ type: undefined });
      const ctx = buildCtx(room);

      const result = handleCommand('shardboard', ctx);
      const text = narrationText(result).toLowerCase();
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('no shardboard') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });

  // ─── Feature-Gated: Enter ──────────────────────────────────────────────

  describe('enter command', () => {
    it('succeeds in feature_shardboard room', () => {
      const room = makeRoom({ type: 'feature_shardboard' });
      const ctx = buildCtx(room, ['shard-123']);

      const result = handleCommand('enter', ctx);
      const text = narrationText(result);
      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('cannot do that here');
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects in non-shardboard room', () => {
      const room = makeRoom({ type: 'junction' });
      const ctx = buildCtx(room, ['shard-123']);

      const result = handleCommand('enter', ctx);
      const text = narrationText(result).toLowerCase();
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });

  // ─── Feature-Gated: Stash ─────────────────────────────────────────────

  describe('stash command', () => {
    it('succeeds in feature_stash room', () => {
      const room = makeRoom({ type: 'feature_stash' });
      const ctx = buildCtx(room);

      const result = handleCommand('stash', ctx);
      const text = narrationText(result);
      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('cannot do that here');
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects in non-stash room', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room);

      const result = handleCommand('stash', ctx);
      const text = narrationText(result).toLowerCase();
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('no stash') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });

  // ─── Feature-Gated: Store ─────────────────────────────────────────────

  describe('store command', () => {
    it('succeeds in feature_stash room', () => {
      const room = makeRoom({ type: 'feature_stash' });
      const ctx = buildCtx(room, ['rusty-sword']);

      const result = handleCommand('store', ctx);
      const text = narrationText(result);
      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('cannot do that here');
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects in non-stash room', () => {
      const room = makeRoom({ type: 'dead_end' });
      const ctx = buildCtx(room, ['rusty-sword']);

      const result = handleCommand('store', ctx);
      const text = narrationText(result).toLowerCase();
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('no stash') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });

  // ─── Feature-Gated: Loadout ───────────────────────────────────────────

  describe('loadout command', () => {
    it('succeeds in feature_stash room', () => {
      const room = makeRoom({ type: 'feature_stash' });
      const ctx = buildCtx(room);

      // 'loadout' is not yet in the parser's known verbs — the handler
      // may still be registered. If not, the fallback "nothing happens" is acceptable
      // as long as it does NOT reject based on room type.
      const result = handleCommand('loadout', ctx);
      const text = narrationText(result);
      expect(text).not.toContain("can't do that here");
      expect(text).not.toContain('cannot do that here');
      expect(result.narrations.length).toBeGreaterThan(0);
    });

    it('rejects in non-stash room', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room);

      const result = handleCommand('loadout', ctx);
      const text = narrationText(result).toLowerCase();
      expect(
        text.includes("can't") ||
        text.includes('cannot') ||
        text.includes('not available') ||
        text.includes('no stash') ||
        text.includes('nothing happens'),
      ).toBe(true);
    });
  });

  // ─── Non-Gated: Take ─────────────────────────────────────────────────

  describe('take command (NOT feature-gated)', () => {
    it('works in a corridor', () => {
      const room = makeRoom({ type: 'corridor' });
      const ctx = buildCtx(room, ['torch']);

      const result = handleCommand('take', ctx);
      const text = narrationText(result);
      expect(text).toContain('pick up');
    });

    it('works in a junction', () => {
      const room = makeRoom({ type: 'junction' });
      const ctx = buildCtx(room, ['torch']);

      const result = handleCommand('take', ctx);
      const text = narrationText(result);
      expect(text).toContain('pick up');
    });

    it('works in a feature_stash room', () => {
      const room = makeRoom({ type: 'feature_stash' });
      const ctx = buildCtx(room, ['torch']);

      const result = handleCommand('take', ctx);
      const text = narrationText(result);
      expect(text).toContain('pick up');
    });

    it('works in a feature_shardboard room', () => {
      const room = makeRoom({ type: 'feature_shardboard' });
      const ctx = buildCtx(room, ['torch']);

      const result = handleCommand('take', ctx);
      const text = narrationText(result);
      expect(text).toContain('pick up');
    });
  });

  // ─── Non-Gated: Regular commands ──────────────────────────────────────

  describe('regular commands unaffected by feature-gating', () => {
    const roomTypes: (RoomType | undefined)[] = [
      'corridor',
      'junction',
      'dead_end',
      'feature_stash',
      'feature_shardboard',
      undefined,
    ];

    for (const roomType of roomTypes) {
      describe(`in ${roomType ?? 'untyped'} room`, () => {
        it('look works', () => {
          const room = makeRoom({ type: roomType });
          const ctx = buildCtx(room);

          const result = handleCommand('look', ctx);
          expect(result.narrations.length).toBeGreaterThan(0);
          expect(result.narrations[0]!.type).toBe('room');
        });

        it('go works', () => {
          const room = makeRoom({ type: roomType });
          const ctx = buildCtx(room, ['north']);

          const result = handleCommand('go', ctx);
          // Either moves successfully or gives "no exit" — neither is a gate rejection
          const text = narrationText(result).toLowerCase();
          expect(text).not.toContain("can't do that here");
        });

        it('say works', () => {
          const room = makeRoom({ type: roomType });
          const ctx = buildCtx(room, ['hello', 'world']);

          const result = handleCommand('say', ctx);
          expect(result.narrations.length).toBeGreaterThan(0);
          expect(result.narrations[0]!.type).toBe('speech');
        });

        it('inventory works', () => {
          const room = makeRoom({ type: roomType });
          const ctx = buildCtx(room);

          const result = handleCommand('inventory', ctx);
          expect(result.narrations.length).toBeGreaterThan(0);
        });
      });
    }
  });
});
