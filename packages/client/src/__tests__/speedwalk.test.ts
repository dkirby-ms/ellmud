import { describe, it, expect } from 'vitest';
import { isSpeedwalk, parseSpeedwalk, MAX_SPEEDWALK_MOVES, shouldTreatAsSpeedwalk } from '../utils/speedwalk.js';

describe('isSpeedwalk', () => {
  it('recognises single direction letters', () => {
    expect(isSpeedwalk('n')).toBe(true);
    expect(isSpeedwalk('s')).toBe(true);
    expect(isSpeedwalk('e')).toBe(true);
    expect(isSpeedwalk('w')).toBe(true);
    expect(isSpeedwalk('u')).toBe(true);
    expect(isSpeedwalk('d')).toBe(true);
  });

  it('recognises multi-direction strings', () => {
    expect(isSpeedwalk('enws')).toBe(true);
    expect(isSpeedwalk('nnneee')).toBe(true);
  });

  it('recognises strings with counts', () => {
    expect(isSpeedwalk('3e2n')).toBe(true);
    expect(isSpeedwalk('10e4n2s')).toBe(true);
  });

  it('recognises mixed counted and uncounted', () => {
    expect(isSpeedwalk('3ene2s')).toBe(true);
  });

  it('rejects normal commands', () => {
    expect(isSpeedwalk('go north')).toBe(false);
    expect(isSpeedwalk('look')).toBe(false);
    expect(isSpeedwalk('say hello')).toBe(false);
    expect(isSpeedwalk('inventory')).toBe(false);
    expect(isSpeedwalk('help')).toBe(false);
  });

  it('rejects strings with invalid characters', () => {
    expect(isSpeedwalk('3ex')).toBe(false);
    expect(isSpeedwalk('abc')).toBe(false);
    expect(isSpeedwalk('n e')).toBe(false);
    expect(isSpeedwalk('3e ')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isSpeedwalk('')).toBe(false);
  });

  it('rejects ordinal-like patterns (no ordinal directions)', () => {
    // These contain invalid letters (the letters that WOULD be ordinals if we supported them)
    expect(isSpeedwalk('ne')).toBe(true); // This IS valid — n then e (two moves)
    // But standalone chars like 'x', 'y', 'z' are invalid
    expect(isSpeedwalk('x')).toBe(false);
  });

  // --- Edge cases added for #380 regression coverage ---

  it('is case-sensitive — rejects uppercase direction letters', () => {
    expect(isSpeedwalk('N')).toBe(false);
    expect(isSpeedwalk('S')).toBe(false);
    expect(isSpeedwalk('NE')).toBe(false);
    expect(isSpeedwalk('3E2N')).toBe(false);
  });

  it('rejects numeric-only input (no direction letter)', () => {
    expect(isSpeedwalk('2')).toBe(false);
    expect(isSpeedwalk('10')).toBe(false);
    expect(isSpeedwalk('0')).toBe(false);
  });

  it('accepts zero-count prefix (regex does not validate count value)', () => {
    // The regex matches the shape `\d*[nsewud]` — it does not check that
    // the count is >= 1. parseSpeedwalk enforces that constraint instead.
    expect(isSpeedwalk('0n')).toBe(true);
    expect(isSpeedwalk('0e0w')).toBe(true);
  });

  it('rejects input with whitespace (no trimming)', () => {
    expect(isSpeedwalk(' n ')).toBe(false);
    expect(isSpeedwalk(' ne ')).toBe(false);
    expect(isSpeedwalk('   ')).toBe(false);
    expect(isSpeedwalk('n e')).toBe(false);
  });

  it('matches English words composed entirely of direction letters', () => {
    // Known limitation: the regex cannot distinguish real words from
    // direction sequences when every character is in [nsewud].
    // Documenting here so future maintainers understand the tradeoff.
    expect(isSpeedwalk('new')).toBe(true);   // n-e-w
    expect(isSpeedwalk('end')).toBe(true);   // e-n-d
    expect(isSpeedwalk('den')).toBe(true);   // d-e-n
    expect(isSpeedwalk('sew')).toBe(true);   // s-e-w
    expect(isSpeedwalk('used')).toBe(true);  // u-s-e-d
    expect(isSpeedwalk('dew')).toBe(true);   // d-e-w
    expect(isSpeedwalk('sue')).toBe(true);   // s-u-e
    expect(isSpeedwalk('dune')).toBe(true);  // d-u-n-e
    expect(isSpeedwalk('nude')).toBe(true);  // n-u-d-e
  });
});

