/**
 * PgBiomeDefinitionsStore — reads/writes the dedicated `biome_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for biomes so the admin
 * console works against properly typed relational columns instead of a JSONB blob.
 *
 * Maps between the relational schema (columns + arrays) and the flat
 * ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface BiomeRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  tier: number;
  features: string[];
  hazard_types: string[];
  room_properties: string[];
  narration_hints: string[];
  created_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: BiomeRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    tier: row.tier,
    features: row.features,
    hazardTypes: row.hazard_types,
    roomProperties: row.room_properties,
    narrationHints: row.narration_hints,
  };
}

export class PgBiomeDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'biomes';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<BiomeRow>(
      `SELECT id, slug, name, description, tier, features, hazard_types, room_properties, narration_hints, created_at
       FROM biome_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<BiomeRow>(
      `SELECT id, slug, name, description, tier, features, hazard_types, room_properties, narration_hints, created_at
       FROM biome_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, description, tier, features, hazardTypes, roomProperties, narrationHints } =
      entity as Record<string, unknown>;

    // If caller passes an id that looks like a slug (not UUID), use it as slug
    const slug = entity.slug ?? entity.id ?? '';

    try {
      const result = await query<BiomeRow>(
        `INSERT INTO biome_definitions (slug, name, description, tier, features, hazard_types, room_properties, narration_hints)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, slug, name, description, tier, features, hazard_types, room_properties, narration_hints, created_at`,
        [
          slug as string,
          name as string,
          (description as string) ?? '',
          (tier as number) ?? 1,
          (features as string[]) ?? [],
          (hazardTypes as string[]) ?? [],
          (roomProperties as string[]) ?? [],
          (narrationHints as string[]) ?? [],
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `biomes with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`biomes with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<BiomeRow>(
      `UPDATE biome_definitions
       SET slug = $1, name = $2, description = $3, tier = $4, features = $5,
           hazard_types = $6, room_properties = $7, narration_hints = $8
       WHERE id = $9
       RETURNING id, slug, name, description, tier, features, hazard_types, room_properties, narration_hints, created_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.description as string) ?? '',
        (merged.tier as number) ?? 1,
        (merged.features as string[]) ?? [],
        (merged.hazardTypes as string[]) ?? [],
        (merged.roomProperties as string[]) ?? [],
        (merged.narrationHints as string[]) ?? [],
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM biome_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
