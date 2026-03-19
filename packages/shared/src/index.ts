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