describe('parseSpeedwalk', () => {
  it('parses single direction', () => {
    const result = parseSpeedwalk('n');
    expect(result).toEqual({ ok: true, moves: ['north'] });
  });

  it('parses multi-direction string', () => {
    const result = parseSpeedwalk('enws');
    expect(result).toEqual({
      ok: true,
      moves: ['east', 'north', 'west', 'south'],
    });
  });

  it('parses counted directions', () => {
    const result = parseSpeedwalk('3e2n');
    expect(result).toEqual({
      ok: true,
      moves: ['east', 'east', 'east', 'north', 'north'],
    });
  });

  it('parses complex speedwalk', () => {
    const result = parseSpeedwalk('10e4n2s');
    expect(result).toEqual({
      ok: true,
      moves: [
        ...Array(10).fill('east'),
        ...Array(4).fill('north'),
        ...Array(2).fill('south'),
      ],
    });
  });

  it('parses mixed counted and uncounted', () => {
    const result = parseSpeedwalk('3ene2s');
    expect(result).toEqual({
      ok: true,
      moves: ['east', 'east', 'east', 'north', 'east', 'south', 'south'],
    });
  });

  it('handles up and down', () => {
    const result = parseSpeedwalk('2u3d');
    expect(result).toEqual({
      ok: true,
      moves: ['up', 'up', 'down', 'down', 'down'],
    });
  });

  it('is case-insensitive', () => {
    const result = parseSpeedwalk('3E2N');
    expect(result).toEqual({
      ok: true,
      moves: ['east', 'east', 'east', 'north', 'north'],
    });
  });

  it('trims leading/trailing whitespace', () => {
    const result = parseSpeedwalk('  3e  ');
    expect(result).toEqual({
      ok: true,
      moves: ['east', 'east', 'east'],
    });
  });

  it('rejects invalid strings', () => {
    const result = parseSpeedwalk('go north');
    expect(result).toEqual({ ok: false, error: 'Invalid speedwalk string.' });
  });

  it('rejects empty input', () => {
    const result = parseSpeedwalk('');
    expect(result).toEqual({ ok: false, error: 'Invalid speedwalk string.' });
  });

  it(`enforces ${MAX_SPEEDWALK_MOVES}-move limit`, () => {
    const result = parseSpeedwalk('51e');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain(`${MAX_SPEEDWALK_MOVES}-move limit`);
    }
  });

  it('allows exactly 50 moves', () => {
    const result = parseSpeedwalk('50e');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.moves).toHaveLength(50);
    }
  });

  it('rejects when total across segments exceeds limit', () => {
    // 30e + 21n = 51 total
    const result = parseSpeedwalk('30e21n');
    expect(result.ok).toBe(false);
  });

  it('allows total across segments at limit', () => {
    // 30e + 20n = 50 total
    const result = parseSpeedwalk('30e20n');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.moves).toHaveLength(50);
    }
  });

  it('parses all six directions', () => {
    const result = parseSpeedwalk('nsewud');
    expect(result).toEqual({
      ok: true,
      moves: ['north', 'south', 'east', 'west', 'up', 'down'],
    });
  });

  // --- Edge cases added for #380 regression coverage ---

  it('rejects zero-count prefix (count must be >= 1)', () => {
    const result = parseSpeedwalk('0n');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('at least 1');
    }
  });

  it('rejects multiple zero-count segments', () => {
    const result = parseSpeedwalk('0e0w');
    expect(result.ok).toBe(false);
  });

  it('handles case-insensitive input via internal lowercasing', () => {
    // parseSpeedwalk lowercases internally, unlike isSpeedwalk.
    // This documents the asymmetry between the two functions.
    const upper = parseSpeedwalk('3E2N');
    expect(upper).toEqual({
      ok: true,
      moves: ['east', 'east', 'east', 'north', 'north'],
    });
    const single = parseSpeedwalk('N');
    expect(single).toEqual({ ok: true, moves: ['north'] });
  });
});

