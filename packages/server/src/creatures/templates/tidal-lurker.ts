/**
 * Tidal Lurker — Amphibious predators that move with the water flow. They strike from flooded alc
 * oves and drag prey into the depths.
 *
 * Skulker archetype.
 *
 * Stats (Tier 2):
 *   HP: 85, Attack: 27, Defence: 9, Armour: 7, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const TIDAL_LURKER: CreatureTemplate = {
  type: 'tidal_lurker',
  name: 'Tidal Lurker',
  stats: {
    maxHp: 85,
    attack: 27,
    defence: 9,
    armour: 7,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'lurker_fin',
      name: 'Lurker Fin',
      weight: 2.0,
      description: 'Webbed and muscular.',
      dropWeight: 60,
    },
    {
      itemId: 'tidal_scale',
      name: 'Tidal Scale',
      weight: 0.5,
      description: 'Shimmers with reflected water.',
      dropWeight: 30,
    },
    {
      itemId: 'drowning_claw',
      name: 'Drowning Claw',
      weight: 2.5,
      description: 'Hooks for dragging prey.',
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
  roomDescription: 'A tidal lurker moves through the water, nearly invisible.',
  abilities: [
    {
      id: 'tidalDrag',
      name: 'Tidal Drag',
      damage: 32,
      windUpTicks: 3,
      telegraphText: 'The lurker surges forward, water rushing with it...',
    },
  ],
};
