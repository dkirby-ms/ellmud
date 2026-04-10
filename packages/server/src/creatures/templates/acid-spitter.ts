/**
 * Acid Spitter — Bloated creatures that store industrial acids in throat sacs. They spray corrosi
 * ve streams from a distance.
 *
 * Ranged archetype.
 *
 * Stats (Tier 2):
 *   HP: 75, Attack: 20, Defence: 6, Armour: 8, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const ACID_SPITTER: CreatureTemplate = {
  type: 'acid_spitter',
  name: 'Acid Spitter',
  stats: {
    maxHp: 75,
    attack: 20,
    defence: 6,
    armour: 8,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'acid_gland',
      name: 'Acid Gland',
      weight: 1.5,
      description: 'Contains corrosive fluid.',
      dropWeight: 60,
    },
    {
      itemId: 'spitter_hide',
      name: 'Spitter Hide',
      weight: 3.0,
      description: 'Resistant to acids.',
      dropWeight: 30,
    },
    {
      itemId: 'caustic_venom',
      name: 'Caustic Venom',
      weight: 0.5,
      description: 'Highly reactive.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.35,
  aggressive: true,
  roomDescription: 'An acid spitter crouches low, throat sac pulsing.',
  abilities: [
    {
      id: 'acidSpray',
      name: 'Acid Spray',
      damage: 32,
      windUpTicks: 4,
      telegraphText: 'The spitter\'s throat sac swells, acid bubbling...',
    },
  ],
};
