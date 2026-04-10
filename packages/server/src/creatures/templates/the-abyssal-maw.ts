/**
 * The Abyssal Maw — Something vast lurks in the deepest flooded sections. You never see all of it — 
 * just the mouth. The mouth is enough.
 *
 * Guardian archetype.
 *
 * Stats (Tier 3):
 *   HP: 400, Attack: 70, Defence: 25, Armour: 35, Agility: 2
 */

import type { CreatureTemplate } from '../types.js';

export const THE_ABYSSAL_MAW: CreatureTemplate = {
  type: 'the_abyssal_maw',
  name: 'The Abyssal Maw',
  stats: {
    maxHp: 400,
    attack: 70,
    defence: 25,
    armour: 35,
    agility: 2,
  },
  lootTable: [
    {
      itemId: 'maw_tooth',
      name: 'Maw Tooth',
      weight: 8.0,
      description: 'Large enough to use as a weapon.',
      dropWeight: 35,
    },
    {
      itemId: 'abyssal_pearl',
      name: 'Abyssal Pearl',
      weight: 1.5,
      description: 'Black and lustrous.',
      dropWeight: 25,
    },
    {
      itemId: 'leviathan_hide',
      name: 'Leviathan Hide',
      weight: 10.0,
      description: 'Thick armor from something ancient.',
      dropWeight: 20,
    },
    {
      itemId: 'anomalous_deep_core',
      name: 'Anomalous Deep Core',
      weight: 0.8,
      description: 'Pulses with crushing pressure.',
      dropWeight: 10,
    },
    {
      itemId: 'masterwork_trident_of_depths',
      name: 'Masterwork Trident of Depths',
      weight: 7.0,
      description: 'Commands water itself.',
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
  roomDescription: 'The Abyssal Maw waits in water too deep to see bottom, only teeth visible.',
  abilities: [
    {
      id: 'devouringLunge',
      name: 'Devouring Lunge',
      damage: 90,
      windUpTicks: 8,
      telegraphText: 'The maw opens wider than should be possible...',
    },
    {
      id: 'pressureImplosion',
      name: 'Pressure Implosion',
      damage: 75,
      windUpTicks: 7,
      telegraphText: 'Water rushes toward the maw\'s center...',
    },
  ],
};
