/**
 * The Drowned Choir — Seven figures standing in a circle, forever singing. They were musicians once, n
 * ow they are an ensemble of drowning and despair.
 *
 * Caster archetype.
 *
 * Stats (Tier 2):
 *   HP: 280, Attack: 35, Defence: 15, Armour: 12, Agility: 3
 */

import type { CreatureTemplate } from '../types.js';

export const THE_DROWNED_CHOIR: CreatureTemplate = {
  type: 'the_drowned_choir',
  name: 'The Drowned Choir',
  stats: {
    maxHp: 280,
    attack: 35,
    defence: 15,
    armour: 12,
    agility: 3,
  },
  lootTable: [
    {
      itemId: 'choir_robe',
      name: 'Choir Robe',
      weight: 4.0,
      description: 'Soaked fabric that never dries.',
      dropWeight: 30,
    },
    {
      itemId: 'drowned_score',
      name: 'Drowned Score',
      weight: 0.5,
      description: 'Sheet music, ink running but legible.',
      dropWeight: 25,
    },
    {
      itemId: 'conductors_baton',
      name: 'Conductor\'s Baton',
      weight: 2.0,
      description: 'Commands the song of drowning.',
      dropWeight: 20,
    },
    {
      itemId: 'harmony_crystal',
      name: 'Harmony Crystal',
      weight: 1.0,
      description: 'Resonates with all seven voices.',
      dropWeight: 15,
    },
    {
      itemId: 'masterwork_sirens_blade',
      name: 'Masterwork Siren\'s Blade',
      weight: 5.0,
      description: 'Forged from song and sorrow.',
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
  roomDescription: 'The Drowned Choir stands in formation, their eternal song filling the chamber.',
  abilities: [
    {
      id: 'requiemOfDrowning',
      name: 'Requiem of Drowning',
      damage: 50,
      windUpTicks: 7,
      telegraphText: 'The choir inhales as one, water rising...',
    },
    {
      id: 'dissonantWave',
      name: 'Dissonant Wave',
      damage: 40,
      windUpTicks: 5,
      telegraphText: 'The seven voices split into discordant notes...',
    },
  ],
};
