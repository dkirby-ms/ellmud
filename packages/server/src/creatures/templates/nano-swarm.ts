/**
 * Nano Swarm — Clouds of self-replicating nanobots. They disassemble matter at the molecular le
 * vel and build more of themselves.
 *
 * Swarm archetype.
 *
 * Stats (Tier 3):
 *   HP: 140, Attack: 46, Defence: 22, Armour: 8, Agility: 10
 */

import type { CreatureTemplate } from '../types.js';

export const NANO_SWARM: CreatureTemplate = {
  type: 'nano_swarm',
  name: 'Nano Swarm',
  stats: {
    maxHp: 140,
    attack: 46,
    defence: 22,
    armour: 8,
    agility: 10,
  },
  lootTable: [
    {
      itemId: 'nano_sample',
      name: 'Nano Sample',
      weight: 0.1,
      description: 'Dormant nanobots.',
      dropWeight: 60,
    },
    {
      itemId: 'molecular_disassembler',
      name: 'Molecular Disassembler',
      weight: 0.5,
      description: 'Breaks down anything.',
      dropWeight: 30,
    },
    {
      itemId: 'replication_matrix',
      name: 'Replication Matrix',
      weight: 0.3,
      description: 'Self-building template.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 2,
    preferredRoomTypes: ['chamber', 'junction'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'A nano swarm hovers like metallic fog, reflecting light.',
  abilities: [
    {
      id: 'disassemblyWave',
      name: 'Disassembly Wave',
      damage: 58,
      windUpTicks: 5,
      telegraphText: 'The nano swarm pulses, reforming into cutting patterns...',
    },
  ],
};
