/**
 * Void Hound — Monstrous canines formed from pure darkness. Their howls extinguish flames and t
 * heir bite drains warmth.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 88, Attack: 24, Defence: 8, Armour: 9, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const VOID_HOUND: CreatureTemplate = {
  type: 'void_hound',
  name: 'Void Hound',
  stats: {
    maxHp: 88,
    attack: 24,
    defence: 8,
    armour: 9,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'void_pelt',
      name: 'Void Pelt',
      weight: 3.0,
      description: 'Fur of living darkness.',
      dropWeight: 60,
    },
    {
      itemId: 'hounds_fang',
      name: 'Hound\'s Fang',
      weight: 1.5,
      description: 'Drains heat on contact.',
      dropWeight: 30,
    },
    {
      itemId: 'shadow_heart',
      name: 'Shadow Heart',
      weight: 1.0,
      description: 'Beats with cold pulse.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'Void hounds prowl, their forms darker than shadow.',
  abilities: [
    {
      id: 'howlOfNight',
      name: 'Howl of Night',
      damage: 30,
      windUpTicks: 4,
      telegraphText: 'The hound inhales, preparing to unleash darkness...',
    },
  ],
};
