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

export type RoomType =
  | 'entry' | 'boss' | 'corridor' | 'junction' | 'dead_end'
  | 'feature_stash' | 'feature_expedition_board' | 'feature_marketplace'
  | 'feature_crafting' | 'feature_training' | 'feature_contracts' | 'feature_infirmary'
  | 'feature_armoury' | 'feature_war_room' | 'feature_inn'
  | 'feature_sandbox' | 'feature_sandbox_arena' | 'feature_sandbox_stats';

export type RoomProperty = 'heavy_door' | 'cavern' | 'water';

import type { RoomFeature } from '@ellmud/shared';

export interface Room {
  id: string;
  name: string;
  description: string;
  type?: RoomType;
  exits: Map<Direction, string>;
  items: Item[];
  properties?: RoomProperty[];
  /** Examinable features in this room (Issue #345). */
  features?: RoomFeature[];
}

export interface RoomGraph {
  rooms: Map<string, Room>;
  startRoomId: string;
  bossRoomId?: string;
}

/** Build the 5-room development test graph. */
export function createTestRoomGraph(): RoomGraph {
  const rooms = new Map<string, Room>();

  rooms.set('entry', {
    id: 'entry',
    name: 'Rift Entry',
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
      { id: 'relic', name: 'anomalous relic', weight: 2, description: 'A humming fragment of crystallised void-stuff. Valuable.' },
    ],
  });

  rooms.set('crypt', {
    id: 'crypt',
    name: 'Collapsed Crypt',
    description:
      'Stone sarcophagi jut from rubble. The ceiling has partially caved in, and dust motes dance in shafts of dim light. A faint scratching echoes from the walls.',
    exits: new Map<Direction, string>([
      ['east', 'corridor'],
      ['down', 'deep-chamber'],
    ]),
    items: [
      { id: 'bandage', name: 'crude bandage', weight: 0.5, description: 'A strip of cloth that could staunch a wound.' },
    ],
  });

  rooms.set('deep-chamber', {
    id: 'deep-chamber',
    name: 'Deep Chamber',
    description:
      'A circular chamber thrums with latent energy. Runes carved into the floor pulse with violet light. The air grows thin.',
    type: 'dead_end',
    exits: new Map<Direction, string>([
      ['up', 'crypt'],
    ]),
    items: [],
  });

  return { rooms, startRoomId: 'entry' };
}
