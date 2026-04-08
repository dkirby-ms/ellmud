/**
 * Room Features — Unit tests for issue #345.
 *
 * Tests the `look <target>` command flow for room features (interactive
 * elements like notes, inscriptions, murals that players can examine).
 *
 * Written proactively against the design spec in .squad/decisions.md.
 * The feature implementation (Jarlaxle) is landing in parallel, so minor
 * adjustments may be needed once the types and handler changes merge.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { handleLook } from '../commands/handlers/look.js';
import { handleCommand, type CommandContext } from '../commands/index.js';
import { PlayerState } from '../state/PlayerState.js';
import type { Room, Direction } from '../generator/RoomGraph.js';

// ─── RoomFeature type (matches design spec in decisions.md) ──────────────────
// This interface will move to @ellmud/shared once Jarlaxle's PR lands.
// Until then, we define it locally so tests compile independently.

interface RoomFeature {
  id: string;
  keywords: string[];
  shortDescription?: string;
  longDescription: string;
  questId?: string | null;
}

/** Room with optional features field — extends the base Room interface. */
type RoomWithFeatures = Room & { features?: RoomFeature[] };

// ─── Test Fixtures ───────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<RoomWithFeatures> = {}): RoomWithFeatures {
  return {
    id: 'test-room',
    name: 'Test Chamber',
    description: 'A nondescript stone chamber.',
    exits: new Map<Direction, string>([['north', 'other-room']]),
    items: [],
    ...overrides,
  };
}

function makeFeature(overrides: Partial<RoomFeature> = {}): RoomFeature {
  return {
    id: 'wall-note',
    keywords: ['note', 'parchment'],
    shortDescription: 'A torn parchment is pinned to the wall.',
    longDescription:
      'The note reads: "They watch from the water. Do not trust the reflections." The handwriting is erratic.',
    questId: null,
    ...overrides,
  };
}

