/**
 * AnsiText — renders a string containing ANSI markup as styled React nodes.
 *
 * Usage:
 *   <AnsiText text="A [red]crimson[/red] glow fills the room." />
 */

import { parseAnsiText } from "../lib/ansi-parser.js";

interface AnsiTextProps {
  text: string | null | undefined;
  className?: string;
}

export default function AnsiText({ text, className }: AnsiTextProps) {
  if (!text) return null;

  const nodes = parseAnsiText(text);

  if (className) {
    return <span className={className}>{nodes}</span>;
  }
  return <>{nodes}</>;
}
