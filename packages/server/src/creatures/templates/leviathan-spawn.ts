/**
 * Leviathan Spawn — Massive serpentine creatures that dwarf humans. They are pieces of something lar
 * ger, still searching for the rest of themselves.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 180, Attack: 48, Defence: 16, Armour: 22, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const LEVIATHAN_SPAWN: CreatureTemplate = {
  type: 'leviathan_spawn',
  name: 'Leviathan Spawn',
  stats: {
    maxHp: 180,
    attack: 48,
    defence: 16,
    armour: 22,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'leviathan_scale',
      name: 'Leviathan Scale',
      weight: 5.0,
      description: 'Armored plate, nearly indestructible.',
      dropWeight: 50,
    },
    {
      itemId: 'spawn_heart',
      name: 'Spawn Heart',
      weight: 2.0,
      description: 'Still beating with deep-sea rhythms.',
      dropWeight: 30,
    },
    {
      itemId: 'primordial_tooth',
      name: 'Primordial Tooth',
      weight: 3.0,
      description: 'A fang as long as a forearm.',
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'boss'],
    forbiddenRoomTypes: ['corridor', 'dead_end'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'A leviathan spawn fills the chamber, its bulk displacing water.',
  abilities: [
    {
      id: 'coilingStrike',
      name: 'Coiling Strike',
      damage: 65,
      windUpTicks: 6,
      telegraphText: 'The spawn coils around itself, muscles tensing...',
    },
    {
      id: 'tidalSurge',
      name: 'Tidal Surge',
      damage: 55,
      windUpTicks: 5,
      telegraphText: 'Water begins rushing toward the spawn\'s maw...',
    },
  ],
};
