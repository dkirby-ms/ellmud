/**
 * The Fallout King — The first to die in the nuclear fire, and the first to rise. He rules the wastes
 *  absolutely, a god of radiation and ruin.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 360, Attack: 68, Defence: 23, Armour: 25, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const THE_FALLOUT_KING: CreatureTemplate = {
  type: 'the_fallout_king',
  name: 'The Fallout King',
  stats: {
    maxHp: 360,
    attack: 68,
    defence: 23,
    armour: 25,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'kings_crown',
      name: 'King\'s Crown',
      weight: 1.5,
      description: 'Forged from fallout.',
      dropWeight: 20,
    },
    {
      itemId: 'nuclear_scepter',
      name: 'Nuclear Scepter',
      weight: 4.0,
      description: 'Commands radiation itself.',
      dropWeight: 18,
    },
    {
      itemId: 'masterwork_radiation_suit',
      name: 'Masterwork Radiation Suit',
      weight: 14.0,
      description: 'Perfect protection.',
      dropWeight: 17,
    },
    {
      itemId: 'anomalous_isotope',
      name: 'Anomalous Isotope',
      weight: 0.5,
      description: 'Breaks physics.',
      dropWeight: 15,
    },
    {
      itemId: 'blast_remnant',
      name: 'Blast Remnant',
      weight: 2.0,
      description: 'Fragment of the first bomb.',
      dropWeight: 15,
    },
    {
      itemId: 'gamma_crown',
      name: 'Gamma Crown',
      weight: 1.0,
      description: 'Grants immunity to radiation.',
      dropWeight: 10,
    },
    {
      itemId: 'echo_of_zero_hour',
      name: 'Echo of Zero Hour',
      weight: 0.2,
      description: 'Memory of the moment.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['boss'],
    forbiddenRoomTypes: [],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'The Fallout King sits on a throne of fused glass, crowned in green fire.',
  abilities: [
    {
      id: 'atomicStorm',
      name: 'Atomic Storm',
      damage: 80,
      windUpTicks: 9,
      telegraphText: 'The King raises his scepter, radiation coalescing into a storm...',
    },
  ],
};
