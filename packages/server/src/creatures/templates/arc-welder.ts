/**
 * Arc Welder — Welding robots repurposed for combat. They fire sustained arcs of electricity an
 * d can weld foes to metal surfaces.
 *
 * Ranged archetype.
 *
 * Stats (Tier 2):
 *   HP: 75, Attack: 21, Defence: 10, Armour: 12, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const ARC_WELDER: CreatureTemplate = {
  type: 'arc_welder',
  name: 'Arc Welder',
  stats: {
    maxHp: 75,
    attack: 21,
    defence: 10,
    armour: 12,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'welding_torch',
      name: 'Welding Torch',
      weight: 2.0,
      description: 'Still operational.',
      dropWeight: 65,
    },
    {
      itemId: 'arc_capacitor',
      name: 'Arc Capacitor',
      weight: 1.5,
      description: 'Stores high voltage.',
      dropWeight: 25,
    },
    {
      itemId: 'metal_slag',
      name: 'Metal Slag',
      weight: 0.5,
      description: 'Cooled weld seams.',
      dropWeight: 10,
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
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'An arc welder adjusts its torch, sparks cascading.',
  abilities: [
    {
      id: 'arcStream',
      name: 'Arc Stream',
      damage: 30,
      windUpTicks: 4,
      telegraphText: 'The welder\'s torch ignites, arc building...',
    },
  ],
};
