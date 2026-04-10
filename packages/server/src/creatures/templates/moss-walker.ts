/**
 * Moss Walker — Deer overgrown with moss and lichen. They charge intruders with surprising aggre
 * ssion, antlers wrapped in vines.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 35, Attack: 9, Defence: 3, Armour: 3, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const MOSS_WALKER: CreatureTemplate = {
  type: 'moss_walker',
  name: 'Moss Walker',
  stats: {
    maxHp: 35,
    attack: 9,
    defence: 3,
    armour: 3,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'moss_pelt',
      name: 'Moss Pelt',
      weight: 2.5,
      description: 'Soft and damp.',
      dropWeight: 65,
    },
    {
      itemId: 'vine_wrapped_antler',
      name: 'Vine-Wrapped Antler',
      weight: 3.0,
      description: 'Sturdy and sharp.',
      dropWeight: 25,
    },
    {
      itemId: 'lichen_sample',
      name: 'Lichen Sample',
      weight: 0.5,
      description: 'Glows faintly in darkness.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'A moss walker stands alert, vegetation rustling with each breath.',
};
