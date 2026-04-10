/**
 * Pollen Wraith — Semi-corporeal entities made of concentrated pollen and plant spirits. They drif
 * t through overgrown areas spreading madness.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 65, Attack: 20, Defence: 12, Armour: 6, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const POLLEN_WRAITH: CreatureTemplate = {
  type: 'pollen_wraith',
  name: 'Pollen Wraith',
  stats: {
    maxHp: 65,
    attack: 20,
    defence: 12,
    armour: 6,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'wraith_pollen',
      name: 'Wraith Pollen',
      weight: 0.3,
      description: 'Hallucinogenic dust.',
      dropWeight: 70,
    },
    {
      itemId: 'spirit_essence',
      name: 'Spirit Essence',
      weight: 0.5,
      description: 'Captured plant consciousness.',
      dropWeight: 25,
    },
    {
      itemId: 'bloom_crystal',
      name: 'Bloom Crystal',
      weight: 0.2,
      description: 'Solidified pollen.',
      dropWeight: 5,
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
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'A pollen wraith drifts lazily, leaving golden trails.',
  abilities: [
    {
      id: 'madnessCloud',
      name: 'Madness Cloud',
      damage: 28,
      windUpTicks: 4,
      telegraphText: 'The wraith disperses, pollen swirling...',
    },
  ],
};
