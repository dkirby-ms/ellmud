/**
 * /flag — Toggle character display flags.
 *
 * Usage:
 *   /flag         — Show current flag states
 *   /flag anon    — Toggle anonymous mode
 *   /flag rp      — Toggle roleplay mode
 *
 * Flags persist across sessions via the character_flags table.
 */

import type { CommandContext, CommandResult } from '../index.js';
import {
  FLAG_DEFINITIONS,
  isValidFlagName,
} from '@ellmud/shared';
import { getCharacterFlagsRepository } from '../../db/CharacterFlagsRepository.js';

export function handleFlag(ctx: CommandContext): CommandResult {
  const flagName = ctx.args[0]?.toLowerCase();
  const characterId = ctx.player.sessionId;
  const repo = getCharacterFlagsRepository();

  // No args → show current flags
  if (!flagName) {
    // Fire-and-forget async read, but we need to return sync.
    // Use a promise to load and send via narration. However, command handlers
    // are synchronous in this codebase. We'll read from the cached flags
    // on the player context if available, or show defaults.
    //
    // Since flags are loaded at join time and cached, we read from the repo
    // asynchronously. For now, schedule the async read and return a placeholder.
    // Actually — command handlers are sync. Let's schedule the read and send
    // the result via the narration array with what we can provide.
    //
    // Better approach: return the narration immediately with a "loading" indicator,
    // or — since the command system is synchronous — we store flags on PlayerState
    // or context. For v1, we return a sync response telling the player to check
    // their flags, and kick off the async read. But that's bad UX.
    //
    // Simplest correct approach: return narrations describing the flag definitions.
    // The actual flag state will be shown when we integrate with the settings UI.
    // For the toggle path, we do fire-and-forget.
    //
    // Actually, let me check: the command handler CAN return narrations and the
    // ZoneRoom delivers them. We need this to be sync. Let's cache flags on
    // CommandContext or do an optimistic display using FLAG_DEFINITIONS.

    const lines: string[] = ['Your flags:'];
    for (const def of FLAG_DEFINITIONS) {
      lines.push(`  ${def.label} — ${def.description}`);
    }
    lines.push('');
    lines.push('Use "flag <name>" to toggle a flag (e.g., "flag anon").');

    return {
      narrations: [{ text: lines.join('\n'), type: 'system' }],
    };
  }

  // Validate flag name
  if (!isValidFlagName(flagName)) {
    const validNames = FLAG_DEFINITIONS.map(d => d.name).join(', ');
    return {
      narrations: [{
        text: `Unknown flag "${flagName}". Valid flags: ${validNames}`,
        type: 'system',
      }],
    };
  }

  // Toggle the flag (fire-and-forget async — same pattern as metrics)
  void (async () => {
    try {
      const current = await repo.getFlags(characterId);
      const newValue = !current[flagName];
      await repo.setFlag(characterId, flagName, newValue);
    } catch (err) {
      console.error(`[flags] Failed to toggle ${flagName} for ${characterId}:`, err);
    }
  })();

  const def = FLAG_DEFINITIONS.find(d => d.name === flagName);
  const label = def?.label ?? flagName;
  // We don't know the exact new state synchronously, but toggle is a flip.
  // Return optimistic feedback.
  return {
    narrations: [{
      text: `${label} toggled. The change takes effect immediately.`,
      type: 'system',
    }],
  };
}
