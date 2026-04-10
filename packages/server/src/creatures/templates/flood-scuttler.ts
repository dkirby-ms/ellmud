/**
 * Flood Scuttler — Crab-like creatures with rusted metal shells scavenged from sunken infrastructur
 * e. They skitter across walls and ceilings.
 *
 * Skulker archetype.
 *
 * Stats (Tier 1):
 *   HP: 28, Attack: 9, Defence: 4, Armour: 6, Agility: 8
 */

import type { CreatureTemplate } from '../types.js';

export const FLOOD_SCUTTLER: CreatureTemplate = {
  type: 'flood_scuttler',
  name: 'Flood Scuttler',
  stats: {
    maxHp: 28,
    attack: 9,
    defence: 4,
    armour: 6,
    agility: 8,
  },
  lootTable: [
    {
      itemId: 'scuttler_carapace',
      name: 'Scuttler Carapace',
      weight: 2.0,
      description: 'Rusted but resilient.',
      dropWeight: 60,
    },
    {
      itemId: 'metal_claw',
      name: 'Metal Claw',
      weight: 1.5,
      description: 'Sharp and serrated.',
      dropWeight: 30,
    },
    {
      itemId: 'corroded_chain',
      name: 'Corroded Chain',
      weight: 3.0,
      description: 'Tangled around its shell.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 2,
    maxCount: 4,
    preferredRoomTypes: ['corridor', 'chamber'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.35,
  aggressive: true,
  roomDescription: 'Flood scuttlers cling to the walls, their metal shells clicking.',
};
