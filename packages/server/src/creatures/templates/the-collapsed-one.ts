/**
 * The Collapsed One — The Warrens boss creature.
 *
 * It was a building once — or something trapped when the building fell.
 * Rebar juts from its hunched back. Its skin is powdered concrete and its
 * fists are foundation stones. It does not speak. It does not flee. It does not stop.
 *
 * Guardian archetype: slow, devastating, holds ground.
 *
 * Stats (Tier 2):
 *   HP: 150, Attack: 18, Defence: 8, Armour: 10, Agility: 1
 */

import type { CreatureTemplate } from '../types.js';

export const THE_COLLAPSED_ONE: CreatureTemplate = {
  type: 'the_collapsed_one',
  name: 'The Collapsed One',
  stats: {
    maxHp: 150,
    attack: 18,
    defence: 8,
    armour: 10,
    agility: 1,
  },
  lootTable: [
    {
      itemId: 'rubble_crusted_vest',
      name: 'Rubble-Crusted Vest',
      weight: 5,
      description: 'Masonry fragments fused to leather. Heavy, but it stops a blade.',
      dropWeight: 30,
    },
    {
      itemId: 'scavenger_shiv',
      name: "Scavenger's Shiv",
      weight: 2,
      description: "Lodged in its chest. Previous challenger's contribution.",
      dropWeight: 25,
    },
    {
      itemId: 'charred_street_map',
      name: 'Charred Street Map',
      weight: 0.5,
      description: 'Scorched but legible. Shows routes through the Warrens.',
      dropWeight: 20,
    },
    {
      itemId: 'tarnished_medallion',
      name: 'Tarnished Medallion',
      weight: 0.5,
      description: 'Embedded in its concrete hide. Pried loose.',
      dropWeight: 25,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['boss'],
    forbiddenRoomTypes: ['entry', 'extraction', 'corridor', 'junction', 'dead_end'],
  },
  idleTicksMin: 80,
  idleTicksMax: 150,
  fleeThreshold: 0,
  aggressive: true,
};
