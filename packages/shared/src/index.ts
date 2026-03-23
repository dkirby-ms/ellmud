/**
 * @ellmud/shared — Message protocol and shared types.
 *
 * ARCHITECTURAL CONSTRAINT: The client is a dumb terminal.
 * All communication between server and client uses these message types ONLY.
 * NO Colyseus Schema state is ever synced to the client.
 */

// ─── Client → Server Messages ────────────────────────────────────────────────

/** Client → Server: Player command input (verb-noun parsed client-side or raw). */
export interface CommandMessage {
  verb: string;
  args: string[];
}

// ─── Server → Client Messages ────────────────────────────────────────────────

/** The narration channel types the client can receive. */
export type NarrationType =
  | 'room'       // Room descriptions, look output
  | 'combat'     // Combat tick results
  | 'system'     // System messages (join, disconnect, errors)
  | 'speech'     // Player/NPC speech, proximity chat
  | 'sound'      // Sound propagation cues
  | 'trace';     // Footprints, blood trails, environmental traces

/** Server → Client: Narrated prose output. */
export interface NarrateMessage {
  text: string;
  type: NarrationType;
  timestamp: number;
  /** Optional combat metadata for colored message rendering. */
  combatEvent?: {
    eventType: 'strike' | 'dodge' | 'flee' | 'defeated' | 'combat_end';
    actorId?: string;
    targetId?: string;
  };
}

/** Server → Client: Room header metadata (displayed separately from prose). */
export interface RoomHeaderMessage {
  roomName: string;
  exits: string[];
  stability: number; // 0–1, shard stability
}

/** Server → Client: Shard lifecycle state change notification. */
export interface ShardStateMessage {
  state: ShardState;
  collapseTimer?: number; // seconds remaining, if applicable
}

// ─── Shard Lifecycle ─────────────────────────────────────────────────────────

/** Shard lifecycle states (GDD §2.3). */
export type ShardState =
  | 'seeding'        // Room graph generation, creature spawning
  | 'open'           // Entry points active, players may join
  | 'active'         // Full exploration, combat, extraction
  | 'destabilising'  // Final 25% — hazards intensify
  | 'collapse';      // Shard destroyed, items lost

// ─── Combat Actions (GDD §6.2) ──────────────────────────────────────────────

/** Actions a combatant can take per tick. */
export type CombatAction =
  | 'strike'
  | 'heavy_strike'
  | 'dodge'
  | 'block'
  | 'use_item'
  | 'skill'
  | 'flee'
  | 'observe';

// ─── Biomes (GDD §10.2) ─────────────────────────────────────────────────────

export type BiomeType =
  | 'flooded_crypt'
  | 'shattered_bastion'
  | 'fungal_deep'
  | 'ashen_reach'
  | 'void_rift';

// ─── Gear & Loot (GDD §9) ───────────────────────────────────────────────────

/** Gear quality tiers, ascending. */
export type GearTier =
  | 'scrap'
  | 'common'
  | 'sturdy'
  | 'refined'
  | 'masterwork'
  | 'anomalous';

// ─── Shard Tiers (GDD §10.1) ────────────────────────────────────────────────

export type ShardTier = 1 | 2 | 3;

// ─── Shard Modifiers (GDD §10.3) ────────────────────────────────────────────

export type ShardModifier =
  | 'darkness'
  | 'hunted'
  | 'silent'
  | 'echoing'
  | 'bountiful';

// ─── Combat Result Messages (GDD §6) ────────────────────────────────────────

/** Server → Client: Structured combat tick results. */
export interface CombatResultMessage {
  tick: number;
  encounterId: string;
  results: Array<{
    actorId: string;
    actorName: string;
    action: CombatAction;
    targetId?: string;
    targetName?: string;
    damage?: number;
    newHp?: number;
    maxHp?: number;
  }>;
  combatEnded: boolean;
}

// ─── Message Type Keys ──────────────────────────────────────────────────────

/**
 * Wire-level message type identifiers used with Colyseus room.send() / onMessage().
 * Defined once here so server and client never drift.
 */
export const MessageTypes = {
  // Client → Server
  COMMAND: 'cmd',

  // Server → Client
  NARRATE: 'narrate',
  ROOM_HEADER: 'room_header',
  SHARD_STATE: 'shard_state',
  COMBAT_RESULT: 'combat_result',
  EXTRACTION_STATE: 'extraction_state',
  STASH_UPDATE: 'stash_update',
  ROOM_SWITCH: 'room_switch',
} as const;

export type MessageTypeKey = typeof MessageTypes[keyof typeof MessageTypes];

// ─── Room Graph (GDD §10.1) ─────────────────────────────────────────────────

