import { LocalPresence, type Presence } from '@colyseus/core';
import { Redis } from 'ioredis';

type PresenceWithShutdown = Presence & { shutdown?: () => void; setMaxListeners?: (n: number) => void };
type SubscriptionCallback = (...args: unknown[]) => unknown;
type RedisStatus = 'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'error';

const REDIS_CONNECT_TIMEOUT_MS = 1000;
const REDIS_OPERATION_TIMEOUT_MS = 250;

export class NonBlockingRedisPresence implements Presence {
  private readonly local = new LocalPresence();
  private readonly subscriptions = new Map<string, Set<SubscriptionCallback>>();
  private redis?: PresenceWithShutdown;
  private pub?: Redis;
  private sub?: Redis;
  private _status: RedisStatus = 'connecting';
  private replaying = false;

  constructor(private readonly connectionString: string) {}

  get status(): RedisStatus {
    return this._status;
  }

  start(): void {
    void this.initializeRedis();
  }

  async subscribe(topic: string, callback: SubscriptionCallback): Promise<this> {
    let callbacks = this.subscriptions.get(topic);
    if (!callbacks) {
      callbacks = new Set();
      this.subscriptions.set(topic, callbacks);
    }
    callbacks.add(callback);

    await this.local.subscribe(topic, callback);
    if (this.redisReady()) {
      await this.tryRedis((redis) => redis.subscribe(topic, callback));
    }
    return this;
  }

  async unsubscribe(topic: string, callback?: SubscriptionCallback): Promise<this> {
    if (callback) {
      this.subscriptions.get(topic)?.delete(callback);
    } else {
      this.subscriptions.delete(topic);
    }

    await this.local.unsubscribe(topic, callback);
    if (this.redisReady()) {
      await this.tryRedis((redis) => redis.unsubscribe(topic, callback));
    }
    return this;
  }

  async publish(topic: string, data?: unknown): Promise<this> {
    await this.local.publish(topic, data);
    if (this.redisReady()) {
      await this.tryRedis((redis) => redis.publish(topic, data));
    }
    return this;
  }

