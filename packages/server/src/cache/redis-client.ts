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
  /** Redis TCP connect timeout in milliseconds. */
  connectTimeoutMs?: number;
}

export class RedisNarrationCache implements NarrationCache {
  private readonly client: Redis;
  private readonly keyPrefix: string;
  private readonly silent: boolean;
  private readonly connectTimeoutMs: number;
  private _connected = false;
  private backgroundConnectStarted = false;

  constructor(config: RedisNarrationCacheConfig) {
    this.keyPrefix = config.keyPrefix ?? 'narration:';
    this.silent = config.silent ?? false;
    this.connectTimeoutMs = config.connectTimeoutMs ?? 1000;

    this.client = new Redis(config.url, {
      connectTimeout: this.connectTimeoutMs,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        return Math.min(250 * 2 ** Math.min(times, 5), 5000);
      },
      lazyConnect: true,
    });

    this.client.on('ready', () => {
      this._connected = true;
      if (!this.silent) {
        console.log('[RedisCache] Connected');
      }
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

    this.client.on('reconnecting', () => {
      this._connected = false;
    });
  }

  /** Attempt to connect, time-bounded so callers never wedge startup. */
  async connect(timeoutMs = this.connectTimeoutMs): Promise<boolean> {
    if (this.client.status === 'ready') {
      this._connected = true;
      return true;
    }

    try {
      const connectPromise = this.client.connect().catch((err) => {
        this._connected = false;
        throw err;
      });
      await withTimeout(connectPromise, timeoutMs);
      this._connected = true;
      return true;
    } catch {
      this._connected = false;
      return false;
    }
  }

  /** Start Redis connection/reconnect in the background without blocking boot. */
  startBackgroundConnect(): void {
    if (this.backgroundConnectStarted) return;
    this.backgroundConnectStarted = true;

    void this.connect().then((connected) => {
      if (connected) {
        if (!this.silent) console.log('[RedisCache] Background connection ready');
      } else if (!this.silent) {
        console.warn('[RedisCache] Redis not ready yet — retrying in background');
      }
    });
  }

  get connected(): boolean {
    return this._connected;
  }

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await withTimeout(this.client.get(this.keyPrefix + key), 250);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    if (!this.connected) return;
    try {
      const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      await withTimeout(this.client.set(this.keyPrefix + key, value, 'EX', ttlSeconds), 250);
    } catch {
      // Swallow — cache set failure is non-fatal
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await withTimeout(this.client.del(this.keyPrefix + key), 250);
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Redis operation timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
