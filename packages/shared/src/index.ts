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
  | 'trace'      // Footprints, blood trails, environmental traces
  | 'awareness'  // Stealth detection, player presence cues
  | 'ambient';   // Ambient world events (weather, NPCs, faction)

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
  /** Zone name, present when the room is part of a hand-crafted zone. */
  zoneName?: string;
  /** Room type (entry, boss, etc.), present for zone rooms. */
  roomType?: string;
  /** Room slug identifier, present when dev mode is enabled. */
  roomSlug?: string;
}

/** Server → Client: Zone transfer instruction (inter-zone exit). */
export interface ZoneTransferMessage {
  targetZoneSlug: string;
  targetRoomSlug: string;
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
  | 'active'         // Full exploration, combat
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

/** Server → Client: Player state update (HP, stamina, status effects). */
export interface PlayerStateMessage {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  statusEffects: Array<{ id: string; name: string; remainingTicks: number }>;
}

// ─── Character Types (GDD §7.1) ──────────────────────────────────────────────

/** Summary of a character for list/select screens. */
export interface CharacterSummary {
  id: string;
  name: string;
  factionSlug: string;
  factionName: string;
  isActive: boolean;
  createdAt: string;
  lastPlayedAt: string | null;
  topSkills: Array<{ name: string; level: number }>;
  totalRuns: number;
}

/** Client → Server: Create a new character. */
export interface CreateCharacterRequest {
  name: string;
  factionSlug: string;
}

/** Client → Server: Select an existing character. */
export interface SelectCharacterRequest {
  characterId: string;
}

// ─── Character Name Validation ───────────────────────────────────────────────

const PROFANITY_BLOCKLIST = [
  'anal', 'anus', 'arse', 'ass', 'bastard', 'bitch', 'bollocks', 'cock',
  'crap', 'cunt', 'damn', 'dick', 'douche', 'fag', 'fuck', 'hell',
  'homo', 'jerk', 'knob', 'minge', 'niga', 'nigga', 'nigger', 'penis',
  'piss', 'prick', 'pube', 'pussy', 'queer', 'scum', 'shit', 'slag',
  'slut', 'smeg', 'spunk', 'tit', 'turd', 'twat', 'vagina', 'wank',
  'whore',
];

/**
 * Validate a character name. Rules:
 * - Alpha characters only (a-z, A-Z)
 * - 2–24 characters long
 * - First letter capitalized, rest lowercase
 * - No profanity
 */
export function validateCharacterName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }
  if (name.length < 2 || name.length > 24) {
    return { valid: false, error: 'Name must be between 2 and 24 characters' };
  }
  if (!/^[A-Za-z]+$/.test(name)) {
    return { valid: false, error: 'Name must contain only alphabetic characters' };
  }
  if (name[0] !== name[0].toUpperCase()) {
    return { valid: false, error: 'Name must start with a capital letter' };
  }
  if (name.length > 1 && name.slice(1) !== name.slice(1).toLowerCase()) {
    return { valid: false, error: 'Only the first letter should be capitalized' };
  }
  const lower = name.toLowerCase();
  for (const word of PROFANITY_BLOCKLIST) {
    if (lower.includes(word)) {
      return { valid: false, error: 'Name contains inappropriate language' };
    }
  }
  return { valid: true };
}

// ─── Message Type Keys ──────────────────────────────────────────────────────

/**
 * Wire-level message type identifiers used with Colyseus room.send() / onMessage().
 * Defined once here so server and client never drift.
 */
