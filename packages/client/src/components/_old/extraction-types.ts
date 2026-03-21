/**
 * Shared types for extraction screen components.
 */

export type ItemTier = 'common' | 'sturdy' | 'refined' | 'masterwork' | 'anomalous';

export interface LootItem {
  id: string;
  name: string;
  quantity: number;
  tier: ItemTier;
}

export interface RunSummary {
  timeInShard: number;       // seconds
  roomsExplored: number;
  creaturesDefeated: number;
  damageTaken: number;
  reputationGained: number;
}

export interface StashStats {
  totalValue: number;
  weightBefore: number;
  weightAfter: number;
}
