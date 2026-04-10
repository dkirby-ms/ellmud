/**
 * Pale Wanderer — Corpses drained of all color, wandering endlessly in darkness. They attack anyth
 * ing with warmth or light.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 32, Attack: 8, Defence: 2, Armour: 1, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const PALE_WANDERER: CreatureTemplate = {
  type: 'pale_wanderer',
  name: 'Pale Wanderer',
  stats: {
    maxHp: 32,
    attack: 8,
    defence: 2,
    armour: 1,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'pale_flesh',
      name: 'Pale Flesh',
      weight: 1.0,
      description: 'Colorless tissue.',
      dropWeight: 70,
    },
    {
      itemId: 'drained_bone',
      name: 'Drained Bone',
      weight: 0.8,
      description: 'Light and brittle.',
      dropWeight: 25,
    },
    {
      itemId: 'faded_garment',
      name: 'Faded Garment',
      weight: 1.5,
      description: 'Once colorful.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'Pale wanderers drift through darkness, seeking light to extinguish.',
};
