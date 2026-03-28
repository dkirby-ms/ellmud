/**
 * PgItemDefinitionsStore — reads/writes the dedicated `item_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for items so the admin
 * console shows ALL items (40+) instead of the 18 stale copies that were
 * seeded into `content_definitions`.
 *
 * Maps between the relational schema (columns + stats JSONB) and the flat
 * ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface ItemRow {
  id: string;
  name: string;
  type: string;
  tier: string | null;
  stats: Record<string, unknown>;
  description: string | null;
  soulbound: boolean;
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: ItemRow): ContentEntity {
  const { weight, baseDurability, ...baseStats } = row.stats as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    tier: row.tier ?? 'common',
    weight: weight ?? 0,
    baseDurability: baseDurability ?? null,
    baseStats,
    description: row.description ?? '',
    soulbound: row.soulbound,
  };
}

export class PgItemDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'items';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<ItemRow>(
      `SELECT id, name, type, tier, stats, description, soulbound, created_at
       FROM item_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<ItemRow>(
      `SELECT id, name, type, tier, stats, description, soulbound, created_at
       FROM item_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, type, tier, weight, baseDurability, baseStats, description, soulbound } =
      entity as Record<string, unknown>;

    const stats = {
      ...(baseStats && typeof baseStats === 'object' ? baseStats : {}),
      ...(weight != null ? { weight } : {}),
      ...(baseDurability != null ? { baseDurability } : {}),
    };

    try {
      const result = await query<ItemRow>(
        `INSERT INTO item_definitions (name, type, tier, stats, description, soulbound)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, type, tier, stats, description, soulbound, created_at`,
        [
          name as string,
          type as string,
          (tier as string) ?? null,
          JSON.stringify(stats),
          (description as string) ?? null,
          soulbound === true,
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `items with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`items with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;
    const stats = {
      ...(merged.baseStats && typeof merged.baseStats === 'object' ? merged.baseStats : {}),
      ...(merged.weight != null ? { weight: merged.weight } : {}),
      ...(merged.baseDurability != null ? { baseDurability: merged.baseDurability } : {}),
    };

    const result = await query<ItemRow>(
      `UPDATE item_definitions
       SET name = $1, type = $2, tier = $3, stats = $4, description = $5, soulbound = $6
       WHERE id = $7
       RETURNING id, name, type, tier, stats, description, soulbound, created_at`,
      [
        merged.name as string,
        merged.type as string,
        (merged.tier as string) ?? null,
        JSON.stringify(stats),
        (merged.description as string) ?? null,
        merged.soulbound === true,
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM item_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
