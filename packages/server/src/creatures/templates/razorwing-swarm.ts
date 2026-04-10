/**
 * Razorwing Swarm — Mutated pigeons with metallic feathers sharp as knives. They descend in clouds, 
 * slashing and pecking.
 *
 * Swarm (Ranged) archetype.
 *
 * Stats (Tier 2):
 *   HP: 70, Attack: 18, Defence: 8, Armour: 5, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const RAZORWING_SWARM: CreatureTemplate = {
  type: 'razorwing_swarm',
  name: 'Razorwing Swarm',
  stats: {
    maxHp: 70,
    attack: 18,
    defence: 8,
    armour: 5,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'razorwing_feather',
      name: 'Razorwing Feather',
      weight: 0.1,
      description: 'Sharp enough to draw blood.',
      dropWeight: 85,
    },
    {
      itemId: 'twisted_talon',
      name: 'Twisted Talon',
      weight: 0.3,
      description: 'Metal-infused keratin.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 6,
    preferredRoomTypes: ['chamber', 'junction', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.4,
  aggressive: true,
  roomDescription: 'Razorwings circle overhead, their metallic feathers glinting in the dim light.',
};
