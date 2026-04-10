/**
 * Rad Wyrm — Mutated serpents that burrow through irradiated soil. They strike from undergrou
 * nd and drag prey below.
 *
 * Skulker archetype.
 *
 * Stats (Tier 2):
 *   HP: 70, Attack: 25, Defence: 9, Armour: 10, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const RAD_WYRM: CreatureTemplate = {
  type: 'rad_wyrm',
  name: 'Rad Wyrm',
  stats: {
    maxHp: 70,
    attack: 25,
    defence: 9,
    armour: 10,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'wyrm_scale',
      name: 'Wyrm Scale',
      weight: 1.0,
      description: 'Iridescent and toxic.',
      dropWeight: 65,
    },
    {
      itemId: 'venom_gland',
      name: 'Venom Gland',
      weight: 0.5,
      description: 'Radioactive poison.',
      dropWeight: 25,
    },
    {
      itemId: 'burrowing_claw',
      name: 'Burrowing Claw',
      weight: 1.5,
      description: 'Sharp and sturdy.',
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
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'Sand shifts where a rad wyrm lurks beneath.',
  abilities: [
    {
      id: 'undergroundStrike',
      name: 'Underground Strike',
      damage: 34,
      windUpTicks: 3,
      telegraphText: 'The ground trembles, something approaching from below...',
    },
  ],
};
