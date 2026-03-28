/**
 * PgModifierDefinitionsStore — reads/writes the dedicated `modifier_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for modifiers so the admin
 * console works against properly typed relational columns instead of a JSONB blob.
 *
 * Maps between the relational schema (columns + JSONB effects + array tags) and
 * the flat ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface ModifierRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  effects: Record<string, number>;
  stackable: boolean;
  tags: string[];
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: ModifierRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    effects: row.effects,
    stackable: row.stackable,
    tags: row.tags,
  };
}

export class PgModifierDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'modifiers';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<ModifierRow>(
      `SELECT id, slug, name, description, effects, stackable, tags, created_at
       FROM modifier_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<ModifierRow>(
      `SELECT id, slug, name, description, effects, stackable, tags, created_at
       FROM modifier_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, description, effects, stackable, tags } =
      entity as Record<string, unknown>;

    // If caller passes an id that looks like a slug (not UUID), use it as slug
    const slug = entity.slug ?? entity.id ?? '';

    try {
      const result = await query<ModifierRow>(
        `INSERT INTO modifier_definitions (slug, name, description, effects, stackable, tags)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, slug, name, description, effects, stackable, tags, created_at`,
        [
          slug as string,
          name as string,
          (description as string) ?? '',
          JSON.stringify(effects ?? {}),
          stackable === true,
          (tags as string[]) ?? [],
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `modifiers with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`modifiers with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<ModifierRow>(
      `UPDATE modifier_definitions
       SET slug = $1, name = $2, description = $3, effects = $4, stackable = $5, tags = $6
       WHERE id = $7
       RETURNING id, slug, name, description, effects, stackable, tags, created_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.description as string) ?? '',
        JSON.stringify(merged.effects ?? {}),
        merged.stackable === true,
        (merged.tags as string[]) ?? [],
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM modifier_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