export const MessageTypes = {
  // Client → Server
  COMMAND: 'cmd',
  EQUIP_ITEM: 'equip_item',
  UNEQUIP_ITEM: 'unequip_item',
  SWAP_ITEM: 'swap_item',

  // Client ↔ Server: Character management
  CHARACTER_CREATE: 'character_create',
  CHARACTER_SELECT: 'character_select',
  CHARACTER_DELETE: 'character_delete',
  CHARACTER_LIST: 'character_list',
  CHARACTER_LIST_RESPONSE: 'character_list_response',
  CHARACTER_CREATED: 'character_created',
  CHARACTER_DELETED: 'character_deleted',
  CHARACTER_ERROR: 'character_error',

  // Server → Client
  NARRATE: 'narrate',
  ROOM_HEADER: 'room_header',
  SHARD_STATE: 'shard_state',
  COMBAT_RESULT: 'combat_result',
  PLAYER_STATE: 'player_state',
  OVERLAY_STATE: 'overlay_state',
  STASH_UPDATE: 'stash_update',
  LOADOUT_UPDATE: 'loadout_update',
  ROOM_SWITCH: 'room_switch',
  ZONE_TRANSFER: 'zone_transfer',
  EXPLORATION_DATA: 'exploration_data',
  EXPLORATION_UPDATE: 'exploration_update',
  ROOM_OCCUPANTS: 'room_occupants',
} as const;

export type MessageTypeKey = typeof MessageTypes[keyof typeof MessageTypes];

// ─── Exploration Map Messages ────────────────────────────────────────────────

/** A room the player has visited, for client-side map rendering. */
export interface ExploredRoomData {
  roomId: string;
  zoneSlug: string | null;
  visitedAt: string;
  roomName: string;
  roomType: string;
  exits: Record<string, string>;
}

/** Server → Client: Bulk exploration data sent on join. */
export interface ExplorationDataMessage {
  type: typeof MessageTypes.EXPLORATION_DATA;
  rooms: ExploredRoomData[];
  currentRoomId: string;
}

/** Server → Client: Single room update sent on room entry. */
export interface ExplorationUpdateMessage {
  type: typeof MessageTypes.EXPLORATION_UPDATE;
  room: ExploredRoomData;
}

export interface RoomOccupantsMessage {
  creatures: Array<{
    id: string;
    name: string;
    type: string;
    aggressive: boolean;
  }>;
  players: Array<{
    id: string;
    name: string;
  }>;
}

// ─── Room Graph (GDD §10.1) ─────────────────────────────────────────────────

export type {
  Direction,
  RoomType,
  FeatureRoomType,
  RoomProperty,
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
  isFeatureRoomType,
  getFeatureKey,
} from './room-graph.js';

// ─── Zone System (Hand-Crafted Authored Zones) ──────────────────────────────

export type {
  ZoneDefinition,
  ZoneRoomDefinition,
  ZoneExitDefinition,
  ZoneData,
} from './zone.js';

export {
  INTER_ZONE_PREFIX,
  makeInterZoneId,
  isInterZoneId,
  parseInterZoneId,
} from './zone.js';

// ─── Sound System (GDD §12) ──────────────────────────────────────────────────

/** Types of actions that generate noise. */
export type SoundType =
  | 'combat'
  | 'running'
  | 'walking'
  | 'striking_door'
  | 'explosion'
  | 'sneaking';

/** Noise values per action type (GDD §12.2). Scale: 0–10. */
export const NOISE_VALUES: Record<SoundType, number> = {
  combat: 5,
  running: 4,
  walking: 2,
  striking_door: 7,
  explosion: 9,
  sneaking: 1,
} as const;

/** Qualitative sound descriptions for narration. */
export const SOUND_DESCRIPTIONS: Record<SoundType, string> = {
  combat: 'a clash of metal',
  running: 'hurried footsteps',
  walking: 'soft footsteps',
  striking_door: 'a heavy impact against a door',
  explosion: 'a thunderous explosion',
  sneaking: 'a faint rustle',
} as const;

/** Base attenuation per room traversed. */
export const SOUND_ATTENUATION_PER_ROOM = 2;

/** A sound event received by a listener in a particular room. */
export interface SoundEvent {
  soundType: SoundType;
  /** Direction the sound came from, relative to the listener. */
  direction: string;
  /** Effective noise level after attenuation. */
  effectiveNoise: number;
  /** Human-readable description for narration. */
  description: string;
  /** Distance in rooms from the source. */
  distance: number;
}

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

