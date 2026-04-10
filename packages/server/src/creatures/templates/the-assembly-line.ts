/**
 * The Assembly Line — The factory itself achieved consciousness. A vast mechanical organism that build
 * s and rebuilds itself endlessly, incorporating victims into its structure.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 420, Attack: 72, Defence: 26, Armour: 38, Agility: 1
 */

import type { CreatureTemplate } from '../types.js';

export const THE_ASSEMBLY_LINE: CreatureTemplate = {
  type: 'the_assembly_line',
  name: 'The Assembly Line',
  stats: {
    maxHp: 420,
    attack: 72,
    defence: 26,
    armour: 38,
    agility: 1,
  },
  lootTable: [
    {
      itemId: 'factory_heart',
      name: 'Factory Heart',
      weight: 5.0,
      description: 'The line\'s central processor.',
      dropWeight: 20,
    },
    {
      itemId: 'masterwork_assembly_suit',
      name: 'Masterwork Assembly Suit',
      weight: 15.0,
      description: 'Self-repairing powered armor.',
      dropWeight: 18,
    },
    {
      itemId: 'anomalous_manufacturing_core',
      name: 'Anomalous Manufacturing Core',
      weight: 1.0,
      description: 'Can build anything from raw materials.',
      dropWeight: 12,
    },
    {
      itemId: 'production_override',
      name: 'Production Override',
      weight: 0.5,
      description: 'Commands all machines.',
      dropWeight: 15,
    },
    {
      itemId: 'eternal_engine',
      name: 'Eternal Engine',
      weight: 3.0,
      description: 'Never stops running.',
      dropWeight: 15,
    },
    {
      itemId: 'blueprint_archive',
      name: 'Blueprint Archive',
      weight: 1.0,
      description: 'Contains lost technologies.',
      dropWeight: 10,
    },
    {
      itemId: 'masterwork_hydraulic_hammer',
      name: 'Masterwork Hydraulic Hammer',
      weight: 10.0,
      description: 'Industrial weapon of devastating power.',
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
  roomDescription: 'The Assembly Line fills the vast chamber, a mechanical god in its temple.',
  abilities: [
    {
      id: 'industrialCrush',
      name: 'Industrial Crush',
      damage: 85,
      windUpTicks: 9,
      telegraphText: 'Massive presses descend from above...',
    },
  ],
};
