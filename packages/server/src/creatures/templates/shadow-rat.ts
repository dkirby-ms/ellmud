/**
 * Shadow Rat — Rats formed from living shadow. They dissolve into darkness when threatened and 
 * reform elsewhere.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 14, Attack: 6, Defence: 2, Armour: 0, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const SHADOW_RAT: CreatureTemplate = {
  type: 'shadow_rat',
  name: 'Shadow Rat',
  stats: {
    maxHp: 14,
    attack: 6,
    defence: 2,
    armour: 0,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'shadow_wisp',
      name: 'Shadow Wisp',
      weight: 0.1,
      description: 'Condensed darkness.',
      dropWeight: 85,
    },
    {
      itemId: 'void_tooth',
      name: 'Void Tooth',
      weight: 0.2,
      description: 'Absorbs light.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 6,
    preferredRoomTypes: ['corridor', 'dead_end'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.6,
  aggressive: true,
  roomDescription: 'Shadow rats flicker in and out of darkness.',
};
