/**
 * Pressure Horror — Deep-water predators adapted to crushing depths. Their bodies weep black fluid a
 * nd their strikes carry the weight of the abyss.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 95, Attack: 24, Defence: 10, Armour: 14, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const PRESSURE_HORROR: CreatureTemplate = {
  type: 'pressure_horror',
  name: 'Pressure Horror',
  stats: {
    maxHp: 95,
    attack: 24,
    defence: 10,
    armour: 14,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'pressure_gland',
      name: 'Pressure Gland',
      weight: 1.5,
      description: 'Compresses water into dense spheres.',
      dropWeight: 50,
    },
    {
      itemId: 'abyssal_hide',
      name: 'Abyssal Hide',
      weight: 4.0,
      description: 'Thick skin, resistant to crushing.',
      dropWeight: 35,
    },
    {
      itemId: 'black_ichor',
      name: 'Black Ichor',
      weight: 0.5,
      description: 'Caustic fluid from deep places.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'dead_end'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.1,
  aggressive: true,
  roomDescription: 'A pressure horror looms in the deep water, black fluid trailing from its form.',
  abilities: [
    {
      id: 'crushingBlow',
      name: 'Crushing Blow',
      damage: 38,
      windUpTicks: 5,
      telegraphText: 'The horror\'s body swells, pressure building...',
    },
  ],
};
