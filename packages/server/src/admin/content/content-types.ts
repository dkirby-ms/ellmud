/**
 * Admin content entity type definitions.
 *
 * For entity types with existing shared types (items, creatures), we re-use those.
 * For new entity types (biomes, modifiers, skills, loot-tables, factions, rooms, narrative),
 * we define extensible admin content schemas here.
 */

import type { ContentEntity } from './ContentStore.js';

// ─── Biome Definition (admin-managed) ────────────────────────────────────────

export interface BiomeDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  tier: number;
  features: string[];
  hazardTypes: string[];
  roomProperties: string[];
  narrationHints: string[];
}

// ─── Modifier Definition (shard modifiers) ───────────────────────────────────

export interface ModifierDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  effects: Record<string, number>;
  stackable: boolean;
  tags: string[];
}

// ─── Skill Definition ────────────────────────────────────────────────────────

export interface SkillDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  category: string;
  cooldownTicks: number;
  staminaCost: number;
  effects: Record<string, unknown>;
  requirements: Record<string, unknown>;
}

// ─── Loot Table Definition ───────────────────────────────────────────────────

export interface LootTableDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  entries: LootTableEntry[];
  minDrops: number;
  maxDrops: number;
}

export interface LootTableEntry {
  itemId: string;
  dropWeight: number;
  minQuantity: number;
  maxQuantity: number;
}

// ─── Faction Definition ──────────────────────────────────────────────────────

export interface FactionDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  milestones: FactionMilestoneEntry[];
  events: FactionEventEntry[];
}

export interface FactionMilestoneEntry {
  name: string;
  threshold: number;
  description: string;
}

export interface FactionEventEntry {
  milestone: string;
  narratives: string[];
}

// ─── Room Template Definition (admin-designed room templates) ─────────────────

export interface RoomTemplateDefinition extends ContentEntity {
  id: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  hazards: Array<{ type: string; severity: number }>;
  lootContainers: Array<{ type: string; itemIds: string[] }>;
}

// ─── Narrative Template Definition ───────────────────────────────────────────

export interface NarrativeTemplateDefinition extends ContentEntity {
  id: string;
  name: string;
  narrativeType: string;
  biome: string;
  template: string;
  tone: string;
  verbosity: string;
  tags: string[];
}

// ─── Entity Type Union ───────────────────────────────────────────────────────

export const CONTENT_ENTITY_TYPES = [
  'items',
  'creatures',
  'biomes',
  'modifiers',
  'skills',
  'loot-tables',
  'factions',
  'rooms',
  'narrative',
] as const;

export type ContentEntityType = (typeof CONTENT_ENTITY_TYPES)[number];
