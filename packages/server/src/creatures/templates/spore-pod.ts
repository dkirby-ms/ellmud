/**
 * Spore Pod — Bulbous fungal growths that burst when approached. They release clouds of spores
 *  that cause hallucinations and respiratory distress.
 *
 * Swarm (Ranged) archetype.
 *
 * Stats (Tier 1):
 *   HP: 15, Attack: 7, Defence: 1, Armour: 0, Agility: 0
 */

import type { CreatureTemplate } from '../types.js';

export const SPORE_POD: CreatureTemplate = {
  type: 'spore_pod',
  name: 'Spore Pod',
  stats: {
    maxHp: 15,
    attack: 7,
    defence: 1,
    armour: 0,
    agility: 0,
  },
  lootTable: [
    {
      itemId: 'spore_sample',
      name: 'Spore Sample',
      weight: 0.2,
      description: 'Hallucinogenic powder.',
      dropWeight: 90,
    },
    {
      itemId: 'pod_membrane',
      name: 'Pod Membrane',
      weight: 0.5,
      description: 'Thin and elastic.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 2,
    maxCount: 4,
    preferredRoomTypes: ['chamber', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: false,
  roomDescription: 'Spore pods cluster in corners, membrane pulsing.',
};
