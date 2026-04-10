/**
 * Bloom Beast — Large predators with flowers growing from their flesh. The blooms release pollen
 *  that attracts prey and masks their scent.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 95, Attack: 25, Defence: 8, Armour: 11, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const BLOOM_BEAST: CreatureTemplate = {
  type: 'bloom_beast',
  name: 'Bloom Beast',
  stats: {
    maxHp: 95,
    attack: 25,
    defence: 8,
    armour: 11,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'bloom_petal',
      name: 'Bloom Petal',
      weight: 0.5,
      description: 'Beautiful and toxic.',
      dropWeight: 60,
    },
    {
      itemId: 'beast_hide',
      name: 'Beast Hide',
      weight: 4.0,
      description: 'Tough leather with floral growths.',
      dropWeight: 30,
    },
    {
      itemId: 'pollen_sac',
      name: 'Pollen Sac',
      weight: 0.3,
      description: 'Potent narcotic.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'A bloom beast prowls, flowers swaying with each movement.',
  abilities: [
    {
      id: 'pollenCloud',
      name: 'Pollen Cloud',
      damage: 30,
      windUpTicks: 4,
      telegraphText: 'Flowers across the beast\'s body open wide...',
    },
  ],
};
