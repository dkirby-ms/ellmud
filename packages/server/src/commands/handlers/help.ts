/**
 * help [command] — Show available commands or detailed help for a specific command.
 */

import type { CommandContext, CommandResult } from '../index.js';
import { getConfig } from '../../config.js';

interface CommandHelp {
  description: string;
  usage: string;
  aliases?: string[];
  category: string;
  /** If set, only show when in a room matching this type */
  requiredRoomType?: string | string[];
  /** If true, only show when devModeEnabled */
  devOnly?: boolean;
}

/** Command metadata registry */
const COMMAND_HELP: Record<string, CommandHelp> = {
  // Navigation
  go: {
    description: 'Move through an exit in the specified direction.',
    usage: 'go <direction>',
    aliases: ['north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd'],
    category: 'Navigation',
  },
  look: {
    description: 'Survey your surroundings.',
    usage: 'look',
    aliases: ['l'],
    category: 'Navigation',
  },

  // Items
  take: {
    description: 'Pick up an item from the ground.',
    usage: 'take <item>',
    category: 'Items',
  },
  drop: {
    description: 'Drop an item from your inventory.',
    usage: 'drop <item>',
    category: 'Items',
  },
  inventory: {
    description: 'View your carried items.',
    usage: 'inventory',
    aliases: ['i'],
    category: 'Items',
  },
  loot: {
    description: 'Take items from a corpse.',
    usage: 'loot <creature-name>',
    category: 'Items',
  },
  extract: {
    description: 'Extract materials from a defeated creature.',
    usage: 'extract <creature-name>',
    category: 'Items',
  },
  search: {
    description: 'Search the room for hidden items.',
    usage: 'search',
    category: 'Items',
  },

  // Communication
  say: {
    description: 'Speak to everyone in the room.',
    usage: 'say <message>',
    category: 'Communication',
  },
  whisper: {
    description: 'Send a private message to another player.',
    usage: 'whisper <player> <message>',
    category: 'Communication',
  },
  emote: {
    description: 'Express an action or emotion.',
    usage: 'emote <action>',
    category: 'Communication',
  },
  listen: {
    description: 'Listen for sounds in the area.',
    usage: 'listen',
    category: 'Communication',
  },

  // Combat
  attack: {
    description: 'Engage a creature in combat.',
    usage: 'attack <creature>',
    aliases: ['k'],
    category: 'Combat',
  },
  strike: {
    description: 'Perform a melee attack during combat.',
    usage: 'strike',
    category: 'Combat',
  },
  dodge: {
    description: 'Attempt to evade incoming attacks.',
    usage: 'dodge',
    category: 'Combat',
  },
  flee: {
    description: 'Escape from combat.',
    usage: 'flee',
    category: 'Combat',
  },
  target: {
    description: 'Select a combat target.',
    usage: 'target <creature>',
    category: 'Combat',
  },
  position: {
    description: 'View or change your combat position.',
    usage: 'position [front|mid|back]',
    aliases: ['pos'],
    category: 'Combat',
  },

  // Special Actions
  use: {
    description: 'Use an item from your inventory.',
    usage: 'use <item>',
    category: 'Special Actions',
  },
  stabilize: {
    description: 'Attempt to stabilize a downed player.',
    usage: 'stabilize <player>',
    category: 'Special Actions',
  },
  peaceful: {
    description: 'Drop your weapon and exit combat.',
    usage: 'peaceful',
    category: 'Special Actions',
  },

  // Feature: Expedition Board
  board: {
    description: 'View available expedition zones.',
    usage: 'board',
    aliases: ['zoneboard'],
    category: 'Expedition Board',
    requiredRoomType: 'feature_expedition_board',
  },
  enter: {
    description: 'Enter an expedition zone.',
    usage: 'enter <zone-id>',
    category: 'Expedition Board',
    requiredRoomType: 'feature_expedition_board',
  },

  // Feature: Stash
  stash: {
    description: 'View your personal storage.',
    usage: 'stash',
    category: 'Stash',
    requiredRoomType: 'feature_stash',
  },
  store: {
    description: 'Store an item in your stash.',
    usage: 'store <item>',
    category: 'Stash',
    requiredRoomType: 'feature_stash',
  },
  loadout: {
    description: 'View your equipment loadout.',
    usage: 'loadout',
    category: 'Stash',
    requiredRoomType: 'feature_stash',
  },

  // Feature: Inn
  rent: {
    description: 'Rest at the inn and return to character selection.',
    usage: 'rent',
    category: 'Inn',
    requiredRoomType: 'feature_inn',
  },

  // Feature: Sandbox (also devOnly)
  sandbox: {
    description: 'Access sandbox development tools.',
    usage: 'sandbox <subcommand>',
    category: 'Sandbox',
    requiredRoomType: ['feature_sandbox', 'feature_sandbox_arena', 'feature_sandbox_stats'],
    devOnly: true,
  },

  // Dev Tools
  goto: {
    description: 'Teleport to a room in the current or another zone.',
    usage: 'goto <room-slug> or goto <zone:room-slug>',
    category: 'Dev Tools',
    devOnly: true,
  },
  teleport: {
    description: 'Teleport a player to your location.',
    usage: 'teleport <player-name>',
    category: 'Dev Tools',
    devOnly: true,
  },
};

