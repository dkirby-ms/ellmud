/**
 * Keyboard alias configuration for MUD commands.
 * Expandable shorthand → full command mappings.
 */

export interface AliasMap {
  [shortcut: string]: string;
}

export const DEFAULT_ALIASES: AliasMap = {
  n: 'go north',
  s: 'go south',
  e: 'go east',
  w: 'go west',
  u: 'go up',
  d: 'go down',
  l: 'look',
  i: 'inventory',
  inv: 'inventory',
  eq: 'equipment',
  h: 'help',
  '?': 'help',
};

/**
 * Expand a raw input line using the alias map.
 * Only expands if the entire first word matches an alias.
 */
export function expandAlias(input: string, aliases: AliasMap = DEFAULT_ALIASES): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const parts = trimmed.split(/\s+/);
  const first = parts[0].toLowerCase();

  if (first in aliases) {
    const expanded = aliases[first];
    // If user typed extra args after the alias, append them
    const rest = parts.slice(1).join(' ');
    return rest ? `${expanded} ${rest}` : expanded;
  }

  return trimmed;
}
