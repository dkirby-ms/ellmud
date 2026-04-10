/**
 * Atomic Colossus — A walking nuclear reactor core given humanoid form. It leaves radiation trails a
 * nd glows with atomic fire.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 250, Attack: 53, Defence: 18, Armour: 30, Agility: 2
 */

import type { CreatureTemplate } from '../types.js';

export const ATOMIC_COLOSSUS: CreatureTemplate = {
  type: 'atomic_colossus',
  name: 'Atomic Colossus',
  stats: {
    maxHp: 250,
    attack: 53,
    defence: 18,
    armour: 30,
    agility: 2,
  },
  lootTable: [
    {
      itemId: 'reactor_core_fragment',
      name: 'Reactor Core Fragment',
      weight: 4.0,
      description: 'Dangerously radioactive.',
      dropWeight: 50,
    },
    {
      itemId: 'atomic_heart',
      name: 'Atomic Heart',
      weight: 2.0,
      description: 'Still fissioning.',
      dropWeight: 30,
    },
    {
      itemId: 'enriched_uranium',
      name: 'Enriched Uranium',
      weight: 3.0,
      description: 'Weapons-grade material.',
      dropWeight: 20,
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
  roomDescription: 'An atomic colossus radiates lethal energy, air shimmering around it.',
  abilities: [
    {
      id: 'nuclearPulse',
      name: 'Nuclear Pulse',
      damage: 70,
      windUpTicks: 7,
      telegraphText: 'The colossus\'s core brightens, heat building...',
    },
    {
      id: 'meltdownWave',
      name: 'Meltdown Wave',
      damage: 60,
      windUpTicks: 6,
      telegraphText: 'Radiation levels spike, the colossus destabilizing...',
    },
  ],
};
