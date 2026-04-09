/**
 * Speedwalk parser — converts compact direction strings into move sequences.
 *
 * Syntax: optional repeat count followed by a direction letter.
 *   n/s/e/w/u/d — cardinal directions + up/down
 *   3e2n         — east east east north north
 *   enws         — east north west south (1 move each)
 *   10e4n2s      — east ×10, north ×4, south ×2
 *
 * Client-side limit: MAX_SPEEDWALK_MOVES (50) total moves per string.
 */

export const MAX_SPEEDWALK_MOVES = 50;

const DIRECTION_CHARS: Record<string, string> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  u: 'up',
  d: 'down',
};

/** Regex that matches an entire valid speedwalk string (no extra characters). */
const SPEEDWALK_RE = /^(\d*[nsewud])+$/;

/** Regex for iterating each segment: optional count + direction letter. */
const SEGMENT_RE = /(\d*)([nsewud])/g;

/**
 * Test whether an input string looks like a speedwalk command.
 * Must consist entirely of direction letters with optional numeric prefixes.
 */
export function isSpeedwalk(input: string): boolean {
  return SPEEDWALK_RE.test(input);
}

export interface SpeedwalkResult {
  ok: true;
  moves: string[];
}

export interface SpeedwalkError {
  ok: false;
  error: string;
}

/**
 * Parse a speedwalk string into an ordered array of full direction names.
 * Returns an error result if the move count exceeds MAX_SPEEDWALK_MOVES or
 * the string is not a valid speedwalk.
 */
export function parseSpeedwalk(input: string): SpeedwalkResult | SpeedwalkError {
  const trimmed = input.trim().toLowerCase();

  if (!isSpeedwalk(trimmed)) {
    return { ok: false, error: 'Invalid speedwalk string.' };
  }

  const moves: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for global regex
  SEGMENT_RE.lastIndex = 0;

  while ((match = SEGMENT_RE.exec(trimmed)) !== null) {
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const direction = DIRECTION_CHARS[match[2]];

    if (count < 1) {
      return { ok: false, error: 'Move count must be at least 1.' };
    }

    for (let i = 0; i < count; i++) {
      moves.push(direction);
      if (moves.length > MAX_SPEEDWALK_MOVES) {
        return {
          ok: false,
          error: `Speedwalk exceeds ${MAX_SPEEDWALK_MOVES}-move limit (got ${moves.length}+).`,
        };
      }
    }
  }

  if (moves.length === 0) {
    return { ok: false, error: 'Empty speedwalk.' };
  }

  return { ok: true, moves };
}
