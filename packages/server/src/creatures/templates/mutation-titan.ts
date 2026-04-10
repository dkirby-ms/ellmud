/**
 * Mutation Titan — A massive creature born from chemical chaos. Every part of its body is from a di
 * fferent species, stitched together by mutagenic forces.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 210, Attack: 50, Defence: 17, Armour: 26, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const MUTATION_TITAN: CreatureTemplate = {
  type: 'mutation_titan',
  name: 'Mutation Titan',
  stats: {
    maxHp: 210,
    attack: 50,
    defence: 17,
    armour: 26,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'titan_flesh',
      name: 'Titan Flesh',
      weight: 6.0,
      description: 'Hybrid tissue, warm and wrong.',
      dropWeight: 45,
    },
    {
      itemId: 'mutagenic_sample',
      name: 'Mutagenic Sample',
      weight: 2.0,
      description: 'Unstable genetic material.',
      dropWeight: 35,
    },
    {
      itemId: 'chimeric_bone',
      name: 'Chimeric Bone',
      weight: 5.0,
      description: 'Dense and multi-layered.',
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'boss'],
    forbiddenRoomTypes: ['corridor', 'dead_end'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'A mutation titan fills the space, its form defying biology.',
  abilities: [
    {
      id: 'mutagenicSlam',
      name: 'Mutagenic Slam',
      damage: 68,
      windUpTicks: 7,
      telegraphText: 'The titan\'s limbs swell grotesquely...',
    },
    {
      id: 'chaosRoar',
      name: 'Chaos Roar',
      damage: 55,
      windUpTicks: 5,
      telegraphText: 'The titan inhales with a dozen different lungs...',
    },
  ],
};
