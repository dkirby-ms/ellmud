/**
 * Sentry Bot — Security robots still following corrupted protocols. They patrol endlessly, atta
 * cking anything without proper clearance.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 100, Attack: 23, Defence: 11, Armour: 15, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const SENTRY_BOT: CreatureTemplate = {
  type: 'sentry_bot',
  name: 'Sentry Bot',
  stats: {
    maxHp: 100,
    attack: 23,
    defence: 11,
    armour: 15,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'sentry_plating',
      name: 'Sentry Plating',
      weight: 5.0,
      description: 'Reinforced armor.',
      dropWeight: 55,
    },
    {
      itemId: 'targeting_module',
      name: 'Targeting Module',
      weight: 1.0,
      description: 'Advanced optics.',
      dropWeight: 30,
    },
    {
      itemId: 'power_core',
      name: 'Power Core',
      weight: 2.0,
      description: 'Still functional.',
      dropWeight: 15,
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
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'A sentry bot stands at attention, optical sensors scanning.',
  abilities: [
    {
      id: 'suppressingFire',
      name: 'Suppressing Fire',
      damage: 35,
      windUpTicks: 5,
      telegraphText: 'The sentry\'s weapons spin up, targeting lasers sweeping...',
    },
  ],
};
