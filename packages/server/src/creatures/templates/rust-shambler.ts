/**
 * Rust Shambler — Workers who died in industrial accidents, now animated by residual machinery in 
 * their bodies. They swing heavy tools with mindless fury.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 38, Attack: 10, Defence: 3, Armour: 5, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const RUST_SHAMBLER: CreatureTemplate = {
  type: 'rust_shambler',
  name: 'Rust Shambler',
  stats: {
    maxHp: 38,
    attack: 10,
    defence: 3,
    armour: 5,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'workers_tool',
      name: 'Worker\'s Tool',
      weight: 4.0,
      description: 'Heavy wrench or hammer.',
      dropWeight: 60,
    },
    {
      itemId: 'rusted_plate',
      name: 'Rusted Plate',
      weight: 3.0,
      description: 'Industrial armor remnants.',
      dropWeight: 30,
    },
    {
      itemId: 'id_badge',
      name: 'ID Badge',
      weight: 0.1,
      description: 'Name long faded.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.1,
  aggressive: true,
  roomDescription: 'A rust shambler lurches forward, tools clanking.',
};
