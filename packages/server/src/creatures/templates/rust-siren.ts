/**
 * Rust Siren — Humanoid figures corroded beyond recognition, their voices echo through flooded 
 * halls with hypnotic resonance. They sing songs of drowning.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 70, Attack: 20, Defence: 12, Armour: 8, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const RUST_SIREN: CreatureTemplate = {
  type: 'rust_siren',
  name: 'Rust Siren',
  stats: {
    maxHp: 70,
    attack: 20,
    defence: 12,
    armour: 8,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'sirens_vocal_cord',
      name: 'Siren\'s Vocal Cord',
      weight: 0.3,
      description: 'Vibrates with eerie resonance.',
      dropWeight: 60,
    },
    {
      itemId: 'corroded_crown',
      name: 'Corroded Crown',
      weight: 1.5,
      description: 'Rusted metal, still beautiful.',
      dropWeight: 30,
    },
    {
      itemId: 'song_crystal',
      name: 'Song Crystal',
      weight: 0.5,
      description: 'Captures echoes of the siren\'s call.',
      dropWeight: 10,
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
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'A rust siren stands in the flood, its haunting song echoing.',
  abilities: [
    {
      id: 'drowningSong',
      name: 'Drowning Song',
      damage: 28,
      windUpTicks: 4,
      telegraphText: 'The siren\'s mouth opens, water beginning to swirl...',
    },
  ],
};
