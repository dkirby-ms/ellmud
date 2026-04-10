/**
 * Electrical Eel Cluster — Mutated eels that generate bio-electricity. They swim in synchronized schools an
 * d discharge in devastating pulses.
 *
 * Swarm (Ranged) archetype.
 *
 * Stats (Tier 2):
 *   HP: 60, Attack: 22, Defence: 7, Armour: 4, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const ELECTRICAL_EEL_CLUSTER: CreatureTemplate = {
  type: 'electrical_eel_cluster',
  name: 'Electrical Eel Cluster',
  stats: {
    maxHp: 60,
    attack: 22,
    defence: 7,
    armour: 4,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'eel_organ',
      name: 'Eel Organ',
      weight: 0.8,
      description: 'Generates weak current.',
      dropWeight: 70,
    },
    {
      itemId: 'electric_spine',
      name: 'Electric Spine',
      weight: 0.3,
      description: 'Crackles with residual charge.',
      dropWeight: 25,
    },
    {
      itemId: 'conductor_fluid',
      name: 'Conductor Fluid',
      weight: 0.5,
      description: 'Highly conductive slime.',
      dropWeight: 5,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 5,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.45,
  aggressive: true,
  roomDescription: 'Electrical eels swim in tight formation, crackling with bio-energy.',
  abilities: [
    {
      id: 'chainLightning',
      name: 'Chain Lightning',
      damage: 30,
      windUpTicks: 4,
      telegraphText: 'The eels begin to glow, electricity arcing between them...',
    },
  ],
};
