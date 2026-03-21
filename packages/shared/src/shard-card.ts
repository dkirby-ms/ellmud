/**
 * Shard card data types for the Shardboard UI.
 * Defines the shape of shard selection cards displayed to players.
 */

import type { BiomeType, ShardTier, ShardModifier } from './index.js';

// ─── Shard Key Types (GDD §10.4) ────────────────────────────────────────────

export type ShardKeyType = 'bone' | 'iron' | 'crystal' | 'void';

// ─── Shard Card Data ────────────────────────────────────────────────────────

/** Data required to render a shard selection card on the Shardboard. */
export interface ShardCardData {
  shardId: string;
  name: string;
  tier: ShardTier;
  biome: BiomeType;
  modifiers: ShardModifier[];
  currentPlayers: number;
  maxPlayers: number;
  /** Seconds remaining in the entry window. */
  entryWindowSeconds: number;
  keyCost: ShardKeyType;
}
