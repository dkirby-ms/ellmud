/**
 * Sparker Drone — Small flying drones with damaged circuits that discharge electricity erratically
 * . They were maintenance bots once.
 *
 * Ranged archetype.
 *
 * Stats (Tier 1):
 *   HP: 22, Attack: 8, Defence: 3, Armour: 4, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const SPARKER_DRONE: CreatureTemplate = {
  type: 'sparker_drone',
  name: 'Sparker Drone',
  stats: {
    maxHp: 22,
    attack: 8,
    defence: 3,
    armour: 4,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'damaged_circuit',
      name: 'Damaged Circuit',
      weight: 0.3,
      description: 'Still sparking.',
      dropWeight: 75,
    },
    {
      itemId: 'drone_casing',
      name: 'Drone Casing',
      weight: 1.0,
      description: 'Lightweight metal.',
      dropWeight: 20,
    },
    {
      itemId: 'power_cell',
      name: 'Power Cell',
      weight: 0.5,
      description: 'Partially charged.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 2,
    maxCount: 4,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.4,
  aggressive: true,
  roomDescription: 'Sparker drones hover erratically, trailing sparks.',
  abilities: [
    {
      id: 'electricZap',
      name: 'Electric Zap',
      damage: 12,
      windUpTicks: 2,
      telegraphText: 'The drone\'s circuits flare, electricity arcing...',
    },
  ],
};