// ─── Awareness & Stealth Detection (GDD §8.1) ──────────────────────────────

/**
 * Detection tiers returned by stealth-vs-awareness checks.
 * 'none'  — target is completely hidden (high stealth, low awareness)
 * 'vague' — observer senses something (moderate match)
 * 'full'  — target fully detected, equipment-based description provided
 */
export type DetectionTier = 'none' | 'vague' | 'full';

/**
 * Detection thresholds. detection_score = awareness - stealth.
 * score <= NONE_UPPER  → 'none'
 * VAGUE_LOWER <= score <= VAGUE_UPPER → 'vague'
 * score >= FULL_LOWER  → 'full'
 */
export const DETECTION_THRESHOLDS = {
  NONE_UPPER: 0,
  VAGUE_LOWER: 1,
  VAGUE_UPPER: 4,
  FULL_LOWER: 5,
} as const;

/** Describes equipment visible on a detected player. */
export interface VisibleEquipment {
  weapon?: string;
  armour?: string;
  tier?: string;
}

/** An awareness event delivered to an observer when a player enters/leaves a room. */
export interface AwarenessEvent {
  /** Session ID of the observer receiving this event. */
  observerId: string;
  /** Session ID of the detected (or undetected) player. */
  targetId: string;
  /** Detection result. */
  tier: DetectionTier;
  /** Narration text for the observer (empty string for 'none'). */
  message: string;
  /** Whether the target is arriving or departing. */
  direction: 'arrival' | 'departure';
}

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

// ─── Ambient World Types (GDD §2.1) ──────────────────────────────────────────

export type {
  WeatherState,
  TimeOfDay,
  WeatherSnapshot,
  NPCRole,
  NPCDefinition,
  NPCState,
  FactionId,
  FactionMilestone,
  FactionEventDef,
  WanderingMerchantDef,
  WanderingMerchantItem,
  WanderingMerchantState,
  AmbientEventType,
  AmbientEvent,
} from './ambient-types.js';

export {
  WEATHER_TRANSITIONS,
  TIME_CYCLE,
  WEATHER_CHECK_INTERVAL,
  TIME_PERIOD_TICKS,
} from './ambient-types.js';

// ─── Overlay State Types (death / downing UI) ────────────────────────────────

/** Server → Client: Player overlay state for death, downing, and stabilization UI. */
export interface OverlayMessage {
  playerId: string;
  state: 'death' | 'downed' | 'stabilized' | 'bleed_out';
  narration: string;
  timestamp: number;
}

// ─── Downing & Shard-Sickness Types (GDD §6.4) ──────────────────────────────

/** Player status in the downing lifecycle. */
export type PlayerVitalStatus = 'alive' | 'downed' | 'stabilized' | 'dead';

/** Shard-sickness debuff summary sent to the client. */
export interface ShardSicknessInfo {
  /** Number of recent deaths contributing to sickness. */
  deathCount: number;
  /** Stat penalty as percentage (0–50). */
  penaltyPercent: number;
  /** Whether shard-sickness is currently active. */
  active: boolean;
}

/** Default shard-sickness parameters (GDD §6.4). */
export const SHARD_SICKNESS_DEFAULTS = {
  durationMs: 120_000,
  attackPenalty: -5,
  defencePenalty: -3,
} as const;

/** Analytics event logged when a player kills another player. */
export interface PvPKillEvent {
  type: 'pvp_kill';
  killerId: string;
  victimId: string;
  victimName: string;
  roomId: string;
  timestamp: number;
}

// ─── Equipment Slot System (GDD §7.3) ───────────────────────────────────────

// Import ItemType for local use (re-exported above as type from items.ts)
import type { ItemType as _ItemType } from './items.js';

