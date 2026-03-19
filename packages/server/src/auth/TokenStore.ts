/**
 * TokenStore — Session token storage with TTL.
 *
 * Phase 1: In-memory Map with setTimeout-based expiry.
 * Phase 2+: Redis implementation (TTL via SETEX).
 */

export interface TokenData {
  playerId: string;
  username: string;
}

export interface TokenStore {
  set(token: string, data: TokenData, ttlSeconds: number): Promise<void>;
  get(token: string): Promise<TokenData | null>;
  delete(token: string): Promise<void>;
}

/**
 * In-memory token store with automatic TTL cleanup.
 * Suitable for single-process Phase 1 deployment.
 */
export class InMemoryTokenStore implements TokenStore {
  private store = new Map<string, TokenData>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  async set(token: string, data: TokenData, ttlSeconds: number): Promise<void> {
    // Clear any existing timer for this token
    const existing = this.timers.get(token);
    if (existing) clearTimeout(existing);

    this.store.set(token, data);

    const timer = setTimeout(() => {
      this.store.delete(token);
      this.timers.delete(token);
    }, ttlSeconds * 1000);

    // Don't hold the process open for cleanup timers
    if (timer.unref) timer.unref();
    this.timers.set(token, timer);
  }

  async get(token: string): Promise<TokenData | null> {
    return this.store.get(token) ?? null;
  }

  async delete(token: string): Promise<void> {
    this.store.delete(token);
    const timer = this.timers.get(token);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(token);
    }
  }

  /** Cleanup all timers — call on shutdown. */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.store.clear();
  }
}
