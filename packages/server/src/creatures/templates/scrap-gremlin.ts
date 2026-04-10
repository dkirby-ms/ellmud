/**
 * Scrap Gremlin — Small humanoids that scavenge machine parts. They attack in packs, wielding impr
 * ovised tools as weapons.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 18, Attack: 6, Defence: 2, Armour: 2, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const SCRAP_GREMLIN: CreatureTemplate = {
  type: 'scrap_gremlin',
  name: 'Scrap Gremlin',
  stats: {
    maxHp: 18,
    attack: 6,
    defence: 2,
    armour: 2,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'scrap_tool',
      name: 'Scrap Tool',
      weight: 1.5,
      description: 'Improvised wrench or screwdriver.',
      dropWeight: 70,
    },
    {
      itemId: 'metal_shaving',
      name: 'Metal Shaving',
      weight: 0.2,
      description: 'Sharp debris.',
      dropWeight: 25,
    },
    {
      itemId: 'gremlin_trinket',
      name: 'Gremlin Trinket',
      weight: 0.5,
      description: 'Stolen component.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 5,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.45,
  aggressive: true,
  roomDescription: 'Scrap gremlins scuttle between machinery, chattering in mechanical clicks.',
};
