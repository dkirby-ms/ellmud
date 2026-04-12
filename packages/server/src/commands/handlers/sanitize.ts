/**
 * Shared input sanitization for player-facing text commands (say, emote, whisper).
 *
 * Uses a loop-based approach so that no combination of nested angle brackets
 * or control characters can survive sanitization — directly addressing the
 * CodeQL "incomplete multi-character sanitization" alert.
 *
 * ANSI color tags use `[]` bracket notation (e.g. `[red]`), NOT `<>`,
 * so stripping angle brackets does not break the color system.
 */

// Combined pattern: angle brackets + C0 control chars + DEL + C1 control chars
// eslint-disable-next-line no-control-regex
const DANGEROUS_CHARS = /[<>\x00-\x1F\x7F-\x9F]/g;

/**
 * Sanitize user input to prevent prompt injection and control character abuse.
 *
 * Applies the replacement in a loop until the output is stable, ensuring
 * that no dangerous characters can be reconstructed from nested input.
 */
export function sanitizeInput(text: string, maxLength: number): string {
  let result = text;
  let prev: string;
  do {
    prev = result;
    result = result.replace(DANGEROUS_CHARS, '');
  } while (result !== prev);
  return result.slice(0, maxLength).trim();
}
