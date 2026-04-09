/**
 * look — Describe the current room, its contents, exits, and occupants.
 * With a target argument, examine a specific room feature.
 */

import type { CommandResult } from '../index.js';
import type { CommandContext } from '../index.js';
import type { RoomFeature } from '@ellmud/shared';

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

  if (room.items.length > 0) {
    const itemNames = room.items.map((i) => i.name).join(', ');
    lines.push(`You see: ${itemNames}`);
  }

  // Creatures in the room
  if (ctx.creaturesInRoom && ctx.creaturesInRoom.length > 0) {
    // Group creatures by type and count
    const creaturesByType = new Map<string, { creature: import('../index.js').CreatureRef; count: number }>();
    for (const c of ctx.creaturesInRoom) {
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

  // Other players in the room (Issue #370)
  if (ctx.otherPlayerInfo && ctx.otherPlayerInfo.length > 0) {
    for (const p of ctx.otherPlayerInfo) {
      if (!p.anon) {
        lines.push(`${p.name} is here.`);
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
