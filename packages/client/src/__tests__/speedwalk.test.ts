import { describe, it, expect } from 'vitest';
import { isSpeedwalk, parseSpeedwalk, MAX_SPEEDWALK_MOVES } from '../utils/speedwalk.js';

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
});