  channels(pattern?: string): Promise<string[]> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.channels(pattern), () => this.local.channels(pattern))
      : this.local.channels(pattern);
  }

  exists(key: string): Promise<boolean> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.exists(key), () => this.local.exists(key))
      : this.local.exists(key);
  }

  set(key: string, value: string): unknown {
    this.local.set(key, value);
    if (this.redisReady()) return this.tryRedis((redis) => redis.set(key, value));
  }

  setex(key: string, value: string, seconds: number): unknown {
    this.local.setex(key, value, seconds);
    if (this.redisReady()) return this.tryRedis((redis) => redis.setex(key, value, seconds));
  }

  expire(key: string, seconds: number): unknown {
    this.local.expire(key, seconds);
    if (this.redisReady()) return this.tryRedis((redis) => redis.expire(key, seconds));
  }

  get(key: string): unknown {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.get(key), () => Promise.resolve(this.local.get(key) ?? null))
      : this.local.get(key);
  }

  del(key: string): unknown {
    this.local.del(key);
    if (this.redisReady()) return this.tryRedis((redis) => redis.del(key));
  }

  sadd(key: string, value: string): unknown {
    this.local.sadd(key, value);
    if (this.redisReady()) return this.tryRedis((redis) => redis.sadd(key, value));
  }

  smembers(key: string): Promise<string[]> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.smembers(key), () => this.local.smembers(key))
      : this.local.smembers(key);
  }

  sismember(key: string, field: string): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.sismember(key, field), () => this.local.sismember(key, field))
      : this.local.sismember(key, field);
  }

  srem(key: string, value: string): unknown {
    this.local.srem(key, value);
    if (this.redisReady()) return this.tryRedis((redis) => redis.srem(key, value));
  }

  scard(key: string): number | Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.scard(key), () => Promise.resolve(this.local.scard(key)))
      : this.local.scard(key);
  }

  sinter(...keys: string[]): Promise<string[]> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.sinter(...keys), () => this.local.sinter(...keys))
      : this.local.sinter(...keys);
  }

  hset(key: string, field: string, value: string): Promise<boolean> {
    void this.local.hset(key, field, value);
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hset(key, field, value), () => this.local.hset(key, field, value))
      : this.local.hset(key, field, value);
  }

  hincrby(key: string, field: string, value: number): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hincrby(key, field, value), () => this.local.hincrby(key, field, value))
      : this.local.hincrby(key, field, value);
  }

  hincrbyex(key: string, field: string, value: number, expireInSeconds: number): Promise<number> {
    return this.redisReady()
      ? this.tryRedis(
        (redis) => redis.hincrbyex(key, field, value, expireInSeconds),
        () => this.local.hincrbyex(key, field, value, expireInSeconds),
      )
      : this.local.hincrbyex(key, field, value, expireInSeconds);
  }

  hget(key: string, field: string): Promise<string | null> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hget(key, field), () => this.local.hget(key, field))
      : this.local.hget(key, field);
  }

  hgetall(key: string): Promise<Record<string, string>> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hgetall(key), () => this.local.hgetall(key))
      : this.local.hgetall(key);
  }

  hdel(key: string, field: string): Promise<boolean> {
    void this.local.hdel(key, field);
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hdel(key, field), () => this.local.hdel(key, field))
      : this.local.hdel(key, field);
  }

  hlen(key: string): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.hlen(key), () => this.local.hlen(key))
      : this.local.hlen(key);
  }

  incr(key: string): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.incr(key), () => this.local.incr(key))
      : this.local.incr(key);
  }

  decr(key: string): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.decr(key), () => this.local.decr(key))
      : this.local.decr(key);
  }

  llen(key: string): Promise<number> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.llen(key), () => this.local.llen(key))
      : this.local.llen(key);
  }

  rpush(key: string, ...values: string[]): Promise<number> {
    void this.local.rpush(key, ...values);
    return this.redisReady()
      ? this.tryRedis((redis) => redis.rpush(key, ...values), () => this.local.rpush(key, ...values))
      : this.local.rpush(key, ...values);
  }

  lpush(key: string, ...values: string[]): Promise<number> {
    void this.local.lpush(key, ...values);
    return this.redisReady()
      ? this.tryRedis((redis) => redis.lpush(key, ...values), () => this.local.lpush(key, ...values))
      : this.local.lpush(key, ...values);
  }

  lpop(key: string): Promise<string | null> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.lpop(key), () => this.local.lpop(key))
      : this.local.lpop(key);
  }

  rpop(key: string): Promise<string | null> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.rpop(key), () => this.local.rpop(key))
      : this.local.rpop(key);
  }

  brpop(...args: [string, ...string[], number]): Promise<[string, string] | null> {
    return this.redisReady()
      ? this.tryRedis((redis) => redis.brpop(...args), () => this.local.brpop(...args))
      : this.local.brpop(...args);
  }

  setMaxListeners(number: number): void {
    this.local.setMaxListeners(number);
    this.redis?.setMaxListeners?.(number);
  }

  shutdown(): void {
    this._status = 'disabled';
    this.local.shutdown();
    this.pub?.disconnect();
    this.sub?.disconnect();
  }

  private async initializeRedis(): Promise<void> {
    try {
      const { RedisPresence } = await import('@colyseus/redis-presence');
      if (this._status === 'disabled') return;
      this.pub = new Redis(this.connectionString, redisClientOptions());
      this.pub.on('error', (err) => this.markRedisError(err));
      this.pub.on('ready', () => void this.markRedisReady());
      this.pub.on('reconnecting', () => { this._status = 'reconnecting'; });
      this.pub.on('close', () => {
        if (this._status !== 'disabled') this._status = 'reconnecting';
      });

      this.redis = new RedisPresence(this.pub) as PresenceWithShutdown;
      this.sub = (this.redis as unknown as { sub?: Redis }).sub;
      this.sub?.on('error', (err) => this.markRedisError(err));
      this.sub?.on('ready', () => void this.markRedisReady());
      this.sub?.on('reconnecting', () => { this._status = 'reconnecting'; });
      this.sub?.on('close', () => {
        if (this._status !== 'disabled') this._status = 'reconnecting';
      });

      void this.pub.connect().catch((err) => this.markRedisError(err));
      if (this.sub) void this.sub.connect().catch((err) => this.markRedisError(err));
    } catch (err) {
      this.markRedisError(err);
    }
  }

  private async markRedisReady(): Promise<void> {
    if (!this.pub || this.pub.status !== 'ready' || (this.sub && this.sub.status !== 'ready')) return;
    this._status = 'connected';
    await this.replaySubscriptions();
    console.log('[Presence] Redis presence connected');
  }

  private markRedisError(err: unknown): void {
    if (this._status === 'disabled') return;
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Connection is closed.') return;
    this._status = 'error';
    console.warn('[Presence] Redis presence not ready — using local presence until reconnect:', message);
  }

  private redisReady(): boolean {
    return this._status === 'connected' && !!this.redis;
  }

  private async replaySubscriptions(): Promise<void> {
    if (!this.redis || this.replaying) return;
    this.replaying = true;
    try {
      for (const [topic, callbacks] of this.subscriptions) {
        for (const callback of callbacks) {
          await this.tryRedis((redis) => redis.subscribe(topic, callback));
        }
      }
    } finally {
      this.replaying = false;
    }
  }

  private async tryRedis<T>(
    operation: (redis: Presence) => Promise<T> | T,
    fallback?: () => Promise<T> | T,
  ): Promise<T> {
    const redis = this.redis;
    try {
      if (!redis) throw new Error('Redis presence is not initialized');
      return await withTimeout(Promise.resolve(operation(redis)), REDIS_OPERATION_TIMEOUT_MS);
    } catch {
      this._status = 'reconnecting';
      if (fallback) return await fallback();
      return undefined as T;
    }
  }
}

function redisClientOptions() {
  return {
    lazyConnect: true,
    connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times: number) => Math.min(250 * 2 ** Math.min(times, 5), 5000),
  };
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