export type {
  Direction,
  RoomType,
  HazardPlaceholder,
  LootContainer,
  Room,
  RoomGraph,
  SerializedRoom,
  SerializedRoomGraph,
} from './room-graph.js';

export {
  ALL_DIRECTIONS,
  OPPOSITE_DIRECTION,
  serializeRoomGraph,
  deserializeRoomGraph,
} from './room-graph.js';

// ─── Narrative Types (GDD §4) ────────────────────────────────────────────────

export type {
  LLMNarrationType,
  NarrationItem,
  NarrationCreature,
  NarrationTrace,
  NarrationRoom,
  NarrationPlayer,
  NarrationEvent,
  NarrativeDirectives,
  NarrationContext,
  NarrationTimeoutConfig,
  NarrationModelConfig,
  NarrationConfig,
  NarrationTelemetry,
} from './narrative-types.js';

export { DEFAULT_NARRATION_CONFIG } from './narrative-types.js';

// ─── Stash Types (GDD §7.3) ─────────────────────────────────────────────────

export type {
  StashItemType,
  StashItem,
  StashItemInstance,
} from './types/stash.js';

// ─── Item System (GDD §7.2, §7.3) ────────────────────────────────────────────

export type {
  ItemType,
  WeaponStats,
  ArmourStats,
  ConsumableStats,
  ItemStats,
  RarityConfig,
  ItemDefinition,
  ItemInstance,
  Loadout,
  LoadoutValidationResult,
} from './items.js';

export {
  RARITY_TIERS,
  GEAR_TIER_ORDER,
  getRarityConfig,
  compareTiers,
  computeEffectiveStats,
  computeMaxDurability,
  createItemInstance,
  depleteDurability,
  isBroken,
  MAX_LOADOUT_WEIGHT,
  MAX_CONSUMABLE_SLOTS,
  getItemWeight,
  calculateLoadoutWeight,
  validateLoadout,
} from './items.js';


// ─── Shard Card Types (Shardboard UI) ────────────────────────────────────────

export type { ShardKeyType, ShardCardData } from './shard-card.js';

// ─── Room Switching (GDD §3 — Refuge ↔ Shard) ────────────────────────────────

/** Options for joining a target room. */
export interface RoomSwitchOptions {
  /** Join a specific room instance by ID (used for shard selection). */
  roomId?: string;
  /** Optional shard metadata for UI or future matchmaking. */
  biome?: BiomeType;
  tier?: ShardTier;
}

/** Server → Client: Instruct client to switch rooms. */
export interface RoomSwitchMessage {
  target: string;       // Colyseus room name to join (e.g. 'shard', 'refuge')
  options?: RoomSwitchOptions; // Additional join options for the target room
  reason: string;       // Human-readable reason for the switch
}

// ─── Trace System (GDD §11.2) ─────────────────────────────────────────────

/** Types of environmental traces left by player/creature actions. */
export type TraceType =
  | 'footprint'
  | 'blood_trail'
  | 'opened_container'
  | 'broken_door'
  | 'corpse'
  | 'discarded_item'
  | 'residue';

/** Default TTLs per trace type (seconds). Infinity = permanent for shard lifetime. */
export const TRACE_TTLS: Record<TraceType, number> = {
  footprint: 300,
  blood_trail: 600,
  opened_container: Infinity,
  broken_door: Infinity,
  corpse: Infinity,
  discarded_item: Infinity,
  residue: 120,
};

/** An ephemeral trace left in a shard room. */
export interface Trace {
  id: string;
  type: TraceType;
  roomId: string;
  createdAt: number;
  ttl: number;
  direction?: string;
  metadata: {
    actorId?: string;
    actorName?: string;
    severity?: number;
    stealthModifier?: number;
    description?: string;
  };
}

/** Tracking skill thresholds for trace detail levels. */
export const TRACKING_THRESHOLDS = {
  NONE: 0,
  BASIC: 10,
  DETAILED: 50,
  EXPERT: 80,
} as const;

/** Stealth threshold: damage below this leaves no blood trail. */
export const BLOOD_TRAIL_DAMAGE_THRESHOLD = 5;

/** Stealth modifier above this suppresses footprint traces entirely. */
export const STEALTH_FOOTPRINT_THRESHOLD = 80;

// ─── Extraction Types (GDD §3 step 6) ────────────────────────────────────────

/** Server → Client: Extraction channel state update. */
export interface ExtractionMessage {
  playerId: string;
  state: 'started' | 'progress' | 'completed' | 'interrupted' | 'death';
  ticksRemaining?: number;
  totalTicks?: number;
  narration: string;
  timestamp: number;
}
