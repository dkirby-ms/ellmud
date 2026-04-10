/**
 * Lamprey Mass — A writhing ball of mutated lampreys fused together. They attach to victims and d
 * rain blood with horrifying efficiency.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 25, Attack: 8, Defence: 2, Armour: 0, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const LAMPREY_MASS: CreatureTemplate = {
  type: 'lamprey_mass',
  name: 'Lamprey Mass',
  stats: {
    maxHp: 25,
    attack: 8,
    defence: 2,
    armour: 0,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'lamprey_tooth',
      name: 'Lamprey Tooth',
      weight: 0.1,
      description: 'Circular rows of tiny needles.',
      dropWeight: 80,
    },
    {
      itemId: 'mutant_tissue',
      name: 'Mutant Tissue',
      weight: 0.3,
      description: 'Unnaturally elastic.',
      dropWeight: 20,
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
  fleeThreshold: 0.4,
  aggressive: true,
  roomDescription: 'A lamprey mass undulates in the shallows, mouths opening and closing.',
};
