import { LocalDriver } from '@colyseus/core';
import type { IRoomCache, MatchMakerDriver, SortOptions } from '@colyseus/core/matchmaker/driver';
import { Redis } from 'ioredis';

type RedisStatus = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type RedisDriverLike = {
  has(roomId: string): Promise<boolean>;
  query(conditions?: Partial<IRoomCache>, sortOptions?: SortOptions): Promise<IRoomCache[]>;
  cleanup(processId: string): Promise<void>;
  findOne(conditions: Partial<IRoomCache>, sortOptions?: SortOptions): Promise<IRoomCache>;
  update(room: IRoomCache, operations: Partial<{ $set: Partial<IRoomCache>; $inc: Partial<IRoomCache> }>): Promise<boolean>;
  persist(room: IRoomCache, create?: boolean): Promise<boolean>;
  remove(roomId: string): Promise<boolean>;
  shutdown(): Promise<void>;
};

const REDIS_CONNECT_TIMEOUT_MS = 1000;
const REDIS_OPERATION_TIMEOUT_MS = 250;

export class NonBlockingRedisDriver implements MatchMakerDriver {
  private readonly local = new LocalDriver();
  private redis?: RedisDriverLike;
  private client?: Redis;
  private _status: RedisStatus = 'connecting';

  constructor(private readonly connectionString: string) {
  }

  get status(): RedisStatus {
    return this._status;
  }

  start(): void {
    void this.initializeRedis();
  }

  async has(roomId: string): Promise<boolean> {
    if (this.redisReady()) {
      return this.tryRedis((driver) => driver.has(roomId), () => Promise.resolve(this.local.has(roomId) as boolean));
    }
    return this.local.has(roomId) as boolean;
  }

  async query(conditions: Partial<IRoomCache> = {}, sortOptions?: SortOptions): Promise<IRoomCache[]> {
    if (this.redisReady()) {
      return this.tryRedis((driver) => driver.query(conditions, sortOptions), () => Promise.resolve(this.local.query(conditions, sortOptions)));
    }
    return this.local.query(conditions, sortOptions);
  }

  async cleanup(processId: string): Promise<void> {
    await Promise.resolve(this.local.cleanup(processId));
    if (this.redisReady()) {
      await this.tryRedis((driver) => driver.cleanup(processId));
    }
  }

  async findOne(conditions: Partial<IRoomCache>, sortOptions?: SortOptions): Promise<IRoomCache> {
    if (this.redisReady()) {
      return this.tryRedis((driver) => Promise.resolve(driver.findOne(conditions, sortOptions)), () => Promise.resolve(this.local.findOne(conditions, sortOptions)));
    }
    return this.local.findOne(conditions, sortOptions);
  }

  async update(room: IRoomCache, operations: Partial<{ $set: Partial<IRoomCache>; $inc: Partial<IRoomCache> }>): Promise<boolean> {
    const localResult = this.local.update(room, operations) as boolean;
    if (this.redisReady()) {
      await this.tryRedis((driver) => driver.update(room, operations));
    }
    return localResult;
  }

  async persist(room: IRoomCache, create = false): Promise<boolean> {
    const localResult = this.local.persist(room, create) as boolean;
    if (this.redisReady()) {
      await this.tryRedis((driver) => driver.persist(room, create));
    }
    return localResult;
  }

  async remove(roomId: string): Promise<boolean> {
    const localResult = this.local.remove(roomId) as boolean;
    if (this.redisReady()) {
      await this.tryRedis((driver) => driver.remove(roomId));
    }
    return localResult;
  }

  clear(): void {
    this.local.clear();
  }

  async shutdown(): Promise<void> {
    this._status = 'disabled';
    await Promise.resolve(this.local.shutdown());
    this.client?.disconnect();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const { RedisDriver } = await import('@colyseus/redis-driver');
      if (this._status === 'disabled') return;
      this.client = new Redis(this.connectionString, {
        lazyConnect: true,
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => Math.min(250 * 2 ** Math.min(times, 5), 5000),
      });
      this.client.on('error', (err) => this.markRedisError(err));
      this.client.on('ready', () => void this.markRedisReady());
      this.client.on('reconnecting', () => { this._status = 'reconnecting'; });
      this.client.on('close', () => {
        if (this._status !== 'disabled') this._status = 'reconnecting';
      });

      this.redis = new RedisDriver(this.client) as unknown as RedisDriverLike;
      void this.client.connect().catch((err) => this.markRedisError(err));
    } catch (err) {
      this.markRedisError(err);
    }
  }

  private async markRedisReady(): Promise<void> {
    if (!this.redis || this.client?.status !== 'ready') return;
    this._status = 'connected';
    await this.migrateLocalRooms();
    console.log('[Ellmud] Matchmaker driver Redis connected');
  }

  private markRedisError(err: unknown): void {
    if (this._status === 'disabled') return;
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Connection is closed.') return;
    this._status = 'error';
    console.warn('[Ellmud] Redis matchmaker driver not ready — using local driver until reconnect:', message);
  }

  private redisReady(): boolean {
    return this._status === 'connected' && !!this.redis;
  }

  private async migrateLocalRooms(): Promise<void> {
    const rooms = ((this.local as unknown as { rooms?: IRoomCache[] }).rooms ?? []);
    for (const room of rooms) {
      await this.tryRedis((driver) => driver.persist(room, true));
    }
  }

  private async tryRedis<T>(
    operation: (driver: RedisDriverLike) => Promise<T> | T,
    fallback?: () => Promise<T> | T,
  ): Promise<T> {
    const redis = this.redis;
    try {
      if (!redis) throw new Error('Redis driver is not initialized');
      return await withTimeout(Promise.resolve(operation(redis)), REDIS_OPERATION_TIMEOUT_MS);
    } catch {
      this._status = 'reconnecting';
      if (fallback) return await fallback();
      return undefined as T;
    }
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
