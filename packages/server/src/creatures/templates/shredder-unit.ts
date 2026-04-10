/**
 * Shredder Unit — Industrial shredder machines that gained mobility. They process anything organic
 *  into pulp with rotating blades.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 105, Attack: 28, Defence: 8, Armour: 18, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const SHREDDER_UNIT: CreatureTemplate = {
  type: 'shredder_unit',
  name: 'Shredder Unit',
  stats: {
    maxHp: 105,
    attack: 28,
    defence: 8,
    armour: 18,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'shredder_blade',
      name: 'Shredder Blade',
      weight: 3.0,
      description: 'Serrated and deadly.',
      dropWeight: 60,
    },
    {
      itemId: 'hydraulic_fluid',
      name: 'Hydraulic Fluid',
      weight: 1.0,
      description: 'Under pressure.',
      dropWeight: 30,
    },
    {
      itemId: 'motor_assembly',
      name: 'Motor Assembly',
      weight: 4.0,
      description: 'High-torque mechanism.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.05,
  aggressive: true,
  roomDescription: 'A shredder unit idles, blades rotating slowly.',
  abilities: [
    {
      id: 'bladeCyclone',
      name: 'Blade Cyclone',
      damage: 42,
      windUpTicks: 5,
      telegraphText: 'The shredder\'s blades accelerate to dangerous speeds...',
    },
  ],
};
