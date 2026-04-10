/**
 * Root Horror — Humanoid figures entangled in tree roots. The roots move them like puppets, sham
 * bling through the ruins.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 30, Attack: 8, Defence: 3, Armour: 4, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const ROOT_HORROR: CreatureTemplate = {
  type: 'root_horror',
  name: 'Root Horror',
  stats: {
    maxHp: 30,
    attack: 8,
    defence: 3,
    armour: 4,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'root_tendril',
      name: 'Root Tendril',
      weight: 1.0,
      description: 'Still writhing.',
      dropWeight: 70,
    },
    {
      itemId: 'wooden_heart',
      name: 'Wooden Heart',
      weight: 0.5,
      description: 'Fossilized organ.',
      dropWeight: 20,
    },
    {
      itemId: 'bark_armor',
      name: 'Bark Armor',
      weight: 3.0,
      description: 'Natural plating.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'A root horror shambles forward, dragged by living roots.',
};
