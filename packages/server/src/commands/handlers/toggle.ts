/**
 * toggle <option> — Toggle a player setting on or off.
 *
 * Usage:
 *   toggle         — Show available toggles and current states
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

/**
 * Async toggle handler — awaits DB read/write so the response reflects
 * the actual new state. Called from ZoneRoom like the `who` command.
 */
export async function handleToggleAsync(ctx: CommandContext): Promise<CommandResult> {
  const toggleName = ctx.args[0]?.toLowerCase();
  const characterId = ctx.player.sessionId;
  const repo = getCharacterFlagsRepository();

  // No args → show available toggles with current state
  if (!toggleName) {
    const flags = await repo.getFlags(characterId);
    const lines: string[] = ['Available toggles:'];
    for (const [name, def] of Object.entries(TOGGLE_MAP)) {
      const state = flags[def.flagName] ? 'ON' : 'OFF';
      lines.push(`  ${name} — ${def.label} [${state}]`);
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

  const current = await repo.getFlags(characterId);
  const newValue = !current[def.flagName];
  await repo.setFlag(characterId, def.flagName, newValue);

  return {
    narrations: [{
      text: newValue ? def.enabledMsg : def.disabledMsg,
      type: 'system',
    }],
  };
}
