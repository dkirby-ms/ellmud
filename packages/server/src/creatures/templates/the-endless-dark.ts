/**
 * The Endless Dark — Not a creature but a phenomenon. The darkness at the end of all things. It exist
 * ed before light and will exist after.
 *
 * Caster archetype.
 *
 * Stats (Tier 3):
 *   HP: 340, Attack: 66, Defence: 25, Armour: 22, Agility: 6
 */

import type { CreatureTemplate } from '../types.js';

export const THE_ENDLESS_DARK: CreatureTemplate = {
  type: 'the_endless_dark',
  name: 'The Endless Dark',
  stats: {
    maxHp: 340,
    attack: 66,
    defence: 25,
    armour: 22,
    agility: 6,
  },
  lootTable: [
    {
      itemId: 'fragment_of_nothing',
      name: 'Fragment of Nothing',
      weight: 1.0,
      description: 'A piece of oblivion.',
      dropWeight: 20,
    },
    {
      itemId: 'masterwork_shadow_armor',
      name: 'Masterwork Shadow Armor',
      weight: 13.0,
      description: 'Grants passage through darkness.',
      dropWeight: 18,
    },
    {
      itemId: 'anomalous_void_core',
      name: 'Anomalous Void Core',
      weight: 0.5,
      description: 'Can unmake anything.',
      dropWeight: 15,
    },
    {
      itemId: 'darkness_absolute',
      name: 'Darkness Absolute',
      weight: 0.3,
      description: 'The absence of all.',
      dropWeight: 12,
    },
    {
      itemId: 'crown_of_night',
      name: 'Crown of Night',
      weight: 1.5,
      description: 'Rules eternal darkness.',
      dropWeight: 15,
    },
    {
      itemId: 'extinction_blade',
      name: 'Extinction Blade',
      weight: 5.0,
      description: 'Ends light permanently.',
      dropWeight: 10,
    },
    {
      itemId: 'echo_of_the_void',
      name: 'Echo of the Void',
      weight: 0.2,
      description: 'The sound before silence.',
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
  roomDescription: 'The Endless Dark fills the void, and the void is everything.',
  abilities: [
    {
      id: 'consumeLight',
      name: 'Consume Light',
      damage: 75,
      windUpTicks: 8,
      telegraphText: 'All light begins to fail, drawn toward a central point...',
    },
  ],
};
