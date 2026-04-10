/**
 * Toxic Wraith — A semi-corporeal entity formed from concentrated chemical fumes. It phases throu
 * gh solid matter and leaves toxic trails.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 130, Attack: 46, Defence: 19, Armour: 10, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const TOXIC_WRAITH: CreatureTemplate = {
  type: 'toxic_wraith',
  name: 'Toxic Wraith',
  stats: {
    maxHp: 130,
    attack: 46,
    defence: 19,
    armour: 10,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'wraith_essence',
      name: 'Wraith Essence',
      weight: 0.5,
      description: 'Gaseous and malevolent.',
      dropWeight: 60,
    },
    {
      itemId: 'toxic_condensate',
      name: 'Toxic Condensate',
      weight: 1.0,
      description: 'Liquid poison.',
      dropWeight: 30,
    },
    {
      itemId: 'phasing_residue',
      name: 'Phasing Residue',
      weight: 0.3,
      description: 'Allows brief intangibility.',
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
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'A toxic wraith drifts through the air, leaving green trails.',
  abilities: [
    {
      id: 'toxicMiasma',
      name: 'Toxic Miasma',
      damage: 58,
      windUpTicks: 5,
      telegraphText: 'The wraith expands, fumes coalescing...',
    },
  ],
};
