/**
 * Depth Sovereign — A being of pure pressure and darkness. It manifests as a humanoid void surrounde
 * d by crushing water. Those who hear its voice feel the weight of the ocean.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 150, Attack: 52, Defence: 20, Armour: 15, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const DEPTH_SOVEREIGN: CreatureTemplate = {
  type: 'depth_sovereign',
  name: 'Depth Sovereign',
  stats: {
    maxHp: 150,
    attack: 52,
    defence: 20,
    armour: 15,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'void_heart',
      name: 'Void Heart',
      weight: 1.0,
      description: 'A sphere of absolute darkness.',
      dropWeight: 40,
    },
    {
      itemId: 'pressure_sphere',
      name: 'Pressure Sphere',
      weight: 2.0,
      description: 'Compacted water, solid as steel.',
      dropWeight: 35,
    },
    {
      itemId: 'sovereigns_trident',
      name: 'Sovereign\'s Trident',
      weight: 6.0,
      description: 'Three-pronged weapon, drips endlessly.',
      dropWeight: 25,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'boss'],
    forbiddenRoomTypes: ['corridor'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'The depth sovereign hovers in absolute darkness, water bending around it.',
  abilities: [
    {
      id: 'abyssalPressure',
      name: 'Abyssal Pressure',
      damage: 60,
      windUpTicks: 5,
      telegraphText: 'The sovereign extends its hands, space compressing around them...',
    },
    {
      id: 'voidCall',
      name: 'Void Call',
      damage: 45,
      windUpTicks: 4,
      telegraphText: 'Darkness wells from the sovereign\'s form...',
    },
  ],
};
