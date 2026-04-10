/**
 * Mutant Hound — Dogs transformed by chemical exposure. Their skin is patchy and raw, their eyes 
 * milky, but they retain pack instincts.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 32, Attack: 10, Defence: 3, Armour: 2, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const MUTANT_HOUND: CreatureTemplate = {
  type: 'mutant_hound',
  name: 'Mutant Hound',
  stats: {
    maxHp: 32,
    attack: 10,
    defence: 3,
    armour: 2,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'mutant_hide',
      name: 'Mutant Hide',
      weight: 2.0,
      description: 'Patchy and scarred.',
      dropWeight: 65,
    },
    {
      itemId: 'chemical_scarred_fang',
      name: 'Chemical-Scarred Fang',
      weight: 0.5,
      description: 'Yellowed and pitted.',
      dropWeight: 30,
    },
    {
      itemId: 'contaminated_collar',
      name: 'Contaminated Collar',
      weight: 1.0,
      description: 'Rusted tags still attached.',
      dropWeight: 5,
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
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'Mutant hounds prowl here, their breathing labored and wet.',
};
