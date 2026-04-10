/**
 * Crystalline Behemoth — A creature encased in crystallized chemical compounds. Each movement shatters an
 * d reforms its shell in cascading waves.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 240, Attack: 52, Defence: 20, Armour: 32, Agility: 2
 */

import type { CreatureTemplate } from '../types.js';

export const CRYSTALLINE_BEHEMOTH: CreatureTemplate = {
  type: 'crystalline_behemoth',
  name: 'Crystalline Behemoth',
  stats: {
    maxHp: 240,
    attack: 52,
    defence: 20,
    armour: 32,
    agility: 2,
  },
  lootTable: [
    {
      itemId: 'crystal_shard',
      name: 'Crystal Shard',
      weight: 3.0,
      description: 'Razor-sharp compound.',
      dropWeight: 55,
    },
    {
      itemId: 'behemoth_core',
      name: 'Behemoth Core',
      weight: 2.5,
      description: 'Pulsing crystalline heart.',
      dropWeight: 30,
    },
    {
      itemId: 'chemical_lattice',
      name: 'Chemical Lattice',
      weight: 4.0,
      description: 'Structured molecular matrix.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'boss'],
    forbiddenRoomTypes: ['corridor'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.05,
  aggressive: true,
  roomDescription: 'A crystalline behemoth stands motionless, refracting toxic light.',
  abilities: [
    {
      id: 'crystalStorm',
      name: 'Crystal Storm',
      damage: 65,
      windUpTicks: 6,
      telegraphText: 'Crystals begin shedding from the behemoth\'s form...',
    },
  ],
};
