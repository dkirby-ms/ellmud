/**
 * Shadow Weaver — Spider-like creatures that spin webs of solidified darkness. They trap prey and 
 * drain them slowly.
 *
 * Skulker archetype.
 *
 * Stats (Tier 2):
 *   HP: 75, Attack: 26, Defence: 10, Armour: 11, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const SHADOW_WEAVER: CreatureTemplate = {
  type: 'shadow_weaver',
  name: 'Shadow Weaver',
  stats: {
    maxHp: 75,
    attack: 26,
    defence: 10,
    armour: 11,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'shadow_silk',
      name: 'Shadow Silk',
      weight: 0.5,
      description: 'Woven darkness.',
      dropWeight: 65,
    },
    {
      itemId: 'weaver_fang',
      name: 'Weaver Fang',
      weight: 1.0,
      description: 'Injects void venom.',
      dropWeight: 25,
    },
    {
      itemId: 'darkness_web',
      name: 'Darkness Web',
      weight: 0.3,
      description: 'Tangible shadow.',
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
  fleeThreshold: 0.35,
  aggressive: true,
  roomDescription: 'Shadow weavers hang from webs of darkness.',
  abilities: [
    {
      id: 'webStrike',
      name: 'Web Strike',
      damage: 32,
      windUpTicks: 3,
      telegraphText: 'Shadow threads shoot toward you...',
    },
  ],
};
