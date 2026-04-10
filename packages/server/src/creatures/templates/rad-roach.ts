/**
 * Rad Roach — Cockroaches grown to the size of dogs through radiation exposure. They swarm in 
 * radioactive hotspots.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 16, Attack: 5, Defence: 2, Armour: 3, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const RAD_ROACH: CreatureTemplate = {
  type: 'rad_roach',
  name: 'Rad Roach',
  stats: {
    maxHp: 16,
    attack: 5,
    defence: 2,
    armour: 3,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'roach_carapace',
      name: 'Roach Carapace',
      weight: 0.5,
      description: 'Radiation-resistant shell.',
      dropWeight: 85,
    },
    {
      itemId: 'glowing_gland',
      name: 'Glowing Gland',
      weight: 0.2,
      description: 'Emits faint radiation.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 4,
    maxCount: 8,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.5,
  aggressive: true,
  roomDescription: 'Rad roaches scuttle across glowing debris, antennae twitching.',
};
