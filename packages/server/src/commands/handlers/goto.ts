/**
 * goto <room-slug>        — Dev-only teleport to a room in the current zone.
 * goto <zone:room-slug>   — Dev-only teleport to a room in another zone.
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
      narrations: [{ text: 'Goto where? Usage: goto <room-slug> or goto <zone:room-slug>', type: 'system' }],
    };
  }

  const raw = args[0].toLowerCase();

  // Cross-zone syntax: goto zone-slug:room-slug
  if (raw.includes(':')) {
    const colonIdx = raw.indexOf(':');
    const targetZoneSlug = raw.slice(0, colonIdx);
    const targetRoomSlug = raw.slice(colonIdx + 1);

    if (!targetZoneSlug || !targetRoomSlug) {
      return {
        narrations: [{ text: 'Invalid format. Usage: goto <zone-slug:room-slug>', type: 'system' }],
      };
    }

    // If the target zone is the current zone, fall through to same-zone logic
    if (targetZoneSlug !== ctx.zoneSlug) {
      // Validate target zone exists before issuing transfer
      if (ctx.resolveZoneExists && !ctx.resolveZoneExists(targetZoneSlug)) {
        return {
          narrations: [{ text: `No such zone: '${targetZoneSlug}'.`, type: 'system' }],
        };
      }
      return {
        narrations: [{ text: `Teleporting to ${targetRoomSlug} in zone ${targetZoneSlug}...`, type: 'room' }],
        zoneTransfer: { targetZoneSlug, targetRoomSlug },
      };
    }
  }

  const slug = (raw.includes(':') ? raw.slice(raw.indexOf(':') + 1) : raw);
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

  // Creatures — one line per creature instance (#383)
  const creatures = ctx.resolveCreaturesInRoom?.(slug) ?? [];
  for (const creature of creatures) {
    lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
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
