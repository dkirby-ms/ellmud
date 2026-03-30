/**
 * go [direction] — Move to an adjacent room. Validates exit exists.
 */

import type { CommandResult, CommandContext } from '../index.js';
import type { Direction } from '../../shard/RoomGraph.js';
import { isInterZoneId, parseInterZoneId } from '@ellmud/shared';

const VALID_DIRECTIONS = new Set<string>(['north', 'south', 'east', 'west', 'up', 'down']);

export function handleGo(ctx: CommandContext): CommandResult {
  const { player, room, args, resolveRoom } = ctx;

  if (args.length === 0) {
    return {
      narrations: [{ text: 'Go where? Specify a direction: north, south, east, west, up, down.', type: 'system' }],
    };
  }

  const direction = args[0]!.toLowerCase();
  if (!VALID_DIRECTIONS.has(direction)) {
    return {
      narrations: [{ text: `"${direction}" is not a valid direction.`, type: 'system' }],
    };
  }

  const targetRoomId = room.exits.get(direction as Direction);
  if (!targetRoomId) {
    return {
      narrations: [{ text: `There is no exit to the ${direction}.`, type: 'system' }],
    };
  }

  // Inter-zone exit: signal a zone transfer instead of moving locally
  if (isInterZoneId(targetRoomId)) {
    const parsed = parseInterZoneId(targetRoomId);
    if (parsed) {
      return {
        narrations: [{ text: 'You step through the passage into another region…', type: 'room' }],
        zoneTransfer: {
          targetZoneSlug: parsed.zoneSlug,
          targetRoomSlug: parsed.roomSlug,
        },
      };
    }
  }

  const targetRoom = resolveRoom(targetRoomId);
  if (!targetRoom) {
    return {
      narrations: [{ text: 'That path leads nowhere. The way is blocked.', type: 'system' }],
    };
  }

  // Move player
  player.currentRoomId = targetRoomId;

  // Build room description for the new room
  const exitList = Array.from(targetRoom.exits.keys()).join(', ') || 'none';
  const lines: string[] = [
    `You move ${direction}.`,
    '',
    targetRoom.description,
    '',
    `Exits: ${exitList}`,
  ];

  if (targetRoom.items.length > 0) {
    const itemNames = targetRoom.items.map((i) => i.name).join(', ');
    lines.push(`You see: ${itemNames}`);
  }

  // Creatures in the target room
  const creatures = ctx.resolveCreaturesInRoom?.(targetRoomId) ?? [];
  if (creatures.length > 0) {
    const creatureNames = creatures.map((c) => c.name).join(', ');
    lines.push(`Creatures: ${creatureNames}`);
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
