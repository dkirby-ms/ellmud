/**
 * The Sovereign of Dust — A towering figure wreathed in swirling debris. It commands the ruins themselves,
 *  calling down avalanches of rubble and commanding lesser creatures.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 350, Attack: 55, Defence: 20, Armour: 18, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const THE_SOVEREIGN_OF_DUST: CreatureTemplate = {
  type: 'the_sovereign_of_dust',
  name: 'The Sovereign of Dust',
  stats: {
    maxHp: 350,
    attack: 55,
    defence: 20,
    armour: 18,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'sovereigns_crown',
      name: 'Sovereign\'s Crown',
      weight: 2.0,
      description: 'Twisted rebar formed into a circlet.',
      dropWeight: 20,
    },
    {
      itemId: 'dust_orb',
      name: 'Dust Orb',
      weight: 1.5,
      description: 'Compacted debris that hums with power.',
      dropWeight: 25,
    },
    {
      itemId: 'ruin_lords_mantle',
      name: 'Ruin Lord\'s Mantle',
      weight: 6.0,
      description: 'A cloak of woven concrete dust and shadow.',
      dropWeight: 20,
    },
    {
      itemId: 'masterwork_rubble_blade',
      name: 'Masterwork Rubble Blade',
      weight: 8.0,
      description: 'A sword forged from the heart of the collapse.',
      dropWeight: 15,
    },
    {
      itemId: 'anomalous_core_fragment',
      name: 'Anomalous Core Fragment',
      weight: 0.5,
      description: 'Pulsing with reality-warping energy.',
      dropWeight: 10,
    },
    {
      itemId: 'echo_of_the_fall',
      name: 'Echo of the Fall',
      weight: 0.2,
      description: 'A memory crystal showing the megastructure\'s collapse.',
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
  roomDescription: 'The Sovereign of Dust hovers above broken ground, debris swirling in impossible patterns.',
  abilities: [
    {
      id: 'rubbleAvalanche',
      name: 'Rubble Avalanche',
      damage: 70,
      windUpTicks: 8,
      telegraphText: 'The Sovereign raises both hands, the ceiling groaning in response...',
    },
    {
      id: 'dustStorm',
      name: 'Dust Storm',
      damage: 45,
      windUpTicks: 5,
      telegraphText: 'Debris begins to orbit the Sovereign, spinning faster...',
    },
  ],
};
