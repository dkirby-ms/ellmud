/**
 * Demolisher Mech — Heavy demolition machinery turned weapon. It tears through structures and people
 *  with equal efficiency.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 220, Attack: 51, Defence: 17, Armour: 32, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const DEMOLISHER_MECH: CreatureTemplate = {
  type: 'demolisher_mech',
  name: 'Demolisher Mech',
  stats: {
    maxHp: 220,
    attack: 51,
    defence: 17,
    armour: 32,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'demolisher_arm',
      name: 'Demolisher Arm',
      weight: 12.0,
      description: 'Hydraulic claw assembly.',
      dropWeight: 50,
    },
    {
      itemId: 'reinforced_plating',
      name: 'Reinforced Plating',
      weight: 8.0,
      description: 'Military-grade armor.',
      dropWeight: 35,
    },
    {
      itemId: 'reactor_core',
      name: 'Reactor Core',
      weight: 3.0,
      description: 'Unstable power source.',
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
  roomDescription: 'A demolisher mech stands among ruins it created.',
  abilities: [
    {
      id: 'wreckingBlow',
      name: 'Wrecking Blow',
      damage: 68,
      windUpTicks: 7,
      telegraphText: 'The mech\'s arm retracts, hydraulics screaming...',
    },
    {
      id: 'debrisStorm',
      name: 'Debris Storm',
      damage: 55,
      windUpTicks: 5,
      telegraphText: 'The mech tears chunks from nearby structures...',
    },
  ],
};
