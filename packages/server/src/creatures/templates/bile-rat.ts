/**
 * Bile Rat — Rats mutated by toxic exposure. Their fur is matted with chemical residue and th
 * eir bite carries burning venom.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 18, Attack: 7, Defence: 2, Armour: 1, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const BILE_RAT: CreatureTemplate = {
  type: 'bile_rat',
  name: 'Bile Rat',
  stats: {
    maxHp: 18,
    attack: 7,
    defence: 2,
    armour: 1,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'toxic_tooth',
      name: 'Toxic Tooth',
      weight: 0.1,
      description: 'Drips with caustic venom.',
      dropWeight: 80,
    },
    {
      itemId: 'matted_fur',
      name: 'Matted Fur',
      weight: 0.3,
      description: 'Stiff with chemical residue.',
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 6,
    preferredRoomTypes: ['corridor', 'dead_end'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.4,
  aggressive: true,
  roomDescription: 'Bile rats scurry through toxic puddles, leaving smoking trails.',
};
