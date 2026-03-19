/**
 * Narration Cache — content-addressable prose storage.
 *
 * Interface-based design allows Redis or in-memory implementations.
 * Phase 1 defaults to in-memory LRU (max 1000 entries).
 */

/** Cache interface — all implementations must satisfy this contract. */
export interface NarrationCache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
}

// ─── In-Memory LRU Cache ─────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * Simple LRU cache with TTL support.
 * Max entries configurable (default 1000). On capacity, evicts oldest entry.
 */
export class InMemoryNarrationCache implements NarrationCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU: move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /** Expose size for testing. */
  get size(): number {
    return this.cache.size;
  }

  /** Clear all entries. */
  clear(): void {
    this.cache.clear();
  }
}
