/**
 * Room graph data model and hardcoded test graph.
 *
 * This is a TEMPORARY development fixture. Jarlaxle's procedural room generator
 * (Issue #5) will replace the hardcoded graph with dynamically generated rooms.
 * The Room interface is the contract both systems share.
 */

export interface Item {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export type RoomType = 'entry' | 'extraction' | 'boss' | 'corridor' | 'junction' | 'dead_end';

export type RoomProperty = 'heavy_door' | 'cavern' | 'water';

export interface Room {
  id: string;
  name: string;
  description: string;
  type?: RoomType;
  exits: Map<Direction, string>;
  items: Item[];
  properties?: RoomProperty[];
}

export interface RoomGraph {
  rooms: Map<string, Room>;
  startRoomId: string;
  extractionRoomIds?: string[];
  bossRoomId?: string;
}

/** Build the 5-room development test graph. */
export function createTestRoomGraph(): RoomGraph {
  const rooms = new Map<string, Room>();

  rooms.set('entry', {
    id: 'entry',
    name: 'Shard Entry',
    description:
      'A jagged rift in reality opens into a vaulted stone chamber. The air tastes of copper and old decay. Faint light seeps through cracks in the ceiling.',
    exits: new Map<Direction, string>([
      ['north', 'corridor'],
      ['east', 'armory'],
    ]),
    items: [
      { id: 'torch', name: 'battered torch', weight: 1, description: 'A half-spent torch, still flickering.' },
    ],
  });

  rooms.set('corridor', {
    id: 'corridor',
    name: 'Flooded Corridor',
    description:
      'Knee-deep water fills a long stone corridor. The walls are slick with phosphorescent moss. Something moves in the dark water ahead.',
    exits: new Map<Direction, string>([
      ['south', 'entry'],
      ['north', 'shrine'],
      ['west', 'crypt'],
    ]),
    items: [],
  });

  rooms.set('armory', {
    id: 'armory',
    name: 'Ruined Armory',
    description:
      'Weapon racks line the walls, most empty or shattered. A few corroded blades remain. The floor is littered with bone fragments.',
    exits: new Map<Direction, string>([
      ['west', 'entry'],
    ]),
    items: [
      { id: 'halberd', name: 'corroded halberd', weight: 5, description: 'A pitted halberd. Still sharp enough to wound.' },
      { id: 'shield', name: 'dented shield', weight: 3, description: 'A battered shield bearing an unknown crest.' },
    ],
  });

  rooms.set('shrine', {
    id: 'shrine',
    name: 'Drowned Shrine',
    description:
      'An altar rises from black water in the center of a domed chamber. Strange symbols pulse with faint violet light along the walls.',
    exits: new Map<Direction, string>([
      ['south', 'corridor'],
    ]),
    items: [
      { id: 'relic', name: 'anomalous relic', weight: 2, description: 'A humming shard of crystallised void-stuff. Valuable.' },
    ],
  });

  rooms.set('crypt', {
    id: 'crypt',
    name: 'Collapsed Crypt',
    description:
      'Stone sarcophagi jut from rubble. The ceiling has partially caved in, and dust motes dance in shafts of dim light. A faint scratching echoes from the walls.',
    exits: new Map<Direction, string>([
      ['east', 'corridor'],
      ['down', 'extraction-chamber'],
    ]),
    items: [
      { id: 'bandage', name: 'crude bandage', weight: 0.5, description: 'A strip of cloth that could staunch a wound.' },
    ],
  });

  rooms.set('extraction-chamber', {
    id: 'extraction-chamber',
    name: 'Extraction Chamber',
    description:
      'A circular chamber thrums with latent energy. Runes carved into the floor pulse with violet light, forming a portal anchor. This is a way out.',
    type: 'extraction',
    exits: new Map<Direction, string>([
      ['up', 'crypt'],
    ]),
    items: [],
  });

  return { rooms, startRoomId: 'entry' };
}
