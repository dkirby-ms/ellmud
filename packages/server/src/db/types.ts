/**
 * @ellmud/server — Database types.
 *
 * TypeScript interfaces matching each PostgreSQL table.
 * Used by server code to type-check queries against the schema.
 */

import type { GearTier, ZoneTier } from '@ellmud/shared';

// ─── Player Identity (normalized for future OAuth) ───────────────────────────

export interface PlayerIdentity {
  id: string;
  provider: string;
  provider_id: string | null;
  email: string | null;
  password_hash: string | null;
  role: string;
  created_at: Date;
}

// ─── Player Profile ──────────────────────────────────────────────────────────

export interface Player {
  id: string;
  identity_id: string;
  username: string;
  created_at: Date;
  updated_at: Date;
}

// ─── Item Definitions ────────────────────────────────────────────────────────

export type ItemType =
  | 'weapon'
  | 'armour'
  | 'consumable'
  | 'material'
  | 'tool'
  | 'key'
  | 'blueprint';

export interface ItemDefinition {
  id: string;
  name: string;
  type: ItemType;
  tier: GearTier | null;
  stats: Record<string, unknown>;
  description: string | null;
  soulbound: boolean;
  created_at: Date;
}

// ─── Stash (Persistent Inventory) ────────────────────────────────────────────

export interface StashEntry {
  id: string;
  player_id: string;
  item_id: string;
  quantity: number;
  durability: number | null;
  metadata: Record<string, unknown>;
  acquired_at: Date;
}

// ─── Skills & Progression ────────────────────────────────────────────────────

export type SkillCategory =
  | 'combat'
  | 'defence'
  | 'survival'
  | 'subterfuge'
  | 'awareness'
  | 'social';

export interface PlayerSkill {
  id: string;
  player_id: string;
  skill_name: string;
  category: SkillCategory;
  level: number;
  xp: number;
  updated_at: Date;
}

// ─── Factions ────────────────────────────────────────────────────────────────

export interface Faction {
  id: string;
  name: string;
  slug: string;
  philosophy: string | null;
  specialty: string | null;
  created_at: Date;
}

export interface FactionMembership {
  id: string;
  player_id: string;
  faction_id: string;
  reputation: number;
  rank: number;
  joined_at: Date;
  updated_at: Date;
}

// ─── Run History ─────────────────────────────────────────────────────────────

export interface RunHistory {
  id: string;
  player_id: string;
  run_id: string;
  zone_tier: ZoneTier;
  duration_sec: number;
  survived: boolean;
  items_carried_out: unknown[];
  xp_gained: number;
  created_at: Date;
}

// ─── Canonical Faction Slugs ─────────────────────────────────────────────────

export const FactionSlugs = {
  KINDARI: 'kindari',
  BLOOM_TENDERS: 'bloom-tenders',
  KREWE_CALLIOPE: 'krewe-calliope',
} as const;

export type FactionSlug = typeof FactionSlugs[keyof typeof FactionSlugs];

// ─── User Settings ──────────────────────────────────────────────────────────

export interface UserSettingsConfig {
  display?: { fontSize?: number };
  narration?: { verbosity?: 'terse' | 'standard' | 'verbose'; narrationStyle?: string };
  gameplay?: Record<string, unknown>;
  accessibility?: Record<string, unknown>;
}

export interface UserSettings {
  id: string;
  playerId: string;
  config: UserSettingsConfig;
  createdAt: Date;
  updatedAt: Date;
}
