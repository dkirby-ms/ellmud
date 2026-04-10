/**
 * Verdant Predator — The apex hunter of overgrown zones. Part plant, part beast, all lethal. It moves
 *  through vegetation like water.
 *
 * Skulker archetype.
 *
 * Stats (Tier 3):
 *   HP: 170, Attack: 54, Defence: 18, Armour: 20, Agility: 11
 */

import type { CreatureTemplate } from '../types.js';

export const VERDANT_PREDATOR: CreatureTemplate = {
  type: 'verdant_predator',
  name: 'Verdant Predator',
  stats: {
    maxHp: 170,
    attack: 54,
    defence: 18,
    armour: 20,
    agility: 11,
  },
  lootTable: [
    {
      itemId: 'predator_fang',
      name: 'Predator Fang',
      weight: 3.0,
      description: 'Hollow and delivers venom.',
      dropWeight: 55,
    },
    {
      itemId: 'verdant_hide',
      name: 'Verdant Hide',
      weight: 6.0,
      description: 'Camouflaged leather.',
      dropWeight: 30,
    },
    {
      itemId: 'apex_claw',
      name: 'Apex Claw',
      weight: 2.5,
      description: 'Can cut through anything.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'Something large moves through the overgrowth. You can\'t quite see it.',
  abilities: [
    {
      id: 'ambushStrike',
      name: 'Ambush Strike',
      damage: 70,
      windUpTicks: 4,
      telegraphText: 'The vegetation shifts, predator preparing to pounce...',
    },
  ],
};
