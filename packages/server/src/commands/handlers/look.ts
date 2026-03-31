/**
 * look — Describe the current room, its contents, exits, and occupants.
 */

import type { CommandResult } from '../index.js';
import type { CommandContext } from '../index.js';

export function handleLook(ctx: CommandContext): CommandResult {
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

  // Other players in the room
  if (ctx.otherPlayersInRoom.length > 0) {
    const count = ctx.otherPlayersInRoom.length;
    lines.push(`${count} other ${count === 1 ? 'wanderer lingers' : 'wanderers linger'} here.`);
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
