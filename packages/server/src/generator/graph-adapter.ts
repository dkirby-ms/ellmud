/**
 * Adapts the shared RoomGraph (from the procedural generator) to the local
 * Room/RoomGraph types used by command handlers and PlayerState.
 *
 * The generator produces LootContainer[] per room; this adapter resolves
 * container item IDs to full Item objects via the item registry.
 */

import type { RoomGraph as SharedRoomGraph, Room as SharedRoom } from '@ellmud/shared';
import type { RoomGraph, Room, Item } from './RoomGraph.js';
import { getItemDefinition } from '../items/registry.js';

/**
 * Convert a generator-produced RoomGraph into the local format
 * consumed by ZoneRoom and command handlers.
 */
export function adaptRoomGraph(shared: SharedRoomGraph): RoomGraph {
  const rooms = new Map<string, Room>();

  for (const [id, sharedRoom] of shared.rooms) {
    rooms.set(id, adaptRoom(sharedRoom));
  }

  return {
    rooms,
    startRoomId: shared.entryRoomIds[0]!,
    bossRoomId: shared.bossRoomId,
  };
}

/**
 * Convert a single shared Room to the local Room format.
 * Resolves LootContainer item IDs → Item objects.
 */
function adaptRoom(shared: SharedRoom): Room {
  const items: Item[] = [];

  for (const container of shared.items) {
    for (const itemId of container.items) {
      const def = getItemDefinition(itemId);
      if (def) {
        items.push({
          id: def.id,
          name: def.name,
          weight: def.weight,
          description: def.description,
        });
      }
    }
  }

  return {
    id: shared.id,
    name: shared.name,
    description: shared.description,
    type: shared.type,
    exits: new Map(shared.exits),
    items,
    properties: shared.properties,
  };
}
