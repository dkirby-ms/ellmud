/**
 * Storm Elemental — Living radiation storms given consciousness. They crackle with energy and spread
 *  fallout wherever they drift.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 65, Attack: 22, Defence: 12, Armour: 6, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const STORM_ELEMENTAL: CreatureTemplate = {
  type: 'storm_elemental',
  name: 'Storm Elemental',
  stats: {
    maxHp: 65,
    attack: 22,
    defence: 12,
    armour: 6,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'storm_core',
      name: 'Storm Core',
      weight: 0.5,
      description: 'Concentrated radiation.',
      dropWeight: 70,
    },
    {
      itemId: 'lightning_fragment',
      name: 'Lightning Fragment',
      weight: 0.3,
      description: 'Solidified energy.',
      dropWeight: 25,
    },
    {
      itemId: 'elemental_essence',
      name: 'Elemental Essence',
      weight: 0.2,
      description: 'Pure radiation.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'A storm elemental hovers, electricity and radiation arcing.',
  abilities: [
    {
      id: 'gammaLightning',
      name: 'Gamma Lightning',
      damage: 29,
      windUpTicks: 4,
      telegraphText: 'The elemental crackles, energy building...',
    },
  ],
};
