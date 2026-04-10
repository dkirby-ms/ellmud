/**
 * Drowned Swimmer — Waterlogged corpses that retained enough muscle memory to swim. They lunge from 
 * dark water with horrifying speed.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 40, Attack: 11, Defence: 3, Armour: 2, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const DROWNED_SWIMMER: CreatureTemplate = {
  type: 'drowned_swimmer',
  name: 'Drowned Swimmer',
  stats: {
    maxHp: 40,
    attack: 11,
    defence: 3,
    armour: 2,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'waterlogged_fabric',
      name: 'Waterlogged Fabric',
      weight: 1.0,
      description: 'Perpetually damp.',
      dropWeight: 70,
    },
    {
      itemId: 'swimmers_weight',
      name: 'Swimmer\'s Weight',
      weight: 4.0,
      description: 'Metal weights, still attached.',
      dropWeight: 20,
    },
    {
      itemId: 'drowned_knife',
      name: 'Drowned Knife',
      weight: 2.0,
      description: 'Pitted blade, cold to touch.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.15,
  aggressive: true,
  roomDescription: 'A drowned swimmer floats just below the surface, watching.',
};
