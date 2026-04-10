/**
 * The Green Mother — The heart of the overgrown zone. A massive flowering entity that births all plan
 * t life here. She dreams of a world covered in green.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 380, Attack: 65, Defence: 24, Armour: 28, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const THE_GREEN_MOTHER: CreatureTemplate = {
  type: 'the_green_mother',
  name: 'The Green Mother',
  stats: {
    maxHp: 380,
    attack: 65,
    defence: 24,
    armour: 28,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'mothers_seed',
      name: 'Mother\'s Seed',
      weight: 1.0,
      description: 'Can grow anything.',
      dropWeight: 20,
    },
    {
      itemId: 'primordial_bloom',
      name: 'Primordial Bloom',
      weight: 2.0,
      description: 'The first flower.',
      dropWeight: 20,
    },
    {
      itemId: 'masterwork_thornmail',
      name: 'Masterwork Thornmail',
      weight: 10.0,
      description: 'Living armor that regenerates.',
      dropWeight: 20,
    },
    {
      itemId: 'anomalous_growth_shard',
      name: 'Anomalous Growth Shard',
      weight: 0.5,
      description: 'Accelerates all life.',
      dropWeight: 15,
    },
    {
      itemId: 'verdant_crown',
      name: 'Verdant Crown',
      weight: 1.5,
      description: 'Commands all plant life.',
      dropWeight: 15,
    },
    {
      itemId: 'genesis_pollen',
      name: 'Genesis Pollen',
      weight: 0.3,
      description: 'Can resurrect the dead as plants.',
      dropWeight: 10,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 1,
    preferredRoomTypes: ['boss'],
    forbiddenRoomTypes: [],
  },
  idleTicksMin: 30,
  idleTicksMax: 60,
  fleeThreshold: 0.0,
  aggressive: true,
  roomDescription: 'The Green Mother blooms in eternal spring, her presence overwhelming.',
  abilities: [
    {
      id: 'overgrowth',
      name: 'Overgrowth',
      damage: 75,
      windUpTicks: 8,
      telegraphText: 'Vines burst from every surface, growing impossibly fast...',
    },
    {
      id: 'bloomPulse',
      name: 'Bloom Pulse',
      damage: 60,
      windUpTicks: 6,
      telegraphText: 'The Mother\'s petals open, releasing waves of energy...',
    },
  ],
};
