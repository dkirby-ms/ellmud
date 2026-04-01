/**
 * PgNarrativeDefinitionsStore — reads/writes the dedicated
 * `narrative_template_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for narrative so the admin
 * console works against a proper relational schema instead of the JSONB blob in
 * `content_definitions`.
 *
 * Maps between the relational schema (columns) and the flat ContentEntity shape
 * the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface NarrativeRow {
  id: string;
  slug: string;
  name: string;
  narrative_type: string;
  template: string;
  tone: string | null;
  verbosity: string | null;
  tags: string[];
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: NarrativeRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    narrativeType: row.narrative_type,
    template: row.template,
    tone: row.tone ?? '',
    verbosity: row.verbosity ?? '',
    tags: row.tags,
  };
}

export class PgNarrativeDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'narrative';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<NarrativeRow>(
      `SELECT id, slug, name, narrative_type, template, tone, verbosity, tags, created_at
       FROM narrative_template_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<NarrativeRow>(
      `SELECT id, slug, name, narrative_type, template, tone, verbosity, tags, created_at
       FROM narrative_template_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { slug, name, narrativeType, template, tone, verbosity, tags } =
      entity as Record<string, unknown>;

    try {
      const result = await query<NarrativeRow>(
        `INSERT INTO narrative_template_definitions (slug, name, narrative_type, template, tone, verbosity, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, slug, name, narrative_type, template, tone, verbosity, tags, created_at`,
        [
          slug as string,
          name as string,
          (narrativeType as string) ?? 'lore',
          (template as string) ?? '',
          (tone as string) ?? null,
          (verbosity as string) ?? null,
          (tags as string[]) ?? [],
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `narrative with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`narrative with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<NarrativeRow>(
      `UPDATE narrative_template_definitions
       SET slug = $1, name = $2, narrative_type = $3, template = $4, tone = $5, verbosity = $6, tags = $7
       WHERE id = $8
       RETURNING id, slug, name, narrative_type, template, tone, verbosity, tags, created_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.narrativeType as string) ?? 'lore',
        (merged.template as string) ?? '',
        (merged.tone as string) ?? null,
        (merged.verbosity as string) ?? null,
        (merged.tags as string[]) ?? [],
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM narrative_template_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
