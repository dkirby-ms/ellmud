/**
 * Vine Stalker — Predators that blend perfectly with overgrown vegetation. Their bodies are livin
 * g vines that strike from concealment.
 *
 * Skulker archetype.
 *
 * Stats (Tier 2):
 *   HP: 75, Attack: 27, Defence: 9, Armour: 7, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const VINE_STALKER: CreatureTemplate = {
  type: 'vine_stalker',
  name: 'Vine Stalker',
  stats: {
    maxHp: 75,
    attack: 27,
    defence: 9,
    armour: 7,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'vine_whip',
      name: 'Vine Whip',
      weight: 2.0,
      description: 'Living weapon.',
      dropWeight: 60,
    },
    {
      itemId: 'chlorophyll_extract',
      name: 'Chlorophyll Extract',
      weight: 0.5,
      description: 'Pure plant essence.',
      dropWeight: 30,
    },
    {
      itemId: 'camouflage_leaf',
      name: 'Camouflage Leaf',
      weight: 0.3,
      description: 'Provides natural concealment.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.35,
  aggressive: true,
  roomDescription: 'Somewhere among the vegetation, a vine stalker waits.',
  abilities: [
    {
      id: 'stranglingVines',
      name: 'Strangling Vines',
      damage: 32,
      windUpTicks: 3,
      telegraphText: 'Vines snake toward you from hidden positions...',
    },
  ],
};
