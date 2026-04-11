/**
 * ContentRegistry — memory-resident cache of DB-driven content definitions.
 *
 * Single source of truth for creature templates and item definitions at runtime.
 * Loaded once at startup, reloaded after admin edits. Zero per-tick queries.
 */

import type { Pool } from 'pg';
import type { ItemDefinition } from '@ellmud/shared';
import type { CreatureTemplate, CreatureType, LootEntry } from '../creatures/types.js';

// ─── DB Row Types ────────────────────────────────────────────────────────────

interface CreatureRow {
  id: string;
  slug?: string;
  type: string;
  name: string;
  max_hp: number;
  attack: number;
  defence: number;
  armour: number;
  agility: number;
  min_count: number;
  max_count: number;
  preferred_rooms: string[];
  forbidden_rooms: string[];
  idle_ticks_min: number;
  idle_ticks_max: number;
  flee_threshold: number;
  loot_table: Array<{ itemId: string; dropWeight: number }>;
  status: string;
  aggressive: boolean;
  room_description: string | null;
}

interface ItemRow {
  id: string;
  name: string;
  type: string;
  tier: string;
  base_stats: Record<string, unknown>;
  base_durability: number | null;
  weight: number;
  description: string;
  soulbound: boolean;
  stackable: boolean;
  max_stack: number;
  status: string;
  container_properties: Record<string, unknown> | null;
}

// ─── ContentRegistry ─────────────────────────────────────────────────────────

export class ContentRegistry {
  private creatures = new Map<string, CreatureTemplate>();
  private items = new Map<string, ItemDefinition>();
  private pool: Pool | null = null;

  /** Load all published definitions from DB into memory. */
  async initialize(pool: Pool): Promise<void> {
    this.pool = pool;
    await this.loadAll();
  }

  /** Reload from DB (called after admin edits). */
  async reload(): Promise<void> {
    if (!this.pool) throw new Error('ContentRegistry not initialized');
    await this.loadAll();
  }

  /** Get a creature template by slug. Returns undefined if not found. */
  getCreature(slug: string): CreatureTemplate | undefined {
    return this.creatures.get(slug);
  }

  /** Get an item definition by ID. Returns undefined if not found. */
  getItem(id: string): ItemDefinition | undefined {
    return this.items.get(id);
  }

  /** Get all published creature templates. */
  getAllCreatures(): CreatureTemplate[] {
    return Array.from(this.creatures.values());
  }

  /** Get all published item definitions. */
  getAllItems(): ItemDefinition[] {
    return Array.from(this.items.values());
  }

  /** Whether the registry has been initialized with DB data. */
  isInitialized(): boolean {
    return this.pool !== null;
  }

  /** Validate all cross-references. Returns list of errors. */
  validate(): string[] {
    const errors: string[] = [];

    for (const [slug, creature] of this.creatures) {
      for (const entry of creature.lootTable) {
        if (!this.items.has(entry.itemId)) {
          errors.push(
            `Creature "${slug}" loot references unknown item "${entry.itemId}"`,
          );
        }
      }
    }

    return errors;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async loadAll(): Promise<void> {
    if (!this.pool) return;

    // Load items first — creatures need them for loot hydration
    await this.loadItems();
    await this.loadCreatures();
  }

  private async loadItems(): Promise<void> {
    const result = await this.pool!.query<ItemRow>(
      `SELECT id, name, type, tier, base_stats, base_durability, weight,
              description, soulbound, stackable, max_stack, status, container_properties
       FROM item_definitions
       WHERE status = 'published'`,
    );

    const next = new Map<string, ItemDefinition>();
    for (const row of result.rows) {
      const item: ItemDefinition = {
        id: row.id,
        name: row.name,
        type: row.type as ItemDefinition['type'],
        tier: row.tier as ItemDefinition['tier'],
        baseStats: row.base_stats ?? {},
        baseDurability: row.base_durability,
        weight: row.weight,
        description: row.description ?? '',
        soulbound: row.soulbound ?? false,
      };
      
      // Map container_properties if present
      if (row.container_properties) {
        item.containerProperties = row.container_properties as ItemDefinition['containerProperties'];
      }
      
      next.set(row.id, item);
    }
    this.items = next;
  }

  private async loadCreatures(): Promise<void> {
    const result = await this.pool!.query<CreatureRow>(
      `SELECT id, slug, type, name, max_hp, attack, defence, armour, agility,
              min_count, max_count, preferred_rooms, forbidden_rooms,
              idle_ticks_min, idle_ticks_max, flee_threshold, loot_table, status,
              aggressive, room_description
       FROM creature_definitions
       WHERE status = 'published'`,
    );

    const next = new Map<string, CreatureTemplate>();
    for (const row of result.rows) {
      // Use slug if present, fall back to type (pre-migration compat)
      const key = row.slug ?? row.type;

      const lootTable: LootEntry[] = (row.loot_table ?? []).map((entry) => {
        const item = this.items.get(entry.itemId);
        return {
          itemId: entry.itemId,
          name: item?.name ?? entry.itemId,
          weight: item?.weight ?? 1,
          description: item?.description ?? '',
          dropWeight: entry.dropWeight,
        };
      });

      next.set(key, {
        type: row.type as CreatureType,
        name: row.name,
        stats: {
          maxHp: row.max_hp,
          attack: row.attack,
          defence: row.defence,
          armour: row.armour,
          agility: row.agility,
        },
        lootTable,
        spawnRules: {
          minCount: row.min_count,
          maxCount: row.max_count,
          preferredRoomTypes: row.preferred_rooms ?? [],
          forbiddenRoomTypes: row.forbidden_rooms ?? [],
        },
        idleTicksMin: row.idle_ticks_min,
        idleTicksMax: row.idle_ticks_max,
        fleeThreshold: row.flee_threshold,
        aggressive: row.aggressive ?? true,
        roomDescription: row.room_description ?? undefined,
      });
    }
    this.creatures = next;
  }
}
