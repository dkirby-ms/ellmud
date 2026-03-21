/**
 * exit-detection.test.ts — Exit detection in narrative prose.
 *
 * Tests that parseExits correctly identifies direction words in
 * LLM-generated prose without false positives or brittle regex failures.
 */

import { describe, it, expect } from 'vitest';
import { parseExits, type TextSegment } from '../utils/exit-detection.js';

/** Helper — extract just exit directions from segments. */
function exitDirections(segments: TextSegment[]): string[] {
  return segments
    .filter((s): s is Extract<TextSegment, { kind: 'exit' }> => s.kind === 'exit')
    .map((s) => s.direction);
}

/** Helper — reconstruct the original text from segments. */
function reconstruct(segments: TextSegment[]): string {
  return segments
    .map((s) => (s.kind === 'exit' ? s.original : s.value))
    .join('');
}

describe('parseExits', () => {
  // ─── Room Description 1: Classic MUD ───────────────────────────────────
  it('detects exits in a classic MUD room description', () => {
    const text =
      'You stand in a dimly lit corridor. Passages lead north and east. ' +
      'A staircase spirals down into darkness.';
    const exits = ['north', 'east', 'down'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north', 'east', 'down']);
    expect(reconstruct(segments)).toBe(text);
  });

  // ─── Room Description 2: Flowery LLM Prose ────────────────────────────
  it('detects exits in elaborate LLM-generated prose', () => {
    const text =
      'The chamber opens into a vast cathedral of stone. To the north, ' +
      'a faint breeze carries the scent of pine. The south passage is ' +
      'blocked by rubble, but a narrow gap to the west offers escape.';
    const exits = ['north', 'west'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north', 'west']);
    // "south" is mentioned but not in exits — should NOT be linked
    expect(segments.find(
      (s) => s.kind === 'exit' && s.direction === 'south',
    )).toBeUndefined();
  });

  // ─── Room Description 3: Directions with Capitalization ────────────────
  it('handles capitalized and uppercase directions', () => {
    const text =
      'North lies the marketplace. To the East, merchants hawk their wares. ' +
      'The path UP leads to the watchtower.';
    const exits = ['north', 'east', 'up'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north', 'east', 'up']);
    // Preserves original casing in display
    const exitSegments = segments.filter(
      (s): s is Extract<TextSegment, { kind: 'exit' }> => s.kind === 'exit',
    );
    expect(exitSegments[0].original).toBe('North');
    expect(exitSegments[1].original).toBe('East');
    expect(exitSegments[2].original).toBe('UP');
  });

  // ─── Room Description 4: Avoid False Positives ─────────────────────────
  it('does not match directions embedded in longer words', () => {
    const text =
      'The northern wall is cracked. An eastward breeze blows. ' +
      'A southern accent fills the air. The downstairs chamber echoes. ' +
      'An upstairs balcony overlooks the hall.';
    const exits = ['north', 'east', 'south', 'down', 'up'];

    const segments = parseExits(text, exits);
    // None of these should match — they are parts of longer words
    expect(exitDirections(segments)).toEqual([]);
  });

  // ─── Room Description 5: Header Exit List ──────────────────────────────
  it('detects exits in the header "Exits:" line', () => {
    const text = 'Exits: north, south, east';
    const exits = ['north', 'south', 'east'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north', 'south', 'east']);
  });

  // ─── Room Description 6: Vertical Movement ────────────────────────────
  it('handles up and down in vertical passages', () => {
    const text =
      'A rickety ladder leads up through a hole in the ceiling. ' +
      'Below, the floor has collapsed — you could climb down into the rubble.';
    const exits = ['up', 'down'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['up', 'down']);
  });

  // ─── Room Description 7: Punctuation Adjacent ─────────────────────────
  it('matches directions adjacent to punctuation', () => {
    const text = 'You can go north. To the east, a door awaits. Head south!';
    const exits = ['north', 'east', 'south'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north', 'east', 'south']);
    expect(reconstruct(segments)).toBe(text);
  });

  // ─── Room Description 8: Only Available Exits ─────────────────────────
  it('only links directions that are actual exits', () => {
    const text =
      'Corridors lead north and south. To the east, a collapsed wall. ' +
      'West is a dead end.';
    // Only north is a real exit
    const exits = ['north'];

    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north']);
  });

  // ─── Edge Cases ────────────────────────────────────────────────────────

  it('returns plain text when no exits provided', () => {
    const text = 'You stand in an empty room.';
    const segments = parseExits(text, []);
    expect(segments).toEqual([{ kind: 'text', value: text }]);
  });

  it('returns empty array for empty text', () => {
    const segments = parseExits('', ['north']);
    expect(segments).toEqual([]);
  });

  it('preserves full text integrity through parse-reconstruct', () => {
    const text =
      'The ancient hall stretches before you. A gentle wind blows from the north, ' +
      'carrying whispers from the east. The southern gate is sealed, but west ' +
      'remains open. Stairs lead down to the crypts below, while a ladder goes up ' +
      'to the belfry.';
    const exits = ['north', 'east', 'west', 'down', 'up'];

    const segments = parseExits(text, exits);
    expect(reconstruct(segments)).toBe(text);
    expect(exitDirections(segments)).toEqual(['north', 'east', 'west', 'down', 'up']);
  });

  it('handles direction at the very start of text', () => {
    const text = 'North opens to a courtyard.';
    const exits = ['north'];
    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north']);
    expect(reconstruct(segments)).toBe(text);
  });

  it('handles direction at the very end of text', () => {
    const text = 'The only way out is north';
    const exits = ['north'];
    const segments = parseExits(text, exits);
    expect(exitDirections(segments)).toEqual(['north']);
    expect(reconstruct(segments)).toBe(text);
  });
});
