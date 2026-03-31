/**
 * Gutterspawn — The Warrens signature swarm creature.
 *
 * Bloated, rat-like things the size of a large dog with too many legs
 * and mouths full of needle teeth. Individually pathetic. In numbers, lethal.
 *
 * Skulker archetype: hit-and-flee in combat, high agility, low HP.
 *
 * Stats (Tier 1):
 *   HP: 15, Attack: 5, Defence: 1, Armour: 0, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const GUTTERSPAWN: CreatureTemplate = {
  type: 'gutterspawn',
  name: 'Gutterspawn',
  stats: {
    maxHp: 15,
    attack: 5,
    defence: 1,
    armour: 0,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'gutterspawn_fang',
      name: 'Gutterspawn Fang',
      weight: 0.2,
      description: 'A yellowed, hollow fang, still wet with venom.',
      dropWeight: 80,
    },
    {
      itemId: 'bent_rebar',
      name: 'Bent Rebar',
      weight: 3,
      description: 'A corroded length of rebar. Barely a weapon.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 2,
    maxCount: 4,
    preferredRoomTypes: ['corridor', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'extraction', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.3,
  aggressive: true,
};
