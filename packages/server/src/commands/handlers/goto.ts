/**
 * goto <room-slug> — Dev-only teleport to any room in the current zone.
 *
 * Gated by DEV_MODE_ENABLED config flag — only available on dev servers.
 */

import type { CommandContext, CommandResult } from '../index.js';
import { getConfig } from '../../config.js';

export function handleGoto(ctx: CommandContext): CommandResult {
  if (!getConfig().devModeEnabled) {
    return {
      narrations: [{
        text: 'That command is not available.',
        type: 'system',
      }],
    };
  }

  const { player, args, resolveRoom } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Goto where? Usage: goto <room-slug>', type: 'system' }],
    };
  }

  const slug = args[0]!.toLowerCase();
  const targetRoom = resolveRoom(slug);

  if (!targetRoom) {
    return {
      narrations: [{ text: `No room with slug '${slug}' in this zone.`, type: 'system' }],
    };
  }

  player.currentRoomId = slug;

  const exitList = Array.from(targetRoom.exits.keys()).join(', ') || 'none';
  const lines: string[] = [
    `Teleported to ${targetRoom.name}.`,
    '',
    targetRoom.description,
    '',
    `Exits: ${exitList}`,
  ];

  if (targetRoom.items.length > 0) {
    const itemNames = targetRoom.items.map((i) => i.name).join(', ');
    lines.push(`You see: ${itemNames}`);
  }

  const creatures = ctx.resolveCreaturesInRoom?.(slug) ?? [];
  if (creatures.length > 0) {
    const creaturesByType = new Map<string, { creature: import('../index.js').CreatureRef; count: number }>();
    for (const c of creatures) {
      const key = c.type ?? c.name;
      const existing = creaturesByType.get(key);
      if (existing) {
        existing.count++;
      } else {
        creaturesByType.set(key, { creature: c, count: 1 });
      }
    }
    for (const [, { creature, count }] of creaturesByType) {
      const desc = creature.roomDescription || `A ${creature.name} lurks here.`;
      lines.push(count > 1 ? `${desc} (x${count})` : desc);
    }
  }

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
    roomHeader: {
      roomName: targetRoom.name,
      roomSlug: targetRoom.id,
      exits: Array.from(targetRoom.exits.keys()),
      stability: ctx.stability,
    },
  };
}