/** Named equipment slots on the character. */
export type EquipmentSlotType =
  | 'head'
  | 'chest'
  | 'legs'
  | 'feet'
  | 'hands'
  | 'weapon'
  | 'offhand'
  | 'ring1'
  | 'ring2'
  | 'amulet';

/** All slot IDs, ordered for consistent rendering. */
export const EQUIPMENT_SLOT_ORDER: readonly EquipmentSlotType[] = [
  'weapon', 'offhand',
  'head', 'chest', 'legs', 'feet', 'hands',
  'ring1', 'ring2', 'amulet',
] as const;

/** Human-readable labels for equipment slots. */
export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotType, string> = {
  head: 'Head',
  chest: 'Chest',
  legs: 'Legs',
  feet: 'Feet',
  hands: 'Hands',
  weapon: 'Weapon',
  offhand: 'Offhand',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  amulet: 'Amulet',
};

/** Which item types each slot accepts. */
export const SLOT_ACCEPTS: Record<EquipmentSlotType, readonly _ItemType[]> = {
  head: ['armour'],
  chest: ['armour'],
  legs: ['armour'],
  feet: ['armour'],
  hands: ['armour'],
  weapon: ['weapon'],
  offhand: ['weapon', 'tool'],
  ring1: ['material'],    // placeholder — ring type TBD
  ring2: ['material'],    // placeholder — ring type TBD
  amulet: ['material'],   // placeholder — amulet type TBD
};

/** Pre-resolved item data for UI display (server sends this). */
export interface DisplayItem {
  instanceId: string;
  definitionId: string;
  name: string;
  type: _ItemType;
  tier: GearTier;
  weight: number;
  description: string;
  /** Which slots this item can be equipped to. */
  allowedSlots: EquipmentSlotType[];
}

/** Full equipment state keyed by slot. */
export type EquipmentSlots = Record<EquipmentSlotType, DisplayItem | null>;

/** Creates an empty equipment slots object. */
export function createEmptyEquipmentSlots(): EquipmentSlots {
  return {
    head: null, chest: null, legs: null, feet: null, hands: null,
    weapon: null, offhand: null, ring1: null, ring2: null, amulet: null,
  };
}

// ─── Equipment Messages ──────────────────────────────────────────────────────

/** Client → Server: Equip an item from stash to a slot. */
export interface EquipItemMessage {
  itemId: string;
  targetSlot: EquipmentSlotType;
}

/** Client → Server: Unequip an item from a slot (returns to stash). */
export interface UnequipItemMessage {
  slot: EquipmentSlotType;
}

/** Server → Client: Full loadout state after any equipment change. */
export interface LoadoutUpdateMessage {
  slots: EquipmentSlots;
}

/** Client → Server: Swap an item from stash into an occupied slot. */
export interface SwapItemMessage {
  itemId: string;
  targetSlot: EquipmentSlotType;
}

/** Server → Client: Full stash contents after any change. */
export interface StashUpdateMessage {
  items: DisplayItem[];
}

// ─── Character System (Character Selection & Management) ─────────────────────

/** Summary of a character for the selection screen. */
export interface CharacterSummary {
  id: string;
  name: string;
  factionSlug: string;
  factionName: string;
  isActive: boolean;
  createdAt: string;
  lastPlayedAt: string | null;
  topSkills: Array<{ name: string; level: number }>;
  totalRuns: number;
}

/** Client → Server: Create a new character. */
export interface CreateCharacterRequest {
  name: string;
  factionSlug: string;
}

/** Client → Server: Select a character. */
export interface SelectCharacterRequest {
  characterId: string;
}

// ─── Slot Validation ─────────────────────────────────────────────────────────

/**
 * Check if an item type is valid for a given equipment slot.
 * Server-authoritative — used by LoadoutService and can be shared with client.
 */
export function validateSlotRestriction(
  slot: EquipmentSlotType,
  itemType: _ItemType,
): boolean {
  return SLOT_ACCEPTS[slot].includes(itemType);
}
