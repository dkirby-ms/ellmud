/**
 * Rubble Scavenger — The Warrens humanoid fighter.
 *
 * Gaunt, hunched humanoids wrapped in rags and scavenged armour.
 * They fashion crude weapons from debris and fight with desperate,
 * cornered-animal fury. Their eyes are empty but their hands never stop grasping.
 *
 * Berserker archetype: strike-heavy, rarely flees.
 *
 * Stats (Tier 1):
 *   HP: 35, Attack: 8, Defence: 3, Armour: 2, Agility: 4
 */

import type { CreatureTemplate } from '../types.js';

export const RUBBLE_SCAVENGER: CreatureTemplate = {
  type: 'rubble_scavenger',
  name: 'Rubble Scavenger',
  stats: {
    maxHp: 35,
    attack: 8,
    defence: 3,
    armour: 2,
    agility: 4,
  },
  lootTable: [
    {
      itemId: 'bent_rebar',
      name: 'Bent Rebar',
      weight: 3,
      description: 'A corroded length of rebar. Barely a weapon.',
      dropWeight: 50,
    },
    {
      itemId: 'tarnished_medallion',
      name: 'Tarnished Medallion',
      weight: 0.5,
      description: 'An ornate disc of dull metal, engraved with a sigil no one remembers.',
      dropWeight: 25,
    },
    {
      itemId: 'scavenger_shiv',
      name: "Scavenger's Shiv",
      weight: 2,
      description: 'A blade of broken glass bound with wire. Crude but sharp.',
      dropWeight: 15,
    },
  ],
  spawnRules: {
    minCount: 1,
    maxCount: 3,
    preferredRoomTypes: ['junction', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'boss'],
  },
  idleTicksMin: 4,
  idleTicksMax: 8,
  fleeThreshold: 0.15,
};
