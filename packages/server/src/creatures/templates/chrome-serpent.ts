/**
 * Chrome Serpent — Snake-like creatures with metallic scales that reflect chemical rainbows. Their 
 * bite delivers neurotoxins.
 *
 * Skulker archetype.
 *
 * Stats (Tier 2):
 *   HP: 80, Attack: 23, Defence: 10, Armour: 12, Agility: 11
 */

import type { CreatureTemplate } from '../types.js';

export const CHROME_SERPENT: CreatureTemplate = {
  type: 'chrome_serpent',
  name: 'Chrome Serpent',
  stats: {
    maxHp: 80,
    attack: 23,
    defence: 10,
    armour: 12,
    agility: 11,
  },
  lootTable: [
    {
      itemId: 'chrome_scale',
      name: 'Chrome Scale',
      weight: 0.5,
      description: 'Reflective and sharp.',
      dropWeight: 65,
    },
    {
      itemId: 'venom_sac',
      name: 'Venom Sac',
      weight: 0.3,
      description: 'Contains paralyzing toxin.',
      dropWeight: 25,
    },
    {
      itemId: 'serpent_fang',
      name: 'Serpent Fang',
      weight: 1.0,
      description: 'Hollow and dripping.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'A chrome serpent slithers through chemical pools, scales gleaming.',
  abilities: [
    {
      id: 'neurotoxicStrike',
      name: 'Neurotoxic Strike',
      damage: 30,
      windUpTicks: 3,
      telegraphText: 'The serpent coils, venom glistening on its fangs...',
    },
  ],
};
