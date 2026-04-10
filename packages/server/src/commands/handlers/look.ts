/**
 * look — Describe the current room, its contents, exits, and occupants.
 * With a target argument, examine a specific room feature.
 */

import type { CommandResult } from '../index.js';
import type { CommandContext } from '../index.js';
import type { RoomFeature } from '@ellmud/shared';
import { POSTURE_ROOM_DESCRIPTIONS } from '@ellmud/shared';

export function handleLook(ctx: CommandContext): CommandResult {
  const { room, args } = ctx;

  // "look" with no target → show full room description (existing behavior)
  if (args.length === 0) {
    return showFullRoom(ctx);
  }

  // "look <target>" → search room features for a keyword match
  const target = args.join(' ').toLowerCase().trim();

  if (room.features && room.features.length > 0) {
    const match = room.features.find(f =>
      f.keywords.some(kw => kw.toLowerCase() === target),
    );

    if (match) {
      return examineFeature(match);
    }
  }

  // No feature match → fallback
  return {
    narrations: [{
      text: `You don't see that here.`,
      type: 'system',
    }],
  };
}

function showFullRoom(ctx: CommandContext): CommandResult {
  const { room } = ctx;
  const exitList = Array.from(room.exits.keys()).join(', ') || 'none';

  const lines: string[] = [
    room.description,
    '',
    `Exits: ${exitList}`,
  ];

  // Items in the room — one line per item (#386)
  for (const item of room.items) {
    lines.push(item.roomDescription || `A ${item.name} lies here.`);
  }

  // Creatures in the room — one line per creature instance (#383)
  if (ctx.creaturesInRoom && ctx.creaturesInRoom.length > 0) {
    for (const creature of ctx.creaturesInRoom) {
      lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
    }
  }

  // Other players in the room (Issue #370)
  if (ctx.otherPlayerInfo && ctx.otherPlayerInfo.length > 0) {
    for (const p of ctx.otherPlayerInfo) {
      if (!p.anon) {
        const postureDesc = p.posture ? POSTURE_ROOM_DESCRIPTIONS[p.posture] : 'is here';
        lines.push(`${p.name} ${postureDesc}.`);
      }
    }
  } else if (ctx.otherPlayersInRoom.length > 0) {
    // Fallback: legacy count-based display when detailed info unavailable
    const count = ctx.otherPlayersInRoom.length;
    lines.push(`${count} other ${count === 1 ? 'wanderer lingers' : 'wanderers linger'} here.`);
  }

  // Corpses in the room (GDD §6.8)
  if (ctx.corpseSystem) {
    const corpses = ctx.corpseSystem.getCorpsesInRoom(ctx.room.id);
    for (const corpse of corpses) {
      const itemCount = corpse.items.length;
      if (itemCount > 0) {
        lines.push(`The corpse of ${corpse.ownerName} lies here, carrying ${itemCount} item${itemCount !== 1 ? 's' : ''}.`);
      } else {
        lines.push(`The stripped corpse of ${corpse.ownerName} lies here.`);
      }
    }
  }

  return {
    narrations: [{ text: lines.join('\n'), type: 'room' }],
    roomHeader: {
      roomName: room.name,
      roomSlug: room.id,
      exits: Array.from(room.exits.keys()),
      stability: ctx.stability,
    },
  };
}

function examineFeature(feature: RoomFeature): CommandResult {
  return {
    narrations: [{ text: feature.description, type: 'room' }],
  };
}
