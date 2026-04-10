/**
 * Scrap Brute — Massive scavengers who've replaced lost limbs with scrap metal prosthetics. They
 *  charge into battle with berserker rage.
 *
 * Berserker archetype.
 *
 * Stats (Tier 2):
 *   HP: 110, Attack: 26, Defence: 7, Armour: 10, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const SCRAP_BRUTE: CreatureTemplate = {
  type: 'scrap_brute',
  name: 'Scrap Brute',
  stats: {
    maxHp: 110,
    attack: 26,
    defence: 7,
    armour: 10,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'scrap_prosthetic',
      name: 'Scrap Prosthetic',
      weight: 6.0,
      description: 'A welded limb replacement, crude but functional.',
      dropWeight: 40,
    },
    {
      itemId: 'brutes_cleaver',
      name: 'Brute\'s Cleaver',
      weight: 7.0,
      description: 'A massive blade, half saw half sword.',
      dropWeight: 35,
    },
    {
      itemId: 'reinforced_scrap_plate',
      name: 'Reinforced Scrap Plate',
      weight: 8.0,
      description: 'Layered metal, hammered together.',
      dropWeight: 25,
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
  fleeThreshold: 0.15,
  aggressive: true,
  roomDescription: 'A scrap brute stands guard, its metal limbs grinding with each movement.',
  abilities: [
    {
      id: 'chargingGore',
      name: 'Charging Gore',
      damage: 40,
      windUpTicks: 5,
      telegraphText: 'The brute lowers its head and charges, scrap metal screaming...',
    },
  ],
};
