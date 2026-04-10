/**
 * The Spillmother — The heart of the contamination zone. A vast pool of toxic sludge given terrible 
 * purpose. It births lesser creatures and commands them all.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 320, Attack: 60, Defence: 22, Armour: 20, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const THE_SPILLMOTHER: CreatureTemplate = {
  type: 'the_spillmother',
  name: 'The Spillmother',
  stats: {
    maxHp: 320,
    attack: 60,
    defence: 22,
    armour: 20,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'spillmothers_core',
      name: 'Spillmother\'s Core',
      weight: 2.0,
      description: 'The source of all toxicity here.',
      dropWeight: 25,
    },
    {
      itemId: 'primordial_sludge',
      name: 'Primordial Sludge',
      weight: 3.0,
      description: 'Undiluted toxic essence.',
      dropWeight: 25,
    },
    {
      itemId: 'masterwork_hazmat_armor',
      name: 'Masterwork Hazmat Armor',
      weight: 12.0,
      description: 'Perfect chemical protection.',
      dropWeight: 20,
    },
    {
      itemId: 'anomalous_mutation_catalyst',
      name: 'Anomalous Mutation Catalyst',
      weight: 0.5,
      description: 'Can rewrite DNA.',
      dropWeight: 15,
    },
    {
      itemId: 'toxic_crown',
      name: 'Toxic Crown',
      weight: 1.5,
      description: 'Grants immunity to poison.',
      dropWeight: 10,
    },
    {
      itemId: 'genesis_sample',
      name: 'Genesis Sample',
      weight: 0.3,
      description: 'The template for all mutations.',
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
  roomDescription: 'The Spillmother churns in its toxic pool, a sentient spill.',
  abilities: [
    {
      id: 'delugeOfPoison',
      name: 'Deluge of Poison',
      damage: 80,
      windUpTicks: 8,
      telegraphText: 'The Spillmother rises, toxic waves building...',
    },
  ],
};
