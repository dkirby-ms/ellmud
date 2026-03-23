/**
 * PgContentStore — PostgreSQL-backed content store for admin-editable game content.
 *
 * Follows the PgPlayerRepository / PgStashRepository pattern: parameterised SQL
 * against the connection pool, no ORM. Uses the `content_definitions` table with
 * a JSONB `data` column for schema-flexible storage across all 9 entity types.
 *
 * Drop-in replacement for the in-memory ContentStore. Same async interface,
 * same error codes — callers (routes) don't know the difference.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity } from './ContentStore.js';

interface ContentRow {
  id: string;
  entity_type: string;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class PgContentStore<T extends ContentEntity> {
  readonly entityType: string;

  constructor(entityType: string) {
    this.entityType = entityType;
  }

  async getAll(): Promise<T[]> {
    const result = await query<ContentRow>(
      `SELECT data FROM content_definitions WHERE entity_type = $1 ORDER BY created_at`,
      [this.entityType],
    );
    return result.rows.map((row) => row.data as unknown as T);
  }

  async getById(id: string): Promise<T | undefined> {
    const result = await query<ContentRow>(
      `SELECT data FROM content_definitions WHERE entity_type = $1 AND id = $2`,
      [this.entityType, id],
    );
    if (result.rows.length === 0) return undefined;
    return result.rows[0].data as unknown as T;
  }

  async create(entity: T): Promise<T> {
    try {
      await query(
        `INSERT INTO content_definitions (id, entity_type, data)
         VALUES ($1, $2, $3)`,
        [entity.id, this.entityType, JSON.stringify(entity)],
      );
      return structuredClone(entity);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `${this.entityType} with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    // Fetch existing first
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(
        `${this.entityType} with id '${id}' not found`,
        'NOT_FOUND',
      );
    }

    const updated = { ...existing, ...partial, id } as T;

    await query(
      `UPDATE content_definitions
       SET data = $1, updated_at = now()
       WHERE entity_type = $2 AND id = $3`,
      [JSON.stringify(updated), this.entityType, id],
    );

    return structuredClone(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM content_definitions WHERE entity_type = $1 AND id = $2`,
      [this.entityType, id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  get size(): Promise<number> {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM content_definitions WHERE entity_type = $1`,
      [this.entityType],
    ).then((r) => parseInt(r.rows[0].count, 10));
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
