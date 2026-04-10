/**
 * Shadow Sovereign — The master of all shadows in the zone. It commands darkness itself and can be an
 * ywhere shadows exist.
 *
 * Skulker archetype.
 *
 * Stats (Tier 3):
 *   HP: 165, Attack: 54, Defence: 20, Armour: 18, Agility: 12
 */

import type { CreatureTemplate } from '../types.js';

export const SHADOW_SOVEREIGN: CreatureTemplate = {
  type: 'shadow_sovereign',
  name: 'Shadow Sovereign',
  stats: {
    maxHp: 165,
    attack: 54,
    defence: 20,
    armour: 18,
    agility: 12,
  },
  lootTable: [
    {
      itemId: 'sovereigns_cloak',
      name: 'Sovereign\'s Cloak',
      weight: 4.0,
      description: 'Woven from absolute darkness.',
      dropWeight: 45,
    },
    {
      itemId: 'shadow_crown',
      name: 'Shadow Crown',
      weight: 1.5,
      description: 'Commands all shadows.',
      dropWeight: 35,
    },
    {
      itemId: 'void_dagger',
      name: 'Void Dagger',
      weight: 2.0,
      description: 'Cuts through light itself.',
      dropWeight: 20,
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
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'The shadow sovereign is everywhere and nowhere.',
  abilities: [
    {
      id: 'shadowStep',
      name: 'Shadow Step',
      damage: 68,
      windUpTicks: 4,
      telegraphText: 'The sovereign vanishes, darkness spreading...',
    },
  ],
};