/** Group commands by category based on context */
function getAvailableCommands(ctx: CommandContext): Map<string, string[]> {
  const devMode = getConfig().devModeEnabled;
  const roomType = ctx.room.type;

  const grouped = new Map<string, string[]>();

  for (const [cmd, meta] of Object.entries(COMMAND_HELP)) {
    // Skip dev-only commands if dev mode is disabled
    if (meta.devOnly && !devMode) {
      continue;
    }

    // Skip feature-gated commands if not in matching room
    if (meta.requiredRoomType) {
      const allowed = Array.isArray(meta.requiredRoomType)
        ? meta.requiredRoomType
        : [meta.requiredRoomType];
      if (!allowed.includes(roomType as string)) {
        continue;
      }
    }

    const category = meta.category;
    const existing = grouped.get(category);
    if (!existing) {
      grouped.set(category, [cmd]);
    } else {
      existing.push(cmd);
    }
  }

  return grouped;
}

/** Resolve a command name, handling aliases */
function resolveCommand(query: string): string | null {
  const lower = query.toLowerCase();

  // Direct match
  if (COMMAND_HELP[lower]) {
    return lower;
  }

  // Search aliases
  for (const [cmd, meta] of Object.entries(COMMAND_HELP)) {
    if (meta.aliases?.includes(lower)) {
      return cmd;
    }
  }

  return null;
}

export function handleHelp(ctx: CommandContext): CommandResult {
  const { args } = ctx;

  // help <command> — show detailed help (use first arg only)
  if (args.length > 0) {
    const query = args[0] ?? '';
    const cmd = resolveCommand(query);

    if (!cmd) {
      return {
        narrations: [{
          text: `Unknown command: "${query}". Type "help" to see all available commands.`,
          type: 'system',
        }],
      };
    }

    const meta = COMMAND_HELP[cmd];
    if (!meta) {
      return {
        narrations: [{
          text: `No help available for "${cmd}".`,
          type: 'system',
        }],
      };
    }

    // Hide dev command details when devMode is off
    if (meta.devOnly && !getConfig().devModeEnabled) {
      return {
        narrations: [{
          text: `Unknown command: "${query}". Type "help" to see all available commands.`,
          type: 'system',
        }],
      };
    }

    const lines = [
      `=== help: ${cmd} ===`,
      meta.description,
      `Usage: ${meta.usage}`,
    ];

    if (meta.aliases && meta.aliases.length > 0) {
      lines.push(`Aliases: ${meta.aliases.join(', ')}`);
    }

    return {
      narrations: [{ text: lines.join('\n'), type: 'system' }],
    };
  }

  // help (no args) — show all available commands grouped by category
  const grouped = getAvailableCommands(ctx);

  const lines = ['=== Available Commands ===', ''];

  // Define category display order
  const categoryOrder = [
    'Navigation',
    'Items',
    'Communication',
    'Combat',
    'Special Actions',
    'Expedition Board',
    'Stash',
    'Inn',
    'Sandbox',
    'Dev Tools',
  ];

  for (const category of categoryOrder) {
    const commands = grouped.get(category);
    if (!commands || commands.length === 0) {
      continue;
    }

    lines.push(`${category}:`);
    for (const cmd of commands) {
      const meta = COMMAND_HELP[cmd];
      if (!meta) continue;
      const padding = ' '.repeat(Math.max(1, 16 - cmd.length));
      lines.push(`  ${cmd}${padding}— ${meta.description}`);
    }
    lines.push('');
  }

  lines.push('Type "help <command>" for details.');

  return {
    narrations: [{ text: lines.join('\n'), type: 'system' }],
  };
}
