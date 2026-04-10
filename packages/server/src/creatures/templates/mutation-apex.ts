/**
 * Mutation Apex — The ultimate expression of radiation-driven evolution. A chimera of multiple spe
 * cies fused into one deadly predator.
 *
 * Berserker archetype.
 *
 * Stats (Tier 3):
 *   HP: 190, Attack: 58, Defence: 15, Armour: 22, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const MUTATION_APEX: CreatureTemplate = {
  type: 'mutation_apex',
  name: 'Mutation Apex',
  stats: {
    maxHp: 190,
    attack: 58,
    defence: 15,
    armour: 22,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'apex_tissue',
      name: 'Apex Tissue',
      weight: 4.0,
      description: 'Multi-species hybrid.',
      dropWeight: 55,
    },
    {
      itemId: 'mutation_core',
      name: 'Mutation Core',
      weight: 2.0,
      description: 'Source of adaptation.',
      dropWeight: 30,
    },
    {
      itemId: 'evolved_claw',
      name: 'Evolved Claw',
      weight: 3.0,
      description: 'Perfect killing tool.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.1,
  aggressive: true,
  roomDescription: 'A mutation apex prowls, a perfect synthesis of predators.',
  abilities: [
    {
      id: 'adaptiveStrike',
      name: 'Adaptive Strike',
      damage: 72,
      windUpTicks: 6,
      telegraphText: 'The apex\'s body shifts, optimizing for the kill...',
    },
  ],
};
