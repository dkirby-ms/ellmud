/**
 * PgSkillDefinitionsStore — reads/writes the dedicated `skill_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for skills so the admin
 * console works against properly typed relational columns instead of a JSONB blob.
 *
 * Maps between the relational schema (columns + JSONB effects/requirements) and
 * the flat ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface SkillRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  cooldown_ticks: number;
  stamina_cost: number;
  effects: Record<string, unknown>;
  requirements: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: SkillRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    cooldownTicks: row.cooldown_ticks,
    staminaCost: row.stamina_cost,
    effects: row.effects,
    requirements: row.requirements,
  };
}

export class PgSkillDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'skills';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<SkillRow>(
      `SELECT id, slug, name, description, category, cooldown_ticks, stamina_cost, effects, requirements, created_at, updated_at
       FROM skill_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<SkillRow>(
      `SELECT id, slug, name, description, category, cooldown_ticks, stamina_cost, effects, requirements, created_at, updated_at
       FROM skill_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, description, category, cooldownTicks, staminaCost, effects, requirements } =
      entity as Record<string, unknown>;

    const slug = entity.slug ?? entity.id ?? '';

    try {
      const result = await query<SkillRow>(
        `INSERT INTO skill_definitions (slug, name, description, category, cooldown_ticks, stamina_cost, effects, requirements)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, slug, name, description, category, cooldown_ticks, stamina_cost, effects, requirements, created_at, updated_at`,
        [
          slug as string,
          name as string,
          (description as string) ?? '',
          (category as string) ?? '',
          (cooldownTicks as number) ?? 0,
          (staminaCost as number) ?? 0,
          JSON.stringify(effects ?? {}),
          JSON.stringify(requirements ?? {}),
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `skills with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`skills with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<SkillRow>(
      `UPDATE skill_definitions
       SET slug = $1, name = $2, description = $3, category = $4, cooldown_ticks = $5,
           stamina_cost = $6, effects = $7, requirements = $8, updated_at = now()
       WHERE id = $9
       RETURNING id, slug, name, description, category, cooldown_ticks, stamina_cost, effects, requirements, created_at, updated_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.description as string) ?? '',
        (merged.category as string) ?? '',
        (merged.cooldownTicks as number) ?? 0,
        (merged.staminaCost as number) ?? 0,
        JSON.stringify(merged.effects ?? {}),
        JSON.stringify(merged.requirements ?? {}),
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM skill_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
