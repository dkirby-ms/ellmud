/**
 * Test helpers — unit tests to verify the test infrastructure itself works.
 */
import { describe, it, expect } from 'vitest';
import { createPRNG, MOCK_PLAYERS, MOCK_ITEMS, makeCommand } from './helpers/index.js';

describe('Test Fixtures', () => {
  it('createPRNG should be deterministic with same seed', () => {
    const rng1 = createPRNG(42);
    const rng2 = createPRNG(42);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it('createPRNG should produce different sequences for different seeds', () => {
    const rng1 = createPRNG(42);
    const rng2 = createPRNG(99);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).not.toEqual(seq2);
  });

  it('createPRNG should produce values between 0 and 1', () => {
    const rng = createPRNG(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('MOCK_PLAYERS should have unique session IDs', () => {
    const ids = MOCK_PLAYERS.map((p) => p.sessionId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('MOCK_ITEMS should cover all gear tiers', () => {
    const tiers = new Set(MOCK_ITEMS.map((i) => i.tier));
    expect(tiers.size).toBe(6); // scrap, common, sturdy, refined, masterwork, anomalous
  });

  it('makeCommand should create valid CommandMessage', () => {
    const cmd = makeCommand('look', 'north', 'carefully');
    expect(cmd.verb).toBe('look');
    expect(cmd.args).toEqual(['north', 'carefully']);
  });

  it('makeCommand with no args should create empty args array', () => {
    const cmd = makeCommand('inventory');
    expect(cmd.verb).toBe('inventory');
    expect(cmd.args).toEqual([]);
  });
});
