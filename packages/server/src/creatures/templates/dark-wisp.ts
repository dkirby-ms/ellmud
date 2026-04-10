/**
 * Dark Wisp — Floating orbs of concentrated shadow. They drain light from the environment and 
 * fire darkness bolts.
 *
 * Ranged archetype.
 *
 * Stats (Tier 1):
 *   HP: 18, Attack: 7, Defence: 3, Armour: 0, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const DARK_WISP: CreatureTemplate = {
  type: 'dark_wisp',
  name: 'Dark Wisp',
  stats: {
    maxHp: 18,
    attack: 7,
    defence: 3,
    armour: 0,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'wisp_core',
      name: 'Wisp Core',
      weight: 0.2,
      description: 'A sphere of darkness.',
      dropWeight: 80,
    },
    {
      itemId: 'shadow_flame',
      name: 'Shadow Flame',
      weight: 0.3,
      description: 'Cold fire that casts darkness.',
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
  fleeThreshold: 0.5,
  aggressive: false,
  roomDescription: 'Dark wisps float silently, extinguishing nearby light.',
  abilities: [
    {
      id: 'darknessBolt',
      name: 'Darkness Bolt',
      damage: 10,
      windUpTicks: 2,
      telegraphText: 'The wisp pulses, shadow gathering...',
    },
  ],
};
