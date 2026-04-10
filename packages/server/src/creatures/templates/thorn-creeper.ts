/**
 * Thorn Creeper — Animated vines covered in barbs. They lash out at anything that moves, dragging 
 * prey into thorny masses.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 20, Attack: 6, Defence: 2, Armour: 1, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const THORN_CREEPER: CreatureTemplate = {
  type: 'thorn_creeper',
  name: 'Thorn Creeper',
  stats: {
    maxHp: 20,
    attack: 6,
    defence: 2,
    armour: 1,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'thorn_barb',
      name: 'Thorn Barb',
      weight: 0.1,
      description: 'Sharp and venomous.',
      dropWeight: 85,
    },
    {
      itemId: 'vine_fiber',
      name: 'Vine Fiber',
      weight: 0.3,
      description: 'Tough and flexible.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 5,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'Thorn creepers writhe across walls and floor, barbs gleaming.',
};
