/**
 * Midnight Sentinel — Armored guardians of dark sanctuaries. They were sworn to protect something, and
 *  death hasn't released them.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 105, Attack: 23, Defence: 11, Armour: 15, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const MIDNIGHT_SENTINEL: CreatureTemplate = {
  type: 'midnight_sentinel',
  name: 'Midnight Sentinel',
  stats: {
    maxHp: 105,
    attack: 23,
    defence: 11,
    armour: 15,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'sentinel_armor',
      name: 'Sentinel Armor',
      weight: 6.0,
      description: 'Black plate, absorbs light.',
      dropWeight: 55,
    },
    {
      itemId: 'oath_blade',
      name: 'Oath Blade',
      weight: 4.0,
      description: 'Sworn to darkness.',
      dropWeight: 30,
    },
    {
      itemId: 'vigil_stone',
      name: 'Vigil Stone',
      weight: 1.0,
      description: 'Never sleeps.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'A midnight sentinel stands eternal watch.',
  abilities: [
    {
      id: 'sentinelStrike',
      name: 'Sentinel Strike',
      damage: 36,
      windUpTicks: 5,
      telegraphText: 'The sentinel raises its blade, darkness gathering...',
    },
  ],
};
