/**
 * Rust Beetle — Metallic insects that feed on corroded metal. They swarm in clouds and strip equ
 * ipment to rust in seconds.
 *
 * Swarm archetype.
 *
 * Stats (Tier 1):
 *   HP: 12, Attack: 5, Defence: 3, Armour: 4, Agility: 9
 */

import type { CreatureTemplate } from '../types.js';

export const RUST_BEETLE: CreatureTemplate = {
  type: 'rust_beetle',
  name: 'Rust Beetle',
  stats: {
    maxHp: 12,
    attack: 5,
    defence: 3,
    armour: 4,
    agility: 9,
  },
  lootTable: [
    {
      itemId: 'beetle_carapace',
      name: 'Beetle Carapace',
      weight: 0.2,
      description: 'Metallic shell, oxidized.',
      dropWeight: 90,
    },
    {
      itemId: 'rust_dust',
      name: 'Rust Dust',
      weight: 0.1,
      description: 'Fine powder, smells of iron.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 4,
    maxCount: 8,
    preferredRoomTypes: ['chamber', 'corridor', 'junction'],
    forbiddenRoomTypes: ['boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.5,
  aggressive: true,
  roomDescription: 'Rust beetles click and swarm, their metallic wings buzzing.',
};
