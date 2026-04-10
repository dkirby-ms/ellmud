/**
 * Ash Warden — Robed figures composed entirely of ash and ember. They were firefighters once. N
 * ow they spread flame with a zealot's devotion.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 125, Attack: 42, Defence: 16, Armour: 12, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const ASH_WARDEN: CreatureTemplate = {
  type: 'ash_warden',
  name: 'Ash Warden',
  stats: {
    maxHp: 125,
    attack: 42,
    defence: 16,
    armour: 12,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'ember_core',
      name: 'Ember Core',
      weight: 1.0,
      description: 'A heart of perpetual flame.',
      dropWeight: 50,
    },
    {
      itemId: 'ash_cloak',
      name: 'Ash Cloak',
      weight: 3.0,
      description: 'Smolders constantly, never consumed.',
      dropWeight: 30,
    },
    {
      itemId: 'wardens_brand',
      name: 'Warden\'s Brand',
      weight: 4.0,
      description: 'A fire axe, blade wreathed in ember.',
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'An ash warden stands in perpetual conflagration, embers drifting from its robes.',
  abilities: [
    {
      id: 'emberWave',
      name: 'Ember Wave',
      damage: 55,
      windUpTicks: 5,
      telegraphText: 'The warden raises its arms, ash swirling into flame...',
    },
  ],
};
