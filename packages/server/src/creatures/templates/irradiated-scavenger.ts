/**
 * Irradiated Scavenger — Humans driven mad by radiation exposure. Their skin glows faintly and their aggr
 * ession is relentless.
 *
 * Berserker archetype.
 *
 * Stats (Tier 1):
 *   HP: 30, Attack: 9, Defence: 2, Armour: 1, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const IRRADIATED_SCAVENGER: CreatureTemplate = {
  type: 'irradiated_scavenger',
  name: 'Irradiated Scavenger',
  stats: {
    maxHp: 30,
    attack: 9,
    defence: 2,
    armour: 1,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'tattered_rad_suit',
      name: 'Tattered Rad Suit',
      weight: 2.0,
      description: 'Full of holes.',
      dropWeight: 60,
    },
    {
      itemId: 'makeshift_weapon',
      name: 'Makeshift Weapon',
      weight: 2.5,
      description: 'Pipe or rebar.',
      dropWeight: 30,
    },
    {
      itemId: 'rad_pills',
      name: 'Rad Pills',
      weight: 0.2,
      description: 'Expired medication.',
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
  fleeThreshold: 0.15,
  aggressive: true,
  roomDescription: 'An irradiated scavenger prowls, skin glowing sickly green.',
};
