/**
 * Oil Slick — Animated pools of industrial oil. They flow across floors and ignite when damage
 * d.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 25, Attack: 7, Defence: 1, Armour: 0, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const OIL_SLICK: CreatureTemplate = {
  type: 'oil_slick',
  name: 'Oil Slick',
  stats: {
    maxHp: 25,
    attack: 7,
    defence: 1,
    armour: 0,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'oil_sample',
      name: 'Oil Sample',
      weight: 0.5,
      description: 'Highly flammable.',
      dropWeight: 85,
    },
    {
      itemId: 'contaminated_core',
      name: 'Contaminated Core',
      weight: 0.3,
      description: 'Dense petroleum.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: false,
  roomDescription: 'An oil slick spreads across the floor, surface shimmering.',
};
