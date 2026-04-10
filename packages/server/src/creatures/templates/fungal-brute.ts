/**
 * Fungal Brute — Massive humanoid shapes entirely composed of fungal matter. They spread spores w
 * ith every blow and regenerate constantly.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 110, Attack: 22, Defence: 10, Armour: 14, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const FUNGAL_BRUTE: CreatureTemplate = {
  type: 'fungal_brute',
  name: 'Fungal Brute',
  stats: {
    maxHp: 110,
    attack: 22,
    defence: 10,
    armour: 14,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'fungal_mass',
      name: 'Fungal Mass',
      weight: 3.0,
      description: 'Dense mycelium.',
      dropWeight: 60,
    },
    {
      itemId: 'spore_core',
      name: 'Spore Core',
      weight: 1.5,
      description: 'Regenerative center.',
      dropWeight: 30,
    },
    {
      itemId: 'brute_spore',
      name: 'Brute Spore',
      weight: 0.5,
      description: 'Explosive when disturbed.',
      dropWeight: 10,
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
  fleeThreshold: 0.05,
  aggressive: true,
  roomDescription: 'A fungal brute stands like a monument, spores drifting from its body.',
  abilities: [
    {
      id: 'mycoticSlam',
      name: 'Mycotic Slam',
      damage: 36,
      windUpTicks: 5,
      telegraphText: 'The brute\'s form swells, spores erupting...',
    },
  ],
};
