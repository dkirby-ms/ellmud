/**
 * Fallout Phantom — Ghosts of those who died in the initial blast. They exist as concentrated radiat
 * ion and radiate despair.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 145, Attack: 49, Defence: 21, Armour: 12, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const FALLOUT_PHANTOM: CreatureTemplate = {
  type: 'fallout_phantom',
  name: 'Fallout Phantom',
  stats: {
    maxHp: 145,
    attack: 49,
    defence: 21,
    armour: 12,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'phantom_essence',
      name: 'Phantom Essence',
      weight: 0.5,
      description: 'Radioactive spirit matter.',
      dropWeight: 60,
    },
    {
      itemId: 'final_memory',
      name: 'Final Memory',
      weight: 0.2,
      description: 'A flash of the blast.',
      dropWeight: 30,
    },
    {
      itemId: 'spectral_residue',
      name: 'Spectral Residue',
      weight: 0.3,
      description: 'Glows with lost lives.',
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
  roomDescription: 'A fallout phantom drifts, its form flickering between states.',
  abilities: [
    {
      id: 'despairWave',
      name: 'Despair Wave',
      damage: 62,
      windUpTicks: 5,
      telegraphText: 'The phantom expands, memories flooding outward...',
    },
  ],
};
