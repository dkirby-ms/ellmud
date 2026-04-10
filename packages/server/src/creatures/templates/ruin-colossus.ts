/**
 * Ruin Colossus — A walking building. Dozens of floors compressed into a vaguely humanoid shape. E
 * ach punch brings down a rain of masonry.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 200, Attack: 45, Defence: 18, Armour: 25, Agility: 1
 */

import type { CreatureTemplate } from '../types.js';

export const RUIN_COLOSSUS: CreatureTemplate = {
  type: 'ruin_colossus',
  name: 'Ruin Colossus',
  stats: {
    maxHp: 200,
    attack: 45,
    defence: 18,
    armour: 25,
    agility: 1,
  },
  lootTable: [
    {
      itemId: 'structural_beam',
      name: 'Structural Beam',
      weight: 15.0,
      description: 'Load-bearing steel, impossibly intact.',
      dropWeight: 40,
    },
    {
      itemId: 'colossus_heart',
      name: 'Colossus Heart',
      weight: 2.0,
      description: 'A nexus of twisted rebar and concrete, still warm.',
      dropWeight: 30,
    },
    {
      itemId: 'foundation_stone',
      name: 'Foundation Stone',
      weight: 8.0,
      description: 'A cornerstone, inscribed with old dates.',
      dropWeight: 30,
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
  roomDescription: 'A ruin colossus stands here, a monument to destruction given terrible life.',
  abilities: [
    {
      id: 'masonryRain',
      name: 'Masonry Rain',
      damage: 60,
      windUpTicks: 7,
      telegraphText: 'The colossus raises its arms, buildings fragments cascading from its form...',
    },
    {
      id: 'compressionWave',
      name: 'Compression Wave',
      damage: 50,
      windUpTicks: 5,
      telegraphText: 'The colossus\'s torso compresses inward, preparing to unleash...',
    },
  ],
};
