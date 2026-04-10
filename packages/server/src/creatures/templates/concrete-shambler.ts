/**
 * Concrete Shambler — Humanoid figures encrusted with concrete and rebar. Each step cracks the floor b
 * eneath them. They were buried in the collapse and they remember.
 *
 * Guardian archetype.
 *
 * Stats (Tier 2):
 *   HP: 90, Attack: 22, Defence: 9, Armour: 12, Agility: 1
 */

import type { CreatureTemplate } from '../types.js';

export const CONCRETE_SHAMBLER: CreatureTemplate = {
  type: 'concrete_shambler',
  name: 'Concrete Shambler',
  stats: {
    maxHp: 90,
    attack: 22,
    defence: 9,
    armour: 12,
    agility: 1,
  },
  lootTable: [
    {
      itemId: 'concrete_fragment',
      name: 'Concrete Fragment',
      weight: 3.0,
      description: 'Hardened debris, unnaturally dense.',
      dropWeight: 60,
    },
    {
      itemId: 'rebar_club',
      name: 'Rebar Club',
      weight: 5.0,
      description: 'Twisted steel, heavy enough to crush.',
      dropWeight: 30,
    },
    {
      itemId: 'burial_shroud',
      name: 'Burial Shroud',
      weight: 2.0,
      description: 'Canvas and dust, smells of collapse.',
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
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'A concrete shambler drags itself forward, leaving cracks in its wake.',
  abilities: [
    {
      id: 'groundSlam',
      name: 'Ground Slam',
      damage: 35,
      windUpTicks: 6,
      telegraphText: 'The shambler raises its fists, concrete cracking as it winds up...',
    },
  ],
};
