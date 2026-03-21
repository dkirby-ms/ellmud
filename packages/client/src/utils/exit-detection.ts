/**
 * Exit detection for narrative text.
 *
 * Uses the structured exits array from RoomHeaderMessage as the source of
 * truth — only directions that are actual exits get linked. This makes
 * detection LLM-robust: we match against known exits, not arbitrary prose.
 */

/** A segment of narrative text — either plain text or a clickable exit. */
export type TextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'exit'; direction: string; original: string };

/**
 * Canonical direction aliases. Maps common direction words to their
 * canonical form (matching the server's Direction type).
 */
const DIRECTION_ALIASES: Record<string, string> = {
  north: 'north',
  south: 'south',
  east: 'east',
  west: 'west',
  up: 'up',
  down: 'down',
  northeast: 'northeast',
  northwest: 'northwest',
  southeast: 'southeast',
  southwest: 'southwest',
};

/**
 * Parse narrative text, replacing direction words that match known exits
 * with exit segments. Unknown directions or directions not in the current
 * room's exit list are left as plain text.
 *
 * Uses word-boundary matching to avoid false positives like "northern" or
 * "eastward". Case-insensitive — matches "North", "SOUTH", etc.
 */
export function parseExits(
  text: string,
  availableExits: readonly string[],
): TextSegment[] {
  if (!text || availableExits.length === 0) {
    return text ? [{ kind: 'text', value: text }] : [];
  }

  const exitSet = new Set(availableExits.map((e) => e.toLowerCase()));

  // Build all matchable words — canonical directions that are available exits
  const matchableWords = Object.entries(DIRECTION_ALIASES)
    .filter(([, canonical]) => exitSet.has(canonical))
    .map(([word]) => word);

  if (matchableWords.length === 0) {
    return [{ kind: 'text', value: text }];
  }

  // Sort longest-first to match "northeast" before "north"/"east"
  matchableWords.sort((a, b) => b.length - a.length);

  // Word-boundary regex: match direction words not embedded in longer words
  // Uses lookahead/lookbehind to avoid matching "northern", "eastward", etc.
  const pattern = new RegExp(
    `(?<![a-zA-Z])(${matchableWords.join('|')})(?![a-zA-Z])`,
    'gi',
  );

  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const matchStart = match.index;
    const matchedWord = match[1];

    // Add preceding text
    if (matchStart > lastIndex) {
      segments.push({ kind: 'text', value: text.slice(lastIndex, matchStart) });
    }

    const canonical = DIRECTION_ALIASES[matchedWord.toLowerCase()];
    segments.push({
      kind: 'exit',
      direction: canonical ?? matchedWord.toLowerCase(),
      original: matchedWord,
    });

    lastIndex = matchStart + match[0].length;
  }

  // Add trailing text
  if (lastIndex < text.length) {
    segments.push({ kind: 'text', value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', value: text }];
}
