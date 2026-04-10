/**
 * Slime Creeper — Amorphous blobs of industrial waste given rudimentary intelligence. They ooze th
 * rough vents and drains.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 25, Attack: 8, Defence: 1, Armour: 0, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const SLIME_CREEPER: CreatureTemplate = {
  type: 'slime_creeper',
  name: 'Slime Creeper',
  stats: {
    maxHp: 25,
    attack: 8,
    defence: 1,
    armour: 0,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'slime_sample',
      name: 'Slime Sample',
      weight: 0.5,
      description: 'Acidic and corrosive.',
      dropWeight: 85,
    },
    {
      itemId: 'contaminated_core',
      name: 'Contaminated Core',
      weight: 0.3,
      description: 'A nucleus of dense waste.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.6,
  aggressive: false,
  roomDescription: 'A slime creeper flows across the floor, leaving caustic residue.',
};
