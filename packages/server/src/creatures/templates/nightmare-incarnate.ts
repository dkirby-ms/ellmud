/**
 * Nightmare Incarnate — Living nightmares pulled from collective unconsciousness. They manifest your fea
 * rs and make them real.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 155, Attack: 47, Defence: 22, Armour: 13, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const NIGHTMARE_INCARNATE: CreatureTemplate = {
  type: 'nightmare_incarnate',
  name: 'Nightmare Incarnate',
  stats: {
    maxHp: 155,
    attack: 47,
    defence: 22,
    armour: 13,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'nightmare_essence',
      name: 'Nightmare Essence',
      weight: 1.0,
      description: 'Concentrated terror.',
      dropWeight: 60,
    },
    {
      itemId: 'fear_shard',
      name: 'Fear Shard',
      weight: 0.5,
      description: 'Your worst moment.',
      dropWeight: 30,
    },
    {
      itemId: 'dream_residue',
      name: 'Dream Residue',
      weight: 0.3,
      description: 'Lingers in the mind.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.2,
  aggressive: true,
  roomDescription: 'A nightmare incarnate writhes, taking horrific shapes.',
  abilities: [
    {
      id: 'manifestTerror',
      name: 'Manifest Terror',
      damage: 60,
      windUpTicks: 5,
      telegraphText: 'The nightmare shifts, becoming your fear...',
    },
  ],
};
