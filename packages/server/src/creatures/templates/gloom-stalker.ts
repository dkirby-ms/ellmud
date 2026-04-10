/**
 * Gloom Stalker — Humanoid shadows that hunt in total darkness. They strike from blind spots and v
 * anish before retaliation.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 26, Attack: 9, Defence: 4, Armour: 2, Agility: 11
 */

import type { CreatureTemplate } from '../types.js';

export const GLOOM_STALKER: CreatureTemplate = {
  type: 'gloom_stalker',
  name: 'Gloom Stalker',
  stats: {
    maxHp: 26,
    attack: 9,
    defence: 4,
    armour: 2,
    agility: 11,
  },
  lootTable: [
    {
      itemId: 'shadow_cloth',
      name: 'Shadow Cloth',
      weight: 1.0,
      description: 'Fabric woven from darkness.',
      dropWeight: 70,
    },
    {
      itemId: 'gloom_essence',
      name: 'Gloom Essence',
      weight: 0.3,
      description: 'Liquid shadow.',
      dropWeight: 25,
    },
    {
      itemId: 'void_shard',
      name: 'Void Shard',
      weight: 0.5,
      description: 'Fragment of nothing.',
      dropWeight: 5,
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
  fleeThreshold: 0.4,
  aggressive: true,
  roomDescription: 'Gloom stalkers blend with shadows, barely visible.',
};
