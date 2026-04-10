/**
 * Memory Echo — Translucent humanoid figures that flicker in and out of existence. Psychic impri
 * nts of those who died in the collapse. They attack with waves of despair.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 65, Attack: 24, Defence: 11, Armour: 3, Agility: 5
 */

import type { CreatureTemplate } from '../types.js';

export const MEMORY_ECHO: CreatureTemplate = {
  type: 'memory_echo',
  name: 'Memory Echo',
  stats: {
    maxHp: 65,
    attack: 24,
    defence: 11,
    armour: 3,
    agility: 5,
  },
  lootTable: [
    {
      itemId: 'echo_residue',
      name: 'Echo Residue',
      weight: 0.2,
      description: 'Crystallized memory, cold to touch.',
      dropWeight: 70,
    },
    {
      itemId: 'fragmentary_image',
      name: 'Fragmentary Image',
      weight: 0.1,
      description: 'A flash of someone\'s last moment.',
      dropWeight: 20,
    },
    {
      itemId: 'despair_shard',
      name: 'Despair Shard',
      weight: 0.3,
      description: 'Solidified anguish, it hums with pain.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['chamber', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.25,
  aggressive: true,
  roomDescription: 'Memory echoes drift through the space, their faces filled with frozen terror.',
  abilities: [
    {
      id: 'waveOfDespair',
      name: 'Wave of Despair',
      damage: 30,
      windUpTicks: 4,
      telegraphText: 'The echo\'s form brightens, memories flooding outward...',
    },
  ],
};
