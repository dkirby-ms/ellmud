/**
 * ANSI colored text parser for Ellmud.
 *
 * Supports two syntaxes:
 *   1. Lightweight tags:  [red]text[/red], [bold]text[/bold], [bright-cyan]...[/]
 *   2. Raw ANSI escapes:  \x1b[31m (SGR codes 0-4, 30-37, 90-97)
 *
 * Both produce spans with the existing .ansi-* CSS classes from tailwind.css.
 */

import { createElement, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Supported tag names  →  CSS class mapping
// ---------------------------------------------------------------------------

const COLOR_NAMES = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "bright-black", "bright-red", "bright-green", "bright-yellow",
  "bright-blue", "bright-magenta", "bright-cyan", "bright-white",
] as const;

const MODIFIER_NAMES = ["bold", "dim", "italic", "underline"] as const;

/** Every tag name the lightweight syntax understands. */
export const SUPPORTED_NAMES: readonly string[] = [
  ...COLOR_NAMES,
  ...MODIFIER_NAMES,
];

const VALID_TAG = new Set<string>(SUPPORTED_NAMES);

// ---------------------------------------------------------------------------
// SGR code  →  tag-name mapping
// ---------------------------------------------------------------------------

const SGR_MAP: Record<number, string | null> = {
  0: null,          // reset
  1: "bold",
  2: "dim",
  3: "italic",
  4: "underline",
  // standard colours 30-37
  30: "black",  31: "red",     32: "green",  33: "yellow",
  34: "blue",   35: "magenta", 36: "cyan",   37: "white",
  // bright colours 90-97
  90: "bright-black",  91: "bright-red",     92: "bright-green",
  93: "bright-yellow", 94: "bright-blue",    95: "bright-magenta",
  96: "bright-cyan",   97: "bright-white",
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface StyledSegment {
  text: string;
  classes: string[];
}

// ---------------------------------------------------------------------------
// 1. Normalise raw ANSI escapes into lightweight tags
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[([\d;]*)m/g;

function ansiEscapesToTags(input: string): string {
  const activeNames: string[] = [];
  let result = "";
  let lastIndex = 0;

  for (const match of input.matchAll(ANSI_RE)) {
    result += input.slice(lastIndex, match.index);
    lastIndex = match.index! + match[0].length;

    const params = match[1]
      ? match[1].split(";").map(Number)
      : [0]; // bare ESC[m is a reset

    for (const code of params) {
      const name = SGR_MAP[code];
      if (name === null) {
        // reset – close everything
        for (let i = activeNames.length - 1; i >= 0; i--) {
          result += `[/${activeNames[i]}]`;
        }
        activeNames.length = 0;
      } else if (name !== undefined) {
        result += `[${name}]`;
        activeNames.push(name);
      }
      // unknown codes are silently ignored
    }
  }
  result += input.slice(lastIndex);

  // close any dangling tags
  for (let i = activeNames.length - 1; i >= 0; i--) {
    result += `[/${activeNames[i]}]`;
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2. Parse lightweight tags into styled segments
// ---------------------------------------------------------------------------

// Matches opening [tag], closing [/tag], and the universal reset [/]
const TAG_RE = /\[(\/?)([a-z][-a-z]*)?(\/?)\]/g;

function parseTaggedText(input: string): StyledSegment[] {
  const segments: StyledSegment[] = [];
  const stack: string[] = [];
  let lastIndex = 0;

  for (const match of input.matchAll(TAG_RE)) {
    const before = input.slice(lastIndex, match.index);
    if (before) {
      segments.push({ text: before, classes: stack.map((n) => `ansi-${n}`) });
    }
    lastIndex = match.index! + match[0].length;

    const isClose = match[1] === "/";
    const tagName = match[2] ?? "";

    if (isClose) {
      if (tagName === "") {
        // [/] — universal reset
        stack.length = 0;
      } else if (VALID_TAG.has(tagName)) {
        const idx = stack.lastIndexOf(tagName);
        if (idx !== -1) stack.splice(idx, 1);
      } else {
        // Unknown close tag — pass through as literal text
        segments.push({ text: match[0], classes: stack.map((n) => `ansi-${n}`) });
      }
    } else if (tagName === "reset") {
      // [reset] — universal reset (same as [/])
      stack.length = 0;
    } else if (VALID_TAG.has(tagName)) {
      stack.push(tagName);
    } else {
      // Unknown open tag — pass through as literal text
      segments.push({ text: match[0], classes: stack.map((n) => `ansi-${n}`) });
    }
  }

  const tail = input.slice(lastIndex);
  if (tail) {
    segments.push({ text: tail, classes: stack.map((n) => `ansi-${n}`) });
  }
  return segments;
}

// ---------------------------------------------------------------------------
// 3. Public API
// ---------------------------------------------------------------------------

/** True when the string contains raw ANSI escapes. */
function hasAnsiEscapes(input: string): boolean {
  return input.includes("\x1b[");
}

/** True when the string contains lightweight tags. */
function hasLightweightTags(input: string): boolean {
  return /\[[a-z][-a-z]*\]/.test(input);
}

/**
 * Parse a string that may contain lightweight `[red]...[/red]` tags and/or
 * raw ANSI escape sequences, returning an array of React nodes styled with
 * the existing `.ansi-*` CSS classes.
 *
 * Plain text (no markup) returns a single-element array with the raw string,
 * so rendering is zero-overhead for unmarked content.
 */
export function parseAnsiText(input: string): ReactNode[] {
  if (!input) return [];

  // Fast path: no markup at all → return raw string (no extra DOM)
  if (!hasAnsiEscapes(input) && !hasLightweightTags(input)) {
    return [input];
  }

  // Normalise raw ANSI → tags, then parse
  const normalised = hasAnsiEscapes(input)
    ? ansiEscapesToTags(input)
    : input;

  const segments = parseTaggedText(normalised);

  return segments.map((seg, i) =>
    seg.classes.length === 0
      ? seg.text
      : createElement("span", { key: i, className: seg.classes.join(" ") }, seg.text),
  );
}

/**
 * Strip all ANSI markup (both lightweight tags and raw escape codes) from a
 * string, returning plain text.
 */
export function stripAnsi(input: string): string {
  if (!input) return "";
  return input
    .replace(ANSI_RE, "")
    .replace(/\[\/?[a-z][-a-z]*\]/g, "")
    .replace(/\[\/\]/g, "");
}
