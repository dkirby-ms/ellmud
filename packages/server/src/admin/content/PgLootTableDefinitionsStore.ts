/**
 * PgLootTableDefinitionsStore — reads/writes the dedicated `loot_table_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for loot-tables so the admin
 * console works against properly typed relational columns instead of a JSONB blob.
 *
 * Maps between the relational schema (columns + JSONB entries array) and the flat
 * ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface LootTableRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  entries: unknown[];
  min_drops: number;
  max_drops: number;
  created_at: Date;
  updated_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: LootTableRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    entries: row.entries,
    minDrops: row.min_drops,
    maxDrops: row.max_drops,
  };
}

export class PgLootTableDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'loot-tables';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<LootTableRow>(
      `SELECT id, slug, name, description, entries, min_drops, max_drops, created_at, updated_at
       FROM loot_table_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<LootTableRow>(
      `SELECT id, slug, name, description, entries, min_drops, max_drops, created_at, updated_at
       FROM loot_table_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, description, entries, minDrops, maxDrops } =
      entity as Record<string, unknown>;

    const slug = entity.slug ?? entity.id ?? '';

    try {
      const result = await query<LootTableRow>(
        `INSERT INTO loot_table_definitions (slug, name, description, entries, min_drops, max_drops)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, slug, name, description, entries, min_drops, max_drops, created_at, updated_at`,
        [
          slug as string,
          name as string,
          (description as string) ?? '',
          JSON.stringify(entries ?? []),
          (minDrops as number) ?? 1,
          (maxDrops as number) ?? 1,
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `loot-tables with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`loot-tables with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<LootTableRow>(
      `UPDATE loot_table_definitions
       SET slug = $1, name = $2, description = $3, entries = $4, min_drops = $5, max_drops = $6, updated_at = now()
       WHERE id = $7
       RETURNING id, slug, name, description, entries, min_drops, max_drops, created_at, updated_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.description as string) ?? '',
        JSON.stringify(merged.entries ?? []),
        (merged.minDrops as number) ?? 1,
        (merged.maxDrops as number) ?? 1,
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM loot_table_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
