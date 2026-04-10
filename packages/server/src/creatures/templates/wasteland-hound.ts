/**
 * Wasteland Hound — Feral dogs adapted to radiation. They hunt in packs and their howls echo across 
 * empty wastes.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 28, Attack: 8, Defence: 3, Armour: 2, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const WASTELAND_HOUND: CreatureTemplate = {
  type: 'wasteland_hound',
  name: 'Wasteland Hound',
  stats: {
    maxHp: 28,
    attack: 8,
    defence: 3,
    armour: 2,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'hound_pelt',
      name: 'Hound Pelt',
      weight: 1.5,
      description: 'Mangy and thin.',
      dropWeight: 70,
    },
    {
      itemId: 'rad_scarred_fang',
      name: 'Rad-Scarred Fang',
      weight: 0.3,
      description: 'Glows faintly.',
      dropWeight: 25,
    },
    {
      itemId: 'hound_collar',
      name: 'Hound Collar',
      weight: 0.5,
      description: 'Name tag illegible.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 2,
    maxCount: 4,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.35,
  aggressive: true,
  roomDescription: 'Wasteland hounds circle, eyes reflecting green light.',
};
