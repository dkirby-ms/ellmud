/**
 * Eclipse Wraith — Spirits of those who died in total darkness. They spread their fear and drain th
 * e will to fight.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 70, Attack: 21, Defence: 13, Armour: 7, Agility: 7
 */

import type { CreatureTemplate } from '../types.js';

export const ECLIPSE_WRAITH: CreatureTemplate = {
  type: 'eclipse_wraith',
  name: 'Eclipse Wraith',
  stats: {
    maxHp: 70,
    attack: 21,
    defence: 13,
    armour: 7,
    agility: 7,
  },
  lootTable: [
    {
      itemId: 'wraith_essence',
      name: 'Wraith Essence',
      weight: 0.5,
      description: 'Formless terror.',
      dropWeight: 65,
    },
    {
      itemId: 'eclipse_shard',
      name: 'Eclipse Shard',
      weight: 0.3,
      description: 'Fragment of eternal night.',
      dropWeight: 30,
    },
    {
      itemId: 'fear_crystal',
      name: 'Fear Crystal',
      weight: 0.2,
      description: 'Solidified dread.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'An eclipse wraith floats, its presence oppressive.',
  abilities: [
    {
      id: 'terrorWave',
      name: 'Terror Wave',
      damage: 28,
      windUpTicks: 4,
      telegraphText: 'The wraith expands, radiating fear...',
    },
  ],
};
