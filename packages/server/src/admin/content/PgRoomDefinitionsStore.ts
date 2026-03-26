/**
 * PgRoomDefinitionsStore — reads/writes the dedicated `room_definitions` table.
 *
 * Replaces the generic PgContentStore<ContentEntity> for rooms so the admin
 * console works against properly typed relational columns instead of a JSONB blob.
 *
 * Maps between the relational schema (columns + JSONB arrays) and the flat
 * ContentEntity shape the admin routes and UI expect.
 */

import { query } from '../../db/index.js';
import { ContentStoreError, type ContentEntity, type IContentStore } from './ContentStore.js';

interface RoomRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: string;
  properties: string[];
  hazards: Array<{ type: string; severity: number }>;
  loot_containers: Array<{ type: string; itemIds: string[] }>;
  created_at: Date;
  updated_at: Date;
}

/** Convert a DB row into the flat object the admin UI expects. */
function rowToEntity(row: RoomRow): ContentEntity {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    properties: row.properties,
    hazards: row.hazards,
    lootContainers: row.loot_containers,
  };
}

export class PgRoomDefinitionsStore implements IContentStore<ContentEntity> {
  readonly entityType = 'rooms';

  async getAll(): Promise<ContentEntity[]> {
    const result = await query<RoomRow>(
      `SELECT id, slug, name, description, type, properties, hazards, loot_containers, created_at, updated_at
       FROM room_definitions
       ORDER BY name`,
    );
    return result.rows.map(rowToEntity);
  }

  async getById(id: string): Promise<ContentEntity | undefined> {
    const result = await query<RoomRow>(
      `SELECT id, slug, name, description, type, properties, hazards, loot_containers, created_at, updated_at
       FROM room_definitions
       WHERE id = $1`,
      [id],
    );
    if (result.rows.length === 0) return undefined;
    return rowToEntity(result.rows[0]);
  }

  async create(entity: ContentEntity): Promise<ContentEntity> {
    const { name, description, type, properties, hazards, lootContainers } =
      entity as Record<string, unknown>;

    const slug = entity.slug ?? entity.id ?? '';

    try {
      const result = await query<RoomRow>(
        `INSERT INTO room_definitions (slug, name, description, type, properties, hazards, loot_containers)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, slug, name, description, type, properties, hazards, loot_containers, created_at, updated_at`,
        [
          slug as string,
          name as string,
          (description as string) ?? '',
          (type as string) ?? '',
          JSON.stringify((properties as string[]) ?? []),
          JSON.stringify((hazards as Array<{ type: string; severity: number }>) ?? []),
          JSON.stringify((lootContainers as Array<{ type: string; itemIds: string[] }>) ?? []),
        ],
      );
      return rowToEntity(result.rows[0]);
    } catch (err: unknown) {
      if (isPgError(err) && err.code === '23505') {
        throw new ContentStoreError(
          `rooms with id '${entity.id}' already exists`,
          'DUPLICATE_ID',
        );
      }
      throw err;
    }
  }

  async update(id: string, partial: Partial<ContentEntity>): Promise<ContentEntity> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new ContentStoreError(`rooms with id '${id}' not found`, 'NOT_FOUND');
    }

    const merged = { ...existing, ...partial, id } as Record<string, unknown>;

    const result = await query<RoomRow>(
      `UPDATE room_definitions
       SET slug = $1, name = $2, description = $3, type = $4, properties = $5,
           hazards = $6, loot_containers = $7, updated_at = now()
       WHERE id = $8
       RETURNING id, slug, name, description, type, properties, hazards, loot_containers, created_at, updated_at`,
      [
        merged.slug as string,
        merged.name as string,
        (merged.description as string) ?? '',
        (merged.type as string) ?? '',
        JSON.stringify((merged.properties as string[]) ?? []),
        JSON.stringify((merged.hazards as Array<{ type: string; severity: number }>) ?? []),
        JSON.stringify((merged.lootContainers as Array<{ type: string; itemIds: string[] }>) ?? []),
        id,
      ],
    );
    return rowToEntity(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await query(
      `DELETE FROM room_definitions WHERE id = $1`,
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}