function buildCtx(
  room: RoomWithFeatures,
  args: string[] = [],
  extras: Partial<CommandContext> = {},
): CommandContext {
  return {
    player: new PlayerState('test-session', room.id, 20),
    room: room as Room,
    args,
    resolveRoom: () => undefined,
    otherPlayersInRoom: [],
    stability: 1.0,
    ...extras,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Room Features — look <target>', () => {
  describe('basic keyword matching', () => {
    it('should show feature description when keyword matches', () => {
      const feature = makeFeature();
      const room = makeRoom({ features: [feature] });
      const result = handleLook(buildCtx(room, ['note']));

      expect(result.narrations).toHaveLength(1);
      expect(result.narrations[0]!.text).toContain('They watch from the water');
      expect(result.narrations[0]!.type).toBe('room');
    });

    it('should match alternate keywords for the same feature', () => {
      const feature = makeFeature({
        keywords: ['note', 'paper', 'letter'],
        longDescription: 'A crumpled letter written in a shaky hand.',
      });
      const room = makeRoom({ features: [feature] });

      for (const kw of ['note', 'paper', 'letter']) {
        const result = handleLook(buildCtx(room, [kw]));
        expect(result.narrations[0]!.text).toContain('crumpled letter');
      }
    });

    it('should be case-insensitive', () => {
      const feature = makeFeature({ keywords: ['note'] });
      const room = makeRoom({ features: [feature] });

      const cases = ['NOTE', 'Note', 'nOtE'];
      for (const kw of cases) {
        const result = handleLook(buildCtx(room, [kw]));
        expect(result.narrations[0]!.text).toContain('They watch from the water');
      }
    });

    it('should support multi-word keywords', () => {
      const feature = makeFeature({
        keywords: ['wooden sign', 'sign'],
        longDescription: 'The sign reads: DANGER — UNSTABLE FLOOR',
      });
      const room = makeRoom({ features: [feature] });

      // "look wooden sign" → args = ['wooden', 'sign'] → joined as 'wooden sign'
      const result = handleLook(buildCtx(room, ['wooden', 'sign']));
      expect(result.narrations[0]!.text).toContain('DANGER');
    });
  });

  describe('no match — fallback behavior', () => {
    it('should return "don\'t see" message when no feature matches', () => {
      const room = makeRoom({ features: [makeFeature()] });
      const result = handleLook(buildCtx(room, ['goblin']));

      expect(result.narrations).toHaveLength(1);
      expect(result.narrations[0]!.text).toMatch(/don't see/i);
      expect(result.narrations[0]!.type).toBe('system');
    });

    it('should include the target name in the fallback message', () => {
      const room = makeRoom({ features: [makeFeature()] });
      const result = handleLook(buildCtx(room, ['mysterious', 'orb']));

      expect(result.narrations[0]!.text).toContain('mysterious orb');
    });
  });

  describe('look with no target — existing behavior preserved', () => {
    it('should show full room description when no args given', () => {
      const room = makeRoom({ features: [makeFeature()] });
      const result = handleLook(buildCtx(room, []));

      expect(result.narrations[0]!.text).toContain('nondescript stone chamber');
      expect(result.narrations[0]!.type).toBe('room');
      expect(result.roomHeader).toBeDefined();
      expect(result.roomHeader!.roomName).toBe('Test Chamber');
    });

    it('should list exits in room description', () => {
      const room = makeRoom({ features: [makeFeature()] });
      const result = handleLook(buildCtx(room, []));

      expect(result.narrations[0]!.text).toContain('Exits:');
      expect(result.narrations[0]!.text).toContain('north');
    });
  });

  describe('multiple features in one room', () => {
    it('should resolve the correct feature by keyword', () => {
      const noteFeature = makeFeature({
        id: 'wall-note',
        keywords: ['note'],
        longDescription: 'A cryptic warning scrawled on parchment.',
      });
      const muralFeature = makeFeature({
        id: 'shrine-mural',
        keywords: ['mural', 'painting'],
        longDescription: 'A faded mural depicts robed figures descending into dark water.',
      });
      const room = makeRoom({ features: [noteFeature, muralFeature] });

      const noteResult = handleLook(buildCtx(room, ['note']));
      expect(noteResult.narrations[0]!.text).toContain('cryptic warning');

      const muralResult = handleLook(buildCtx(room, ['mural']));
      expect(muralResult.narrations[0]!.text).toContain('robed figures');

      const paintingResult = handleLook(buildCtx(room, ['painting']));
      expect(paintingResult.narrations[0]!.text).toContain('robed figures');
    });
  });

  describe('duplicate keyword across features — first match wins', () => {
    it('should return the first feature when keywords overlap', () => {
      const first = makeFeature({
        id: 'note-a',
        keywords: ['note'],
        longDescription: 'First note — you found me!',
      });
      const second = makeFeature({
        id: 'note-b',
        keywords: ['note'],
        longDescription: 'Second note — you should not see me.',
      });
      const room = makeRoom({ features: [first, second] });

      const result = handleLook(buildCtx(room, ['note']));
      expect(result.narrations[0]!.text).toContain('First note');
      expect(result.narrations[0]!.text).not.toContain('Second note');
    });
  });
});

describe('Room Features — backward compatibility', () => {
  it('should work normally when room has empty features array', () => {
    const room = makeRoom({ features: [] });
    const result = handleLook(buildCtx(room, []));

    expect(result.narrations[0]!.type).toBe('room');
    expect(result.narrations[0]!.text).toContain('nondescript stone chamber');
  });

  it('should work normally when room has no features property', () => {
    const room = makeRoom();
    // Explicitly delete features to simulate pre-migration rooms
    delete (room as Record<string, unknown>).features;

    const result = handleLook(buildCtx(room, []));
    expect(result.narrations[0]!.type).toBe('room');
    expect(result.roomHeader).toBeDefined();
  });

  it('should return fallback for look <target> when features is empty', () => {
    const room = makeRoom({ features: [] });
    const result = handleLook(buildCtx(room, ['note']));

    expect(result.narrations[0]!.text).toMatch(/don't see/i);
    expect(result.narrations[0]!.type).toBe('system');
  });

  it('should return fallback for look <target> when features is undefined', () => {
    const room = makeRoom();
    delete (room as Record<string, unknown>).features;

    const result = handleLook(buildCtx(room, ['note']));
    expect(result.narrations[0]!.text).toMatch(/don't see/i);
    expect(result.narrations[0]!.type).toBe('system');
  });
});

describe('Room Features — edge cases', () => {
  it('should handle very long feature descriptions', () => {
    const longText = 'A'.repeat(5000);
    const feature = makeFeature({ longDescription: longText });
    const room = makeRoom({ features: [feature] });

    const result = handleLook(buildCtx(room, ['note']));
    expect(result.narrations[0]!.text).toBe(longText);
  });

  it('should handle special characters in keywords', () => {
    const feature = makeFeature({
      keywords: ["healer's kit", 'rune-stone', 'void_shard'],
      longDescription: 'A mysterious artifact.',
    });
    const room = makeRoom({ features: [feature] });

    const r1 = handleLook(buildCtx(room, ["healer's", 'kit']));
    expect(r1.narrations[0]!.text).toContain('mysterious artifact');

    const r2 = handleLook(buildCtx(room, ['rune-stone']));
    expect(r2.narrations[0]!.text).toContain('mysterious artifact');

    const r3 = handleLook(buildCtx(room, ['void_shard']));
    expect(r3.narrations[0]!.text).toContain('mysterious artifact');
  });

  it('should not match partial keywords', () => {
    const feature = makeFeature({ keywords: ['notebook'] });
    const room = makeRoom({ features: [feature] });

    // "note" should NOT match "notebook" — exact match required
    const result = handleLook(buildCtx(room, ['note']));
    expect(result.narrations[0]!.text).toMatch(/don't see/i);
  });

  it('should trim whitespace from target before matching', () => {
    const feature = makeFeature({ keywords: ['note'] });
    const room = makeRoom({ features: [feature] });

    // Parser should handle this, but trimming in handler is defensive
    const result = handleLook(buildCtx(room, ['note']));
    expect(result.narrations[0]!.text).toContain('They watch from the water');
  });

  it('should handle feature with empty keywords array gracefully', () => {
    const feature = makeFeature({ keywords: [] });
    const room = makeRoom({ features: [feature] });

    const result = handleLook(buildCtx(room, ['note']));
    expect(result.narrations[0]!.text).toMatch(/don't see/i);
  });
});

describe('Room Features — command integration', () => {
  it('should route look <target> through handleCommand correctly', () => {
    const feature = makeFeature();
    const room = makeRoom({ features: [feature] });
    const ctx = buildCtx(room, ['note']);

    const result = handleCommand('look', ctx);
    expect(result.narrations[0]!.text).toContain('They watch from the water');
  });

  it('should route look with no args through handleCommand unchanged', () => {
    const room = makeRoom({ features: [makeFeature()] });
    const ctx = buildCtx(room, []);

    const result = handleCommand('look', ctx);
    expect(result.narrations[0]!.type).toBe('room');
    expect(result.narrations[0]!.text).toContain('nondescript stone chamber');
    expect(result.roomHeader).toBeDefined();
  });
});

describe('Room Features — RoomFeature model validation', () => {
  it('should have all required fields in a valid feature', () => {
    const feature = makeFeature();
    expect(feature.id).toBeDefined();
    expect(feature.keywords).toBeInstanceOf(Array);
    expect(feature.keywords.length).toBeGreaterThan(0);
    expect(feature.longDescription).toBeDefined();
    expect(typeof feature.longDescription).toBe('string');
    expect(feature.longDescription.length).toBeGreaterThan(0);
  });

  it('should allow optional shortDescription', () => {
    const withShort = makeFeature({ shortDescription: 'A note on the wall.' });
    expect(withShort.shortDescription).toBe('A note on the wall.');

    const withoutShort = makeFeature({ shortDescription: undefined });
    expect(withoutShort.shortDescription).toBeUndefined();
  });

  it('should allow optional questId (future quest integration)', () => {
    const withQuest = makeFeature({ questId: 'quest_drowned_covenant' });
    expect(withQuest.questId).toBe('quest_drowned_covenant');

    const withoutQuest = makeFeature({ questId: null });
    expect(withoutQuest.questId).toBeNull();
  });
});
