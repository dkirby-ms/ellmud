/**
 * go [direction] — Move to an adjacent room. Validates exit exists.
 * Dark target rooms show only a darkness message and exits (Issue #402).
 */

import type { CommandResult, CommandContext } from '../index.js';
import type { Direction } from '../../generator/RoomGraph.js';
import { isInterZoneId, parseInterZoneId, POSTURE_ROOM_DESCRIPTIONS, DARKNESS_MESSAGE } from '@ellmud/shared';
import { formatPlayerLines } from './player-display.js';

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
  // Auto-reset posture to standing on movement (#371)
  player.posture = 'standing';

  // Dark room: show darkness message instead of full room contents (#402)
  if (targetRoom.illumination === 'dark') {
    const exitList = Array.from(targetRoom.exits.keys()).join(', ') || 'none';
    const lines: string[] = [
      `You move ${direction}.`,
      '',
      DARKNESS_MESSAGE,
      '',
      `Exits: ${exitList}`,
    ];
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

  // Build room description for the new room
  const exitList = Array.from(targetRoom.exits.keys()).join(', ') || 'none';
  const lines: string[] = [
    `You move ${direction}.`,
    '',
    targetRoom.description,
    '',
    `Exits: ${exitList}`,
  ];

  // Items in the target room — one line per item (#386)
  for (const item of targetRoom.items) {
    lines.push(item.roomDescription || `A ${item.name} lies here.`);
  }

  // Creatures in the target room — one line per creature instance (#383)
  const creatures = ctx.resolveCreaturesInRoom?.(targetRoomId) ?? [];
  for (const creature of creatures) {
    lines.push(creature.roomDescription || `A ${creature.name} lurks here.`);
  }

  // Other players in the target room (Issue #370)
  const playersInTarget = ctx.resolvePlayersInRoom?.(targetRoomId) ?? [];
  lines.push(...formatPlayerLines(playersInTarget, ctx.player.sessionId, ctx.characterName));

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
