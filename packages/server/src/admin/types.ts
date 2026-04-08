/**
 * Admin API response types.
 */

export interface AdminRoomSummary {
  roomId: string;
  name: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AdminCreatureInfo {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  currentRoomId: string;
  behaviorState: string;
  isAlive: boolean;
}

export interface AdminZoneDetail {
  roomId: string;
  name: string;
  clients: number;
  lifecycle: string;
  stability: number;
  collapseTimer: number;
  tick: number;
  playerCount: number;
  paused: boolean;
  players: AdminPlayerInfo[];
  creatures: AdminCreatureInfo[];
  /** Zone slug identifier, present when room is a hand-crafted zone instance. */
  zoneSlug?: string;
}

export interface AdminRefugeDetail {
  roomId: string;
  name: string;
  clients: number;
  tick: number;
  playerCount: number;
  paused: boolean;
}

export interface AdminPlayerInfo {
  sessionId: string;
  currentRoomId: string;
  inventoryCount: number;
  currentWeight: number;
  maxCarryWeight: number;
}

export interface AdminMetrics {
  uptime: number;
  timestamp: number;
  rooms: {
    total: number;
    zones: number;
    refuges: number;
    totalPlayers: number;
  };
  narration: {
    cache_hits: number;
    cache_misses: number;
    cache_hit_ratio: number;
    cache_size: number;
    llm_calls: number;
    llm_timeouts: number;
    fallback_uses: number;
    fallback_rate: number;
    avg_llm_latency_ms: number;
  };
  redis: {
    cache_backend: 'redis' | 'in-memory';
    presence_backend: 'redis' | 'local';
  };
  persistence: {
    stash_backend: 'postgresql' | 'in-memory';
  };
}

export interface AdminSSEEvent {
  type: 'rooms' | 'metrics' | 'zone_update';
  data: unknown;
}
