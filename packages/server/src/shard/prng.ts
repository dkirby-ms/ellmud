/**
 * Seeded PRNG — mulberry32 algorithm.
 * Deterministic: same seed always produces the same sequence.
 */

export interface PRNG {
  /** Returns a float in [0, 1). */
  next(): number;
  /** Returns an integer in [min, max] (inclusive). */
  nextInt(min: number, max: number): number;
  /** Picks a random element from an array. */
  pick<T>(arr: readonly T[]): T;
  /** Shuffles an array in place and returns it. */
  shuffle<T>(arr: T[]): T[];
}

export function createPRNG(seed: number): PRNG {
  let state = seed | 0;

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function nextInt(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('Cannot pick from empty array');
    return arr[Math.floor(next() * arr.length)];
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { next, nextInt, pick, shuffle };
}
