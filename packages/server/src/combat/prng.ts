/**
 * Deterministic seeded PRNG — mulberry32 algorithm.
 *
 * Returns a factory: given a seed, produces a () => number function
 * that yields deterministic values in [0, 1). Same seed → same sequence.
 * Used by the sandbox for reproducible combat replays.
 */

/**
 * Create a deterministic PRNG from an integer seed (mulberry32).
 * Same seed always produces the same sequence of values in [0, 1).
 */
export function seededPrng(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
