/**
 * toggle <option> — Toggle a player setting on or off.
 *
 * Usage:
 *   toggle         — Show available toggles
 *   toggle follow  — Toggle whether others can follow you
 *
 * Extensible: new toggles can be added to TOGGLE_MAP below.
 */

import type { CommandResult, CommandContext } from '../index.js';
import { getCharacterFlagsRepository } from '../../db/CharacterFlagsRepository.js';
import type { CharacterFlagName } from '@ellmud/shared';

/** Maps user-facing toggle names to their underlying character flag. */
const TOGGLE_MAP: Record<string, { flagName: CharacterFlagName; label: string; enabledMsg: string; disabledMsg: string }> = {
  follow: {
    flagName: 'allowFollowing',
    label: 'Follow',
    enabledMsg: 'Other players can now follow you.',
    disabledMsg: 'Other players can no longer follow you.',
  },
};

export function handleToggle(ctx: CommandContext): CommandResult {
  const toggleName = ctx.args[0]?.toLowerCase();

  // No args → show available toggles
  if (!toggleName) {
    const lines: string[] = ['Available toggles:'];
    for (const [name, def] of Object.entries(TOGGLE_MAP)) {
      lines.push(`  ${name} — ${def.label}`);
    }
    lines.push('');
    lines.push('Use "toggle <name>" to flip a setting (e.g., "toggle follow").');
    return {
      narrations: [{ text: lines.join('\n'), type: 'system' }],
    };
  }

  const def = TOGGLE_MAP[toggleName];
  if (!def) {
    const validNames = Object.keys(TOGGLE_MAP).join(', ');
    return {
      narrations: [{
        text: `Unknown toggle "${toggleName}". Available: ${validNames}`,
        type: 'system',
      }],
    };
  }

  const characterId = ctx.player.sessionId;
  const repo = getCharacterFlagsRepository();

  // Fire-and-forget async toggle (same pattern as /flag)
  void (async () => {
    try {
      const current = await repo.getFlags(characterId);
      const newValue = !current[def.flagName];
      await repo.setFlag(characterId, def.flagName, newValue);
    } catch (err) {
      console.error(`[toggle] Failed to toggle ${def.flagName} for ${characterId}:`, err);
    }
  })();

  // Optimistic feedback — we don't know exact state synchronously, but we
  // tell the player it was toggled. The actual effect is immediate on next check.
  return {
    narrations: [{
      text: `${def.label} toggled. Use "toggle ${toggleName}" again to reverse.`,
      type: 'system',
    }],
  };
}
