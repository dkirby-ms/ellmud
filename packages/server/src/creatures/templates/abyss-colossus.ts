/**
 * Abyss Colossus — Massive beings formed from the deepest darkness. They are voids given shape, and
 *  their presence drains all light.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 235, Attack: 50, Defence: 19, Armour: 28, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const ABYSS_COLOSSUS: CreatureTemplate = {
  type: 'abyss_colossus',
  name: 'Abyss Colossus',
  stats: {
    maxHp: 235,
    attack: 50,
    defence: 19,
    armour: 28,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'abyss_core',
      name: 'Abyss Core',
      weight: 3.0,
      description: 'A sphere of absolute nothing.',
      dropWeight: 50,
    },
    {
      itemId: 'void_plate',
      name: 'Void Plate',
      weight: 7.0,
      description: 'Armor from the depths.',
      dropWeight: 35,
    },
    {
      itemId: 'darkness_incarnate',
      name: 'Darkness Incarnate',
      weight: 2.0,
      description: 'Solidified absence.',
      dropWeight: 15,
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
  roomDescription: 'An abyss colossus stands, a hole in reality.',
  abilities: [
    {
      id: 'voidCrush',
      name: 'Void Crush',
      damage: 66,
      windUpTicks: 7,
      telegraphText: 'The colossus contracts, drawing everything inward...',
    },
    {
      id: 'extinctionWave',
      name: 'Extinction Wave',
      damage: 58,
      windUpTicks: 6,
      telegraphText: 'Absolute darkness spreads from the colossus...',
    },
  ],
};
