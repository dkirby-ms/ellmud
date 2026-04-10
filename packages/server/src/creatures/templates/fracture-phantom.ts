/**
 * Fracture Phantom — A figure made of broken glass and twisted light. It phases through walls and str
 * ikes from impossible angles.
 *
 * Skulker archetype.
 *
 * Stats (Tier 3):
 *   HP: 140, Attack: 50, Defence: 22, Armour: 8, Agility: 12
 */

import type { CreatureTemplate } from '../types.js';

export const FRACTURE_PHANTOM: CreatureTemplate = {
  type: 'fracture_phantom',
  name: 'Fracture Phantom',
  stats: {
    maxHp: 140,
    attack: 50,
    defence: 22,
    armour: 8,
    agility: 12,
  },
  lootTable: [
    {
      itemId: 'fracture_shard',
      name: 'Fracture Shard',
      weight: 0.5,
      description: 'A piece of broken reality.',
      dropWeight: 60,
    },
    {
      itemId: 'phantom_glass',
      name: 'Phantom Glass',
      weight: 0.8,
      description: 'Transparent and cold, cuts through anything.',
      dropWeight: 30,
    },
    {
      itemId: 'distortion_core',
      name: 'Distortion Core',
      weight: 1.0,
      description: 'Space bends around it.',
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
  fleeThreshold: 0.3,
  aggressive: true,
  roomDescription: 'A fracture phantom shifts through broken space, leaving glass trails in the air.',
  abilities: [
    {
      id: 'phaseStrike',
      name: 'Phase Strike',
      damage: 65,
      windUpTicks: 4,
      telegraphText: 'The phantom flickers, its form splitting across multiple positions...',
    },
  ],
};
