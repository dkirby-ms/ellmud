/**
 * ContentStore — Generic content store for admin-editable game content.
 *
 * Follows the repository pattern used across the codebase
 * (PlayerRepository, StashRepository). All methods are async so the interface
 * works with both in-memory and PostgreSQL backends.
 *
 * IContentStore defines the contract; InMemoryContentStore is the in-memory
 * implementation used as a dev fallback when DATABASE_URL is not set.
 */

export interface ContentEntity {
  id: string;
  [key: string]: unknown;
}

/** Store contract — implemented by InMemoryContentStore and PgContentStore. */
export interface IContentStore<T extends ContentEntity> {
  readonly entityType: string;
  getAll(): Promise<T[]>;
  getById(id: string): Promise<T | undefined>;
  create(entity: T): Promise<T>;
  update(id: string, partial: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/** In-memory implementation — dev fallback when DATABASE_URL is not set. */
export class ContentStore<T extends ContentEntity> implements IContentStore<T> {
  private readonly entities: Map<string, T> = new Map();
  readonly entityType: string;

  constructor(entityType: string, seed?: T[]) {
    this.entityType = entityType;
    if (seed) {
      for (const entity of seed) {
        this.entities.set(entity.id, structuredClone(entity));
      }
    }
  }

  async getAll(): Promise<T[]> {
    return Array.from(this.entities.values()).map((e) => structuredClone(e));
  }

  async getById(id: string): Promise<T | undefined> {
    const entity = this.entities.get(id);
    return entity ? structuredClone(entity) : undefined;
  }

  async create(entity: T): Promise<T> {
    if (this.entities.has(entity.id)) {
      throw new ContentStoreError(`${this.entityType} with id '${entity.id}' already exists`, 'DUPLICATE_ID');
    }
    const copy = structuredClone(entity);
    this.entities.set(copy.id, copy);
    return structuredClone(copy);
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    const existing = this.entities.get(id);
    if (!existing) {
      throw new ContentStoreError(`${this.entityType} with id '${id}' not found`, 'NOT_FOUND');
    }
    // Merge — id is immutable
    const updated = { ...structuredClone(existing), ...partial, id } as T;
    this.entities.set(id, updated);
    return structuredClone(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.entities.delete(id);
  }

  get size(): number {
    return this.entities.size;
  }
}

export class ContentStoreError extends Error {
  constructor(
    message: string,
    public readonly code: 'DUPLICATE_ID' | 'NOT_FOUND' | 'VALIDATION',
  ) {
    super(message);
    this.name = 'ContentStoreError';
  }
}
