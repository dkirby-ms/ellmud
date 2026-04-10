/**
 * Forest Titan — A walking tree of immense size, animated by the collective will of the forest. I
 * t defends the overgrown zones with ancient fury.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 230, Attack: 48, Defence: 16, Armour: 30, Agility: 2
 */

import type { CreatureTemplate } from '../types.js';

export const FOREST_TITAN: CreatureTemplate = {
  type: 'forest_titan',
  name: 'Forest Titan',
  stats: {
    maxHp: 230,
    attack: 48,
    defence: 16,
    armour: 30,
    agility: 2,
  },
  lootTable: [
    {
      itemId: 'titan_heartwood',
      name: 'Titan Heartwood',
      weight: 8.0,
      description: 'Ancient timber, impossibly hard.',
      dropWeight: 50,
    },
    {
      itemId: 'living_bark',
      name: 'Living Bark',
      weight: 5.0,
      description: 'Regenerates when damaged.',
      dropWeight: 35,
    },
    {
      itemId: 'primordial_sap',
      name: 'Primordial Sap',
      weight: 2.0,
      description: 'Heals any wound.',
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
  roomDescription: 'A forest titan towers overhead, its branches scraping the ceiling.',
  abilities: [
    {
      id: 'rootSurge',
      name: 'Root Surge',
      damage: 62,
      windUpTicks: 6,
      telegraphText: 'Roots burst from the ground around the titan...',
    },
    {
      id: 'branchSweep',
      name: 'Branch Sweep',
      damage: 55,
      windUpTicks: 5,
      telegraphText: 'The titan\'s limbs creak, swinging wide...',
    },
  ],
};
