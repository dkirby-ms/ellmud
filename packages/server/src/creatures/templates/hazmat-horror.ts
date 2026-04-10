/**
 * Hazmat Horror — Figures in sealed hazmat suits fused with their wearer. The suits still function
 * , protecting something that should have died decades ago.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 105, Attack: 26, Defence: 11, Armour: 16, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const HAZMAT_HORROR: CreatureTemplate = {
  type: 'hazmat_horror',
  name: 'Hazmat Horror',
  stats: {
    maxHp: 105,
    attack: 26,
    defence: 11,
    armour: 16,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'hazmat_fabric',
      name: 'Hazmat Fabric',
      weight: 4.0,
      description: 'Sealed and intact.',
      dropWeight: 50,
    },
    {
      itemId: 'respirator_mask',
      name: 'Respirator Mask',
      weight: 2.0,
      description: 'Still filters air.',
      dropWeight: 35,
    },
    {
      itemId: 'chemical_filter',
      name: 'Chemical Filter',
      weight: 1.0,
      description: 'Saturated but functional.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.1,
  aggressive: true,
  roomDescription: 'A hazmat horror lurches forward, suit hissing with leaks.',
  abilities: [
    {
      id: 'toxicCloud',
      name: 'Toxic Cloud',
      damage: 35,
      windUpTicks: 5,
      telegraphText: 'The horror\'s suit ruptures, green gas venting...',
    },
  ],
};
