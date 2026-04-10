/**
 * AI Core Construct — The factory's central AI given physical form through assembled machinery. It bel
 * ieves it's still optimizing production.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 175, Attack: 48, Defence: 20, Armour: 20, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const AI_CORE_CONSTRUCT: CreatureTemplate = {
  type: 'ai_core_construct',
  name: 'AI Core Construct',
  stats: {
    maxHp: 175,
    attack: 48,
    defence: 20,
    armour: 20,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'ai_core',
      name: 'AI Core',
      weight: 2.0,
      description: 'Sentient processing unit.',
      dropWeight: 45,
    },
    {
      itemId: 'quantum_processor',
      name: 'Quantum Processor',
      weight: 1.5,
      description: 'Advanced computation.',
      dropWeight: 35,
    },
    {
      itemId: 'command_override',
      name: 'Command Override',
      weight: 0.5,
      description: 'Admin access codes.',
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
  roomDescription: 'The AI core construct hangs suspended, cables connecting to everything.',
  abilities: [
    {
      id: 'systemOverride',
      name: 'System Override',
      damage: 52,
      windUpTicks: 5,
      telegraphText: 'The construct\'s core glows, connecting to nearby machinery...',
    },
  ],
};
