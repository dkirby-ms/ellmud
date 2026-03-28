/**
 * PgFactionDefinitionsStore — reads/writes the canonical `factions` table
 * (migration 004 + 025).
 *
 * Replaces the generic PgContentStore<ContentEntity> for factions so the admin
 * console works against the real game table (with faction_membership FKs)
 * instead of the stale JSONB copies in `content_definitions`.
 *
 * Maps between the relational schema and the flat ContentEntity shape the
 * admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface FactionRow {
  id: string;
  name: string;
  slug: string;
  philosophy: string | null;
  specialty: string | null;
  description: string | null;
  milestones: unknown[];
  events: unknown[];
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: FactionRow): ContentEntity {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    philosophy: row.philosophy ?? '',
    specialty: row.specialty ?? '',
    description: row.description ?? row.philosophy ?? '',
    milestones: row.milestones ?? [],
    events: row.events ?? [],
  };
}

export class PgFactionDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'factions';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<FactionRow>(
      `SELECT id, name, slug, philosophy, specialty, description, milestones, events, created_at
       FROM factions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<FactionRow>(
      `SELECT id, name, slug, philosophy, specialty, description, milestones, events, created_at
       FROM factions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const e = entity as Record<string, unknown>;

    try {
      const result = await query<FactionRow>(
        `INSERT INTO factions (name, slug, philosophy, specialty, description, milestones, events)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, slug, philosophy, specialty, description, milestones, events, created_at`,
        [
          e.name as string,
          e.slug as string,
          (e.philosophy as string) ?? null,
          (e.specialty as string) ?? null,
          (e.description as string) ?? (e.philosophy as string) ?? '',
          JSON.stringify((e.milestones as unknown[]) ?? []),
          JSON.stringify((e.events as unknown[]) ?? []),
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `factions with name or slug '${e.name ?? e.slug}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`factions with id '${id}' not found`, 'NOT_FOUND');
    }

    const m = { ...existing, ...partial, id } as Record<string, unknown>;

    try {
      const result = await query<FactionRow>(
        `UPDATE factions
         SET name = $1, slug = $2, philosophy = $3, specialty = $4,
             description = $5, milestones = $6, events = $7
         WHERE id = $8
         RETURNING id, name, slug, philosophy, specialty, description, milestones, events, created_at`,
        [
          m.name as string,
          m.slug as string,
          (m.philosophy as string) ?? null,
          (m.specialty as string) ?? null,
          (m.description as string) ?? '',
          JSON.stringify((m.milestones as unknown[]) ?? []),
          JSON.stringify((m.events as unknown[]) ?? []),
          id,
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `factions with name or slug '${m.name ?? m.slug}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM factions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