describe('shouldTreatAsSpeedwalk', () => {
  it('returns false for single direction letters (#380)', () => {
    expect(shouldTreatAsSpeedwalk('n')).toBe(false);
    expect(shouldTreatAsSpeedwalk('s')).toBe(false);
    expect(shouldTreatAsSpeedwalk('e')).toBe(false);
    expect(shouldTreatAsSpeedwalk('w')).toBe(false);
    expect(shouldTreatAsSpeedwalk('u')).toBe(false);
    expect(shouldTreatAsSpeedwalk('d')).toBe(false);
  });

  it('returns false for single move with explicit count 1', () => {
    expect(shouldTreatAsSpeedwalk('1n')).toBe(false);
    expect(shouldTreatAsSpeedwalk('1e')).toBe(false);
  });

  it('returns true for multi-move speedwalks', () => {
    expect(shouldTreatAsSpeedwalk('ne')).toBe(true);
    expect(shouldTreatAsSpeedwalk('3e2n')).toBe(true);
    expect(shouldTreatAsSpeedwalk('enws')).toBe(true);
  });

  it('returns true for counted single-direction (2+ moves)', () => {
    expect(shouldTreatAsSpeedwalk('2n')).toBe(true);
    expect(shouldTreatAsSpeedwalk('5e')).toBe(true);
  });

  it('returns false for non-speedwalk commands', () => {
    expect(shouldTreatAsSpeedwalk('look')).toBe(false);
    expect(shouldTreatAsSpeedwalk('go north')).toBe(false);
    expect(shouldTreatAsSpeedwalk('inventory')).toBe(false);
  });

  it('returns false for empty input', () => {
    expect(shouldTreatAsSpeedwalk('')).toBe(false);
  });

  // --- Edge cases added for #380 regression coverage ---

  it('returns false for ALL six directions with explicit count 1', () => {
    // Only 1n and 1e were originally tested. Complete the set to guard
    // against direction-specific regressions.
    for (const dir of ['n', 's', 'e', 'w', 'u', 'd']) {
      expect(shouldTreatAsSpeedwalk(`1${dir}`)).toBe(false);
    }
  });

  it('returns false for uppercase direction letters (case-sensitive)', () => {
    // isSpeedwalk regex only matches lowercase, so uppercase falls through.
    // This is actually safe for #380 — uppercase singles won't false-positive.
    expect(shouldTreatAsSpeedwalk('N')).toBe(false);
    expect(shouldTreatAsSpeedwalk('S')).toBe(false);
    expect(shouldTreatAsSpeedwalk('E')).toBe(false);
    expect(shouldTreatAsSpeedwalk('W')).toBe(false);
    expect(shouldTreatAsSpeedwalk('U')).toBe(false);
    expect(shouldTreatAsSpeedwalk('D')).toBe(false);
  });

  it('returns false for uppercase multi-move input (case-sensitive)', () => {
    // NOTE: parseSpeedwalk('NE') would succeed (it lowercases internally),
    // but shouldTreatAsSpeedwalk gates on isSpeedwalk first, which is
    // case-sensitive. Uppercase multi-move speedwalks silently fail.
    expect(shouldTreatAsSpeedwalk('NE')).toBe(false);
    expect(shouldTreatAsSpeedwalk('3E2N')).toBe(false);
  });

  it('returns false for zero-count direction (parse rejects count < 1)', () => {
    // '0n' passes isSpeedwalk (regex matches shape) but parseSpeedwalk
    // rejects it — moves.length never exceeds 1 because parse errors out.
    expect(shouldTreatAsSpeedwalk('0n')).toBe(false);
    expect(shouldTreatAsSpeedwalk('0e0w')).toBe(false);
  });

  it('returns false for whitespace-only input', () => {
    expect(shouldTreatAsSpeedwalk('   ')).toBe(false);
    expect(shouldTreatAsSpeedwalk(' ')).toBe(false);
  });

  it('returns false for whitespace-padded direction input', () => {
    // shouldTreatAsSpeedwalk does NOT trim — the caller (ZoneExploration.tsx)
    // trims before passing. This test documents the raw function behavior.
    expect(shouldTreatAsSpeedwalk(' n ')).toBe(false);
    expect(shouldTreatAsSpeedwalk(' ne ')).toBe(false);
    expect(shouldTreatAsSpeedwalk(' 2n ')).toBe(false);
  });

  it('returns false for numeric-only input (no direction letter)', () => {
    expect(shouldTreatAsSpeedwalk('2')).toBe(false);
    expect(shouldTreatAsSpeedwalk('10')).toBe(false);
    expect(shouldTreatAsSpeedwalk('0')).toBe(false);
  });

  it('returns false when parsed moves exceed MAX_SPEEDWALK_MOVES', () => {
    // 51 moves passes isSpeedwalk but parseSpeedwalk returns error
    expect(shouldTreatAsSpeedwalk('51n')).toBe(false);
    expect(shouldTreatAsSpeedwalk('30e21n')).toBe(false);
  });

  it('returns true at exactly MAX_SPEEDWALK_MOVES', () => {
    // 50 moves is the upper boundary — still a valid speedwalk
    expect(shouldTreatAsSpeedwalk('50n')).toBe(true);
    expect(shouldTreatAsSpeedwalk('30e20n')).toBe(true);
  });

  it('returns true for all two-direction pair combinations (boundary: minimum multi-move)', () => {
    // 2 moves is the minimum threshold to activate speedwalk mode.
    // Test representative pairs to ensure the boundary holds.
    expect(shouldTreatAsSpeedwalk('ns')).toBe(true);
    expect(shouldTreatAsSpeedwalk('ew')).toBe(true);
    expect(shouldTreatAsSpeedwalk('ud')).toBe(true);
    expect(shouldTreatAsSpeedwalk('nu')).toBe(true);
    expect(shouldTreatAsSpeedwalk('sd')).toBe(true);
    expect(shouldTreatAsSpeedwalk('we')).toBe(true);
  });

  it('treats English words made of direction chars as speedwalks (known limitation)', () => {
    // These words are composed entirely of n/s/e/w/u/d and have 2+ letters,
    // so they pass both isSpeedwalk and the >1 moves check. This is a known
    // tradeoff of the regex approach — unlikely in MUD gameplay but documented.
    expect(shouldTreatAsSpeedwalk('new')).toBe(true);   // n-e-w = 3 moves
    expect(shouldTreatAsSpeedwalk('end')).toBe(true);   // e-n-d = 3 moves
    expect(shouldTreatAsSpeedwalk('den')).toBe(true);   // d-e-n = 3 moves
    expect(shouldTreatAsSpeedwalk('sew')).toBe(true);   // s-e-w = 3 moves
    expect(shouldTreatAsSpeedwalk('used')).toBe(true);  // u-s-e-d = 4 moves
    expect(shouldTreatAsSpeedwalk('dew')).toBe(true);   // d-e-w = 3 moves
    expect(shouldTreatAsSpeedwalk('sue')).toBe(true);   // s-u-e = 3 moves
    expect(shouldTreatAsSpeedwalk('dune')).toBe(true);  // d-u-n-e = 4 moves
  });
});
