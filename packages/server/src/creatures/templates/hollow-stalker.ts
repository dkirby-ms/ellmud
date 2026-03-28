/**
 * Hollow Stalker — The Warrens ambush predator.
 *
 * Tall, emaciated figures that move in absolute silence until the moment
 * they strike. Their skin is grey and taut, their features erased as if
 * sanded smooth. They cling to walls and ceilings, dropping on prey from above.
 *
 * Skulker archetype: ambush, hit-and-disengage.
 *
 * Stats (Tier 1–2):
 *   HP: 60, Attack: 13, Defence: 5, Armour: 4, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const HOLLOW_STALKER: CreatureTemplate = {
  type: 'hollow_stalker',
  name: 'Hollow Stalker',
  stats: {
    maxHp: 60,
    attack: 13,
    defence: 5,
    armour: 4,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'tarnished_medallion',
      name: 'Tarnished Medallion',
      weight: 0.5,
      description: 'They collect these — no one knows why.',
      dropWeight: 40,
    },
    {
      itemId: 'sanctuary_key',
      name: 'Sanctuary Key',
      weight: 0.3,
      description: 'A heavy iron key, corroded but intact. Its teeth are shaped like no modern lock.',
      dropWeight: 15,
    },
    {
      itemId: 'scavenger_shiv',
      name: "Scavenger's Shiv",
      weight: 2,
      description: "Taken from a scavenger that won't be needing it.",
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['junction'],
    forbiddenRoomTypes: ['entry', 'extraction', 'corridor'],
  },
  idleTicksMin: 5,
  idleTicksMax: 12,
  fleeThreshold: 0.15,
};
