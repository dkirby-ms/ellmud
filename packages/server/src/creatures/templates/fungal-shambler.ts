/**
 * Fungal Shambler — Humans overgrown with toxic fungus. The mycelium network puppets the corpse with
 *  terrifying strength.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 90, Attack: 24, Defence: 8, Armour: 10, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const FUNGAL_SHAMBLER: CreatureTemplate = {
  type: 'fungal_shambler',
  name: 'Fungal Shambler',
  stats: {
    maxHp: 90,
    attack: 24,
    defence: 8,
    armour: 10,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'fungal_growth',
      name: 'Fungal Growth',
      weight: 1.5,
      description: 'Pulsing with spores.',
      dropWeight: 60,
    },
    {
      itemId: 'infected_tissue',
      name: 'Infected Tissue',
      weight: 0.8,
      description: 'Mycelium-threaded.',
      dropWeight: 30,
    },
    {
      itemId: 'spore_pod',
      name: 'Spore Pod',
      weight: 0.5,
      description: 'Ready to burst.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.15,
  aggressive: true,
  roomDescription: 'A fungal shambler stands covered in pulsing growths.',
  abilities: [
    {
      id: 'sporeBurst',
      name: 'Spore Burst',
      damage: 28,
      windUpTicks: 4,
      telegraphText: 'Fungal growths swell across the shambler\'s body...',
    },
  ],
};
