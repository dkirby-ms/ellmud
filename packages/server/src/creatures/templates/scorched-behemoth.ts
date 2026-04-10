/**
 * Scorched Behemoth — Massive mutants created by concentrated radiation. Their skin is blackened and c
 * racked, glowing from within.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 115, Attack: 26, Defence: 10, Armour: 16, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const SCORCHED_BEHEMOTH: CreatureTemplate = {
  type: 'scorched_behemoth',
  name: 'Scorched Behemoth',
  stats: {
    maxHp: 115,
    attack: 26,
    defence: 10,
    armour: 16,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'scorched_hide',
      name: 'Scorched Hide',
      weight: 5.0,
      description: 'Thick and radiation-resistant.',
      dropWeight: 55,
    },
    {
      itemId: 'behemoth_bone',
      name: 'Behemoth Bone',
      weight: 6.0,
      description: 'Dense and glowing.',
      dropWeight: 30,
    },
    {
      itemId: 'mutation_sample',
      name: 'Mutation Sample',
      weight: 1.0,
      description: 'Unstable genetic material.',
      dropWeight: 15,
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
  fleeThreshold: 0.05,
  aggressive: true,
  roomDescription: 'A scorched behemoth stands like a monument to mutation.',
  abilities: [
    {
      id: 'crushingSlam',
      name: 'Crushing Slam',
      damage: 40,
      windUpTicks: 5,
      telegraphText: 'The behemoth raises its massive fists...',
    },
  ],
};
