/**
 * Dust Devil — Radioactive dust storms given semi-sentient form. They swirl through the wastes,
 *  abrading and irradiating.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 20, Attack: 7, Defence: 1, Armour: 0, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const DUST_DEVIL: CreatureTemplate = {
  type: 'dust_devil',
  name: 'Dust Devil',
  stats: {
    maxHp: 20,
    attack: 7,
    defence: 1,
    armour: 0,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'radioactive_dust',
      name: 'Radioactive Dust',
      weight: 0.3,
      description: 'Highly contaminated.',
      dropWeight: 90,
    },
    {
      itemId: 'crystallized_fallout',
      name: 'Crystallized Fallout',
      weight: 0.2,
      description: 'Hardened particles.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: false,
  roomDescription: 'A dust devil spins lazily, particles glowing in its vortex.',
};
