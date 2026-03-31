/**
 * PgCreatureDefinitionsStore — reads/writes the dedicated
 * `creature_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for creatures so the admin
 * console works against a proper relational schema instead of the JSONB blob in
 * `content_definitions`.
 *
 * Maps between the relational schema (columns + loot_table JSONB) and the flat
 * ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface CreatureRow {
  id: string;
  type: string;
  name: string;
  description: string | null;
  room_description: string | null;
  behavior: string | null;
  aggressive: boolean;
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
  biome_affinity: string[] | null;
  tier_min: number | null;
  tier_max: number | null;
  status: string | null;
  loot_table: unknown[];
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: CreatureRow): ContentEntity {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description ?? '',
    roomDescription: row.room_description ?? '',
    behavior: row.behavior ?? null,
    aggressive: row.aggressive,
    maxHp: row.max_hp,
    attack: row.attack,
    defence: row.defence,
    armour: row.armour,
    agility: row.agility,
    minCount: row.min_count,
    maxCount: row.max_count,
    preferredRooms: row.preferred_rooms,
    forbiddenRooms: row.forbidden_rooms,
    idleTicksMin: row.idle_ticks_min,
    idleTicksMax: row.idle_ticks_max,
    fleeThreshold: row.flee_threshold,
    biomeAffinity: row.biome_affinity ?? [],
    tierMin: row.tier_min ?? null,
    tierMax: row.tier_max ?? null,
    status: row.status ?? 'published',
    lootTable: row.loot_table,
  };
}

export class PgCreatureDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'creatures';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<CreatureRow>(
      `SELECT id, type, name, description, room_description, behavior, aggressive, max_hp, attack, defence, armour, agility,
              min_count, max_count, preferred_rooms, forbidden_rooms,
              idle_ticks_min, idle_ticks_max, flee_threshold,
              biome_affinity, tier_min, tier_max, status, loot_table, created_at
       FROM creature_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<CreatureRow>(
      `SELECT id, type, name, description, room_description, behavior, aggressive, max_hp, attack, defence, armour, agility,
              min_count, max_count, preferred_rooms, forbidden_rooms,
              idle_ticks_min, idle_ticks_max, flee_threshold,
              biome_affinity, tier_min, tier_max, status, loot_table, created_at
       FROM creature_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const e = entity as Record<string, unknown>;

    try {
      const result = await query<CreatureRow>(
        `INSERT INTO creature_definitions
           (type, name, description, room_description, behavior, aggressive, max_hp, attack, defence, armour, agility,
            min_count, max_count, preferred_rooms, forbidden_rooms,
            idle_ticks_min, idle_ticks_max, flee_threshold,
            biome_affinity, tier_min, tier_max, status, loot_table)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
         RETURNING id, type, name, description, room_description, behavior, aggressive, max_hp, attack, defence, armour, agility,
                   min_count, max_count, preferred_rooms, forbidden_rooms,
                   idle_ticks_min, idle_ticks_max, flee_threshold,
                   biome_affinity, tier_min, tier_max, status, loot_table, created_at`,
        [
          e.type as string,
          e.name as string,
          (e.description as string) ?? '',
          (e.roomDescription as string) ?? null,
          (e.behavior as string) ?? null,
          (e.aggressive as boolean) ?? true,
          (e.maxHp as number) ?? 100,
          (e.attack as number) ?? 10,
          (e.defence as number) ?? 5,
          (e.armour as number) ?? 0,
          (e.agility as number) ?? 0,
          (e.minCount as number) ?? 1,
          (e.maxCount as number) ?? 3,
          (e.preferredRooms as string[]) ?? [],
          (e.forbiddenRooms as string[]) ?? [],
          (e.idleTicksMin as number) ?? 3,
          (e.idleTicksMax as number) ?? 5,
          (e.fleeThreshold as number) ?? 0.25,
          (e.biomeAffinity as string[]) ?? null,
          (e.tierMin as number) ?? null,
          (e.tierMax as number) ?? null,
          (e.status as string) ?? 'published',
          JSON.stringify((e.lootTable as unknown[]) ?? []),
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `creatures with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`creatures with id '${id}' not found`, 'NOT_FOUND');
    }

    const m = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<CreatureRow>(
      `UPDATE creature_definitions
       SET type = $1, name = $2, description = $3, room_description = $4, behavior = $5, aggressive = $6,
           max_hp = $7, attack = $8, defence = $9, armour = $10, agility = $11,
           min_count = $12, max_count = $13, preferred_rooms = $14, forbidden_rooms = $15,
           idle_ticks_min = $16, idle_ticks_max = $17, flee_threshold = $18,
           biome_affinity = $19, tier_min = $20, tier_max = $21, status = $22, loot_table = $23
       WHERE id = $24
       RETURNING id, type, name, description, room_description, behavior, aggressive, max_hp, attack, defence, armour, agility,
                 min_count, max_count, preferred_rooms, forbidden_rooms,
                 idle_ticks_min, idle_ticks_max, flee_threshold,
                 biome_affinity, tier_min, tier_max, status, loot_table, created_at`,
      [
        m.type as string,
        m.name as string,
        (m.description as string) ?? '',
        (m.roomDescription as string) ?? null,
        (m.behavior as string) ?? null,
        (m.aggressive as boolean) ?? true,
        (m.maxHp as number) ?? 100,
        (m.attack as number) ?? 10,
        (m.defence as number) ?? 5,
        (m.armour as number) ?? 0,
        (m.agility as number) ?? 0,
        (m.minCount as number) ?? 1,
        (m.maxCount as number) ?? 3,
        (m.preferredRooms as string[]) ?? [],
        (m.forbiddenRooms as string[]) ?? [],
        (m.idleTicksMin as number) ?? 3,
        (m.idleTicksMax as number) ?? 5,
        (m.fleeThreshold as number) ?? 0.25,
        (m.biomeAffinity as string[]) ?? null,
        (m.tierMin as number) ?? null,
        (m.tierMax as number) ?? null,
        (m.status as string) ?? 'published',
        JSON.stringify((m.lootTable as unknown[]) ?? []),
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM creature_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
