/**
 * Sludge Crawler — Slug-like creatures the size of house cats, covered in toxic slime. They leave a
 * cidic trails and cluster around organic matter.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 20, Attack: 6, Defence: 2, Armour: 1, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const SLUDGE_CRAWLER: CreatureTemplate = {
  type: 'sludge_crawler',
  name: 'Sludge Crawler',
  stats: {
    maxHp: 20,
    attack: 6,
    defence: 2,
    armour: 1,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'toxic_slime',
      name: 'Toxic Slime',
      weight: 0.5,
      description: 'Caustic and foul-smelling.',
      dropWeight: 75,
    },
    {
      itemId: 'crawler_shell',
      name: 'Crawler Shell',
      weight: 1.0,
      description: 'Soft and pliable, resists acid.',
      dropWeight: 25,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 6,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.5,
  aggressive: false,
  roomDescription: 'Sludge crawlers inch across the wet floor, leaving glistening trails.',
};
