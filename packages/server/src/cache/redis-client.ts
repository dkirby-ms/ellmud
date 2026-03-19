/**
 * Redis-backed NarrationCache implementation.
 *
 * Uses ioredis for connection management. Implements the same NarrationCache
 * interface as InMemoryNarrationCache — drop-in replacement when Redis is
 * available. Falls back gracefully on connection errors (returns null / no-op).
 *
 * Key format: `narration:{sha256-hash}` — content-addressable via hasher.ts.
 */

import { Redis } from 'ioredis';
import type { NarrationCache } from '../narrative/cache.js';

export interface RedisNarrationCacheConfig {
  /** Redis connection URL, e.g. redis://localhost:6379 */
  url: string;
  /** Key prefix to namespace narration cache entries. */
  keyPrefix?: string;
  /** If true, suppress connection error logs (useful for tests). */
  silent?: boolean;
}

export class RedisNarrationCache implements NarrationCache {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private readonly silent: boolean;
  private _connected = false;

  constructor(config: RedisNarrationCacheConfig) {
    this.keyPrefix = config.keyPrefix ?? 'narration:';
    this.silent = config.silent ?? false;

    this.client = new Redis(config.url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this._connected = true;
    });

    this.client.on('error', (err: Error) => {
      this._connected = false;
      if (!this.silent) {
        console.error('[RedisCache] Connection error:', err.message);
      }
    });

    this.client.on('close', () => {
      this._connected = false;
    });
  }

  /** Attempt to connect. Returns true if successful. */
  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      this._connected = true;
      return true;
    } catch {
      this._connected = false;
      return false;
    }
  }

  get connected(): boolean {
    return this._connected;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(this.keyPrefix + key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    try {
      const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      await this.client.set(this.keyPrefix + key, value, 'EX', ttlSeconds);
    } catch {
      // Swallow — cache set failure is non-fatal
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.keyPrefix + key);
    } catch {
      // Swallow
    }
  }

  /** Gracefully close the Redis connection. */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      // Force disconnect on quit failure
      this.client.disconnect();
    }
    this._connected = false;
  }

  /** Expose underlying client for advanced operations (e.g. presence). */
  getClient(): Redis {
    return this.client;
  }
}
