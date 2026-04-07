/**
 * Command parser — GDD §5.1 verb-noun syntax.
 *
 * Parses raw text input into { verb, args }.
 * Handles aliases and abbreviations. Rejects unknown verbs with a static error.
 */

import type { CommandMessage } from '@ellmud/shared';

/** Direction alias map — bare directions and single letters to full go commands. */
const DIRECTION_ALIASES: Record<string, string[]> = {
  north: ['go', 'north'],
  south: ['go', 'south'],
  east: ['go', 'east'],
  west: ['go', 'west'],
  up: ['go', 'up'],
  down: ['go', 'down'],
  n: ['go', 'north'],
  s: ['go', 'south'],
  e: ['go', 'east'],
  w: ['go', 'west'],
  u: ['go', 'up'],
  d: ['go', 'down'],
};

/** Single-letter command aliases. */
const COMMAND_ALIASES: Record<string, string> = {
  l: 'look',
  i: 'inventory',
  k: 'attack',
};

/** All recognised verbs. */
const KNOWN_VERBS = new Set([
  'go',
  'look',
  'take',
  'drop',
  'inventory',
  'attack',
  'strike',
  'dodge',
  'flee',
  'say',
  'use',
  'search',
  'listen',
  'extract',
  'board',
  'zoneboard',
  'enter',
  'stash',
  'store',
  'stabilize',
  'whisper',
  'emote',
  'peaceful',
  'loot',
  'target',
  'position',
  'pos',
  'loadout',
  'rent',
  'goto',
]);

export interface ParseResult {
  ok: true;
  command: CommandMessage;
}

export interface ParseError {
  ok: false;
  error: string;
}

export type ParseOutcome = ParseResult | ParseError;

/** Parse raw text into a structured command. */
export function parseCommand(raw: string): ParseOutcome {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: 'Silence hangs in the air. Type a command.' };
  }

  const parts = trimmed.split(/\s+/);
  let verb = parts[0]!.toLowerCase();
  let args = parts.slice(1);

  // Direction aliases: n/s/e/w/u/d → go <direction>
  if (verb in DIRECTION_ALIASES) {
    const expanded = DIRECTION_ALIASES[verb]!;
    verb = expanded[0]!;
    args = expanded.slice(1);
    return { ok: true, command: { verb, args } };
  }

  // Single-letter command aliases: l/i/k
  if (verb in COMMAND_ALIASES) {
    verb = COMMAND_ALIASES[verb]!;
  }

  if (!KNOWN_VERBS.has(verb)) {
    return { ok: false, error: `Unknown command: "${verb}". Try "look" to survey your surroundings.` };
  }

  return { ok: true, command: { verb, args } };
}
