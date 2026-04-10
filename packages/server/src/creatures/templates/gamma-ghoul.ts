/**
 * Gamma Ghoul — Heavily irradiated corpses still ambulatory. They emit dangerous radiation and a
 * ttack with mindless fury.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 85, Attack: 24, Defence: 7, Armour: 8, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const GAMMA_GHOUL: CreatureTemplate = {
  type: 'gamma_ghoul',
  name: 'Gamma Ghoul',
  stats: {
    maxHp: 85,
    attack: 24,
    defence: 7,
    armour: 8,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'ghoul_flesh',
      name: 'Ghoul Flesh',
      weight: 1.0,
      description: 'Radioactive tissue.',
      dropWeight: 60,
    },
    {
      itemId: 'gamma_organ',
      name: 'Gamma Organ',
      weight: 0.5,
      description: 'Emits strong radiation.',
      dropWeight: 30,
    },
    {
      itemId: 'pre_war_artifact',
      name: 'Pre-War Artifact',
      weight: 0.8,
      description: 'Carried since before the fall.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'corridor'],
    forbiddenRoomTypes: ['entry'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.1,
  aggressive: true,
  roomDescription: 'A gamma ghoul shambles forward, leaving glowing footprints.',
  abilities: [
    {
      id: 'radiationBurst',
      name: 'Radiation Burst',
      damage: 32,
      windUpTicks: 4,
      telegraphText: 'The ghoul\'s body glows brighter, radiation intensifying...',
    },
  ],
};
