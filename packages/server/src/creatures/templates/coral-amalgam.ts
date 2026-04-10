/**
 * Coral Amalgam — A fusion of coral, metal, and organic matter grown into a vaguely humanoid shape
 * . It tears through obstacles with relentless fury.
 *
 * Berserker archetype.
 *
 * Stats (Tier 3):
 *   HP: 220, Attack: 56, Defence: 14, Armour: 28, Agility: 2
 */

import type { CreatureTemplate } from '../types.js';

export const CORAL_AMALGAM: CreatureTemplate = {
  type: 'coral_amalgam',
  name: 'Coral Amalgam',
  stats: {
    maxHp: 220,
    attack: 56,
    defence: 14,
    armour: 28,
    agility: 2,
  },
  lootTable: [
    {
      itemId: 'coral_fragment',
      name: 'Coral Fragment',
      weight: 3.0,
      description: 'Living stone, sharp edges.',
      dropWeight: 55,
    },
    {
      itemId: 'metal_coral_alloy',
      name: 'Metal-Coral Alloy',
      weight: 4.0,
      description: 'Organic and inorganic fused.',
      dropWeight: 30,
    },
    {
      itemId: 'amalgam_core',
      name: 'Amalgam Core',
      weight: 1.5,
      description: 'Pulsing with hybrid life.',
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
  fleeThreshold: 0.05,
  aggressive: true,
  roomDescription: 'A coral amalgam stands immobile, growths spreading across walls.',
  abilities: [
    {
      id: 'crushingAssault',
      name: 'Crushing Assault',
      damage: 70,
      windUpTicks: 6,
      telegraphText: 'The amalgam\'s coral growths sharpen, metal grinding...',
    },
  ],
};
