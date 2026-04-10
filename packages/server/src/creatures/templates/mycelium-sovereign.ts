/**
 * Mycelium Sovereign — The consciousness of an entire fungal network given form. It commands all lesser
 *  fungal creatures and spreads its domain constantly.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 160, Attack: 44, Defence: 21, Armour: 16, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const MYCELIUM_SOVEREIGN: CreatureTemplate = {
  type: 'mycelium_sovereign',
  name: 'Mycelium Sovereign',
  stats: {
    maxHp: 160,
    attack: 44,
    defence: 21,
    armour: 16,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'sovereign_spore',
      name: 'Sovereign Spore',
      weight: 1.0,
      description: 'Commands lesser fungi.',
      dropWeight: 45,
    },
    {
      itemId: 'network_core',
      name: 'Network Core',
      weight: 2.0,
      description: 'Pulsing mycelium nexus.',
      dropWeight: 35,
    },
    {
      itemId: 'fungal_crown',
      name: 'Fungal Crown',
      weight: 1.5,
      description: 'Symbol of dominion.',
      dropWeight: 20,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['chamber', 'boss'],
    forbiddenRoomTypes: ['corridor'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.15,
  aggressive: true,
  roomDescription: 'The mycelium sovereign pulses with bioluminescence, connected to everything.',
  abilities: [
    {
      id: 'networkPulse',
      name: 'Network Pulse',
      damage: 58,
      windUpTicks: 5,
      telegraphText: 'The sovereign\'s body glows, mycelium spreading...',
    },
  ],
};
