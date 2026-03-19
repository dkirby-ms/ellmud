/**
 * Drowned Revenant — Flooded Crypt signature creature (GDD §10.2).
 *
 * Waterlogged undead that patrol flooded corridors and dead ends.
 * Berserker archetype: strike-heavy in combat, flees at low HP.
 *
 * Stats (Phase 1 Tier 1):
 *   HP: 50, Attack: 10, Defence: 3, Armour: 3
 *
 * Loot: crafting materials (waterlogged bone, revenant essence).
 * Spawn: 3–5 per shard, prefers corridors and dead ends, never entry/extraction.
 */

import type { CreatureTemplate } from '../types.js';

export const DROWNED_REVENANT: CreatureTemplate = {
  type: 'drowned_revenant',
  name: 'Drowned Revenant',
  stats: {
    maxHp: 50,
    attack: 10,
    defence: 3,
    armour: 3,
  },
  lootTable: [
    {
      itemId: 'waterlogged_bone',
      name: 'waterlogged bone',
      weight: 1,
      description: 'A spongy bone that weeps brackish water. Useful for crude crafting.',
      dropWeight: 1,
    },
    {
      itemId: 'revenant_essence',
      name: 'revenant essence',
      weight: 0.5,
      description: 'A viscous, faintly glowing substance extracted from a fallen revenant.',
      dropWeight: 1,
    },
  ],
  spawnRules: {
    minCount: 3,
    maxCount: 5,
    preferredRoomTypes: ['corridor', 'dead_end'],
    forbiddenRoomTypes: ['entry', 'extraction'],
  },
  idleTicksMin: 3,
  idleTicksMax: 5,
  fleeThreshold: 0.25,
};
