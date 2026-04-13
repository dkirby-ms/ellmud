/**
 * @ellmud/shared — Message protocol and shared types.
 *
 * ARCHITECTURAL CONSTRAINT: The client is a dumb terminal.
 * All communication between server and client uses these message types ONLY.
 * NO Colyseus Schema state is ever synced to the client.
 */

// ─── User Roles ──────────────────────────────────────────────────────────────

/** Valid user roles ordered by privilege (lowest → highest). */
export const VALID_ROLES = ['player', 'content-dev', 'admin'] as const;
export type UserRole = typeof VALID_ROLES[number];

/**
 * Role hierarchy — numeric weight for comparison.
 * Higher value = more privilege.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  player: 0,
  'content-dev': 1,
  admin: 2,
} as const;

/** Check whether `role` meets or exceeds the `required` privilege level. */
export function hasMinRole(role: UserRole, required: UserRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[required];
}

/** Type guard — narrowing a raw string to UserRole. */
export function isValidRole(role: string): role is UserRole {
  return (VALID_ROLES as readonly string[]).includes(role);
}

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

/** Combat signal classification (GDD §6.6). */
export type SignalClass =
  | 'player_action'
  | 'enemy_action'
  | 'environmental'
  | 'status_effect'
  | 'system';

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
    /** Signal class for visual treatment (GDD §6.6) */
    signalClass?: SignalClass;
    /** Optional inline icon prefix (GDD §6.6) */
    icon?: string;
  };
}

/** Server → Client: Room header metadata (displayed separately from prose). */
export interface RoomHeaderMessage {
  roomName: string;
  exits: string[];
  stability: number; // 0–1, zone stability (always 1.0, kept for client compat)
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

/** Server → Client: Zone lifecycle state change notification. */
export interface ZoneStateMessage {
  state: ZoneState;
}

// ─── Zone Lifecycle ─────────────────────────────────────────────────────────

/** Zone lifecycle states. Zones are persistent MUD-style: always 'open'. */
export type ZoneState = 'open';

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

// ─── Character Posture (#371) ────────────────────────────────────────────────

/** Physical posture states a character can be in. */
export type Posture =
  | 'standing'
  | 'sitting'
  | 'crouching'
  | 'prone'
  | 'reclining'
  | 'floating'
  | 'hovering';

/** All valid posture values. */
export const VALID_POSTURES: readonly Posture[] = [
  'standing', 'sitting', 'crouching', 'prone', 'reclining', 'floating', 'hovering',
] as const;

/** Postures that players can set via commands. */
export const PLAYER_SETTABLE_POSTURES: readonly Posture[] = [
  'standing', 'sitting', 'crouching', 'prone', 'reclining',
] as const;

/** Default posture for new/reset characters. */
export const DEFAULT_POSTURE: Posture = 'standing';

/** Movement verb used when departing a room, keyed by current posture. */
export const POSTURE_MOVEMENT_VERBS: Record<Posture, string> = {
  standing: 'walks',
  sitting: 'stands up and walks',
  crouching: 'sneaks',
  prone: 'crawls',
  reclining: 'gets up and walks',
  floating: 'floats',
  hovering: 'drifts',
};

/** Description of a character's posture for room display. */
export const POSTURE_ROOM_DESCRIPTIONS: Record<Posture, string> = {
  standing: 'is standing here',
  sitting: 'is sitting here',
  crouching: 'is crouching here',
  prone: 'is lying prone here',
  reclining: 'is reclining here',
  floating: 'is floating here',
  hovering: 'is hovering here',
};

/** Type guard — narrowing a raw string to Posture. */
export function isValidPosture(value: string): value is Posture {
  return (VALID_POSTURES as readonly string[]).includes(value);
}

// ─── Room Positioning (GDD §6.11) ──────────────────────────────────────────

/** Spatial position zones in combat (GDD §6.11). */
export type PositionZone = 'front' | 'flank' | 'rear';

/** Creature position behavior types (GDD §6.11). */
export type CreaturePositionType = 'melee' | 'ranged' | 'skirmisher' | 'boss';

// ─── Gear & Loot (GDD §9) ───────────────────────────────────────────────────

/** Gear quality tiers, ascending. */
export type GearTier =
  | 'scrap'
  | 'common'
  | 'sturdy'
  | 'refined'
  | 'masterwork'
  | 'anomalous';

// ─── Room Illumination (Issue #402) ─────────────────────────────────────────

/** Room-level illumination state. Extensible for future values (dim, magical_darkness). */
export type Illumination = 'lit' | 'dark';

/** Darkness message shown when a player cannot see in a dark room. */
export const DARKNESS_MESSAGE = "It is pitch black. You can't see a thing.";

// ─── Zone Tiers (GDD §10.1) ────────────────────────────────────────────────

export type ZoneTier = 1 | 2 | 3;

// ─── Zone Modifiers (GDD §10.3) ────────────────────────────────────────────

export type ZoneModifier =
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
  posture: Posture;
}

/** Server → Client: Enemy telegraph broadcast (GDD §6.5). */
export interface TelegraphMessage {
  creatureId: string;
  creatureName: string;
  abilityName: string;
  remainingTicks: number;
  targetId: string;
  telegraphText: string;
}

// ─── Character Types (GDD §7.1) ──────────────────────────────────────────────

/** Summary of a character for list/select screens. */
export interface CharacterSummary {
  id: string;
  name: string;
  startingZoneSlug: string;
  startingZoneName: string;
  factionSlug: string | null;
  factionName: string | null;
  isActive: boolean;
  createdAt: string;
  lastPlayedAt: string | null;
  topSkills: Array<{ name: string; level: number }>;
  totalRuns: number;
}

/** Client → Server: Create a new character. */
export interface CreateCharacterRequest {
  name: string;
  startingZoneSlug: string;
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
  TOGGLE_FLAG: 'toggle_flag',

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
  ZONE_STATE: 'zone_state',
  COMBAT_RESULT: 'combat_result',
  PLAYER_STATE: 'player_state',
  TELEGRAPH: 'telegraph',
  OVERLAY_STATE: 'overlay_state',
  STASH_UPDATE: 'stash_update',
  LOADOUT_UPDATE: 'loadout_update',
  INVENTORY_UPDATE: 'inventory_update',
  ROOM_SWITCH: 'room_switch',
  ZONE_TRANSFER: 'zone_transfer',
  EXPLORATION_DATA: 'exploration_data',
  EXPLORATION_UPDATE: 'exploration_update',
  ROOM_OCCUPANTS: 'room_occupants',
  FLAG_STATE: 'flag_state',

  // Client → Server: who list
  REQUEST_PLAYER_LIST: 'request_player_list',
  // Server → Client: who list response
  PLAYER_LIST: 'player_list',

  // Server → Client: structured help data (rendered in modal)
  HELP_DATA: 'help_data',
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
    disconnected?: boolean;
  }>;
}

// ─── Room Graph (GDD §10.1) ─────────────────────────────────────────────────

export type {
  Direction,
  RoomType,
  FeatureRoomType,
  RoomProperty,
  HazardPlaceholder,
  StartingItem,
  LootContainer,
  RoomFeature,
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
  ContainerProperties,
  ContainerSlotEntry,
  ContainerOperationResult,
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
  getContainerContentsWeight,
  getContainerTotalWeight,
  getContainerSlotCount,
  addItemToContainer,
  removeItemFromContainer,
  calculateCarryBonus,
} from './items.js';


// ─── Zone Card Types (Expedition Board UI) ──────────────────────────────────

export type { ZoneKeyType, ZoneCardData } from './zone-card.js';

// ─── Room Switching (GDD §3 — Refuge ↔ Zone) ────────────────────────────────

/** Options for joining a target room. */
export interface RoomSwitchOptions {
  /** Join a specific room instance by ID (used for zone selection). */
  roomId?: string;
  /** Optional zone metadata for UI or future matchmaking. */
  tier?: ZoneTier;
  /** Target a specific room within the zone on join (e.g. inn room on death respawn). */
  targetRoomSlug?: string;
}

/** Server → Client: Instruct client to switch rooms. */
export interface RoomSwitchMessage {
  target: string;       // Colyseus room name to join (e.g. 'zone', 'refuge')
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

/** Default TTLs per trace type (seconds). Infinity = permanent for zone lifetime. */
export const TRACE_TTLS: Record<TraceType, number> = {
  footprint: 300,
  blood_trail: 600,
  opened_container: Infinity,
  broken_door: Infinity,
  corpse: Infinity,
  discarded_item: Infinity,
  residue: 120,
};

/** An ephemeral trace left in a zone room. */
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
  state: 'death' | 'downed' | 'stabilized' | 'bleed_out' | 'permadeath';
  narration: string;
  timestamp: number;
  /** Optional stats for permadeath screen (only populated when state is 'permadeath'). */
  permadeathStats?: {
    characterName: string;
    level: number;
    totalKills: number;
    totalDeaths: number;
    survivedSeconds: number;
    causeOfDeath: string;
    zoneOfDeath: string;
  };
}

// ─── Downing & Death Penalty Types (GDD §6.5) ──────────────────────────────

/** Player status in the downing lifecycle. */
export type PlayerVitalStatus = 'alive' | 'downed' | 'stabilized' | 'dead';

/** Death penalty debuff summary sent to the client. */
export interface DeathPenaltyInfo {
  /** Number of recent deaths contributing to penalty. */
  deathCount: number;
  /** Stat penalty as percentage (0–50). */
  penaltyPercent: number;
  /** Whether death penalty is currently active. */
  active: boolean;
}

/** Default death penalty parameters (GDD §6.5). */
export const DEATH_PENALTY_DEFAULTS = {
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

/** Server → Client: Current inventory contents after any change. */
export interface InventoryUpdateMessage {
  items: Array<{ id: string; name: string; weight: number; tier: string }>;
  currentWeight: number;
  maxWeight: number;
}

// ─── Character System (Character Selection & Management) ─────────────────────

/** Summary of a character for the selection screen. */
export interface CharacterSummary {
  id: string;
  name: string;
  startingZoneSlug: string;
  startingZoneName: string;
  factionSlug: string | null;
  factionName: string | null;
  isActive: boolean;
  createdAt: string;
  lastPlayedAt: string | null;
  topSkills: Array<{ name: string; level: number }>;
  totalRuns: number;
}

/** Client → Server: Create a new character. */
export interface CreateCharacterRequest {
  name: string;
  startingZoneSlug: string;
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

// ─── Admin API Types (Issue #344: Live Rooms) ────────────────────────────────

/** Request body for POST /admin/api/rooms/:roomId/broadcast */
export interface AdminBroadcastRequest {
  targetRoomId: string;
  message: string;
  type?: 'system' | 'admin';
}

/** Response for POST /admin/api/rooms/:roomId/broadcast */
export interface AdminBroadcastResponse {
  success: boolean;
  message: string;
}

/** Request body for POST /admin/api/rooms/:roomId/teleport */
export interface AdminTeleportRequest {
  sessionId: string;
  targetRoomId: string;
  notify?: boolean;
}

/** Response for POST /admin/api/rooms/:roomId/teleport */
export interface AdminTeleportResponse {
  success: boolean;
  message: string;
}

/** Request body for POST /admin/api/rooms/:roomId/spawn-creature */
export interface AdminSpawnCreatureRequest {
  templateId: string;
  targetRoomId: string;
}

/** Response for POST /admin/api/rooms/:roomId/spawn-creature */
export interface AdminSpawnCreatureResponse {
  success: boolean;
  creatureId: string;
  creatureName: string;
  spawnRoomId: string;
  message: string;
}

/** A single zone room with live occupancy info. */
export interface AdminLiveRoomInfo {
  roomId: string;
  roomName: string;
  roomType: string;
  playerCount: number;
  creatureCount: number;
  players: Array<{ sessionId: string; characterName?: string }>;
  creatures: Array<{ id: string; name: string; hp: number; maxHp: number }>;
}

/** Response for GET /admin/api/rooms/live */
export interface AdminLiveRoomsResponse {
  rooms: AdminLiveRoomInfo[];
  totalPlayers: number;
  totalCreatures: number;
}

// ─── User Flags ──────────────────────────────────────────────────────────────

/** Flag types that players can toggle on their character. */
export type UserFlagType = 'anon' | 'rp';

/** Client → Server: toggle a character flag. */
export interface ToggleFlagMessage {
  flag: UserFlagType;
  enabled: boolean;
}

/** Server → Client: current flag state for the active character. */
export interface FlagStateMessage {
  flags: Record<UserFlagType, boolean>;
}

// ─── Who List (Issue #366) ───────────────────────────────────────────────────

/** A single entry in the server-wide who list. */
export interface PlayerListEntry {
  name: string;
  level: number | null;
  class: string | null;
  zone: string | null;
  flags: UserFlagType[];
  /** true when the player has [Anon] active (hidden fields are already nulled) */
  anon: boolean;
  /** Current character posture (#371). */
  posture?: Posture;
}

/** Server → Client: who list response. */
export interface PlayerListMessage {
  players: PlayerListEntry[];
}

// ─── Help Data (modal rendering) ─────────────────────────────────────────────

/** A single command's help entry, sent as structured data for modal rendering. */
export interface HelpCommandEntry {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  category: string;
}

/** Server → Client: structured help data for the help modal. */
export interface HelpDataMessage {
  /** All available commands grouped by category. */
  commands: HelpCommandEntry[];
  /** If present, the player asked for help on a specific command. */
  focusCommand?: string;
}

// ─── Character Flags (Issue #365) ────────────────────────────────────────────

/** Per-character display flags. All flags default to false unless noted. */
export interface CharacterFlags {
  /** Hide name/level/class from other players (except same-room and admins). */
  anon: boolean;
  /** Mark this character as roleplaying — always visible to everyone. */
  rp: boolean;
  /** Allow other players to follow this character. Default: true. */
  allowFollowing: boolean;
}

/** Default flag values for new characters. */
export const DEFAULT_CHARACTER_FLAGS: CharacterFlags = {
  anon: false,
  rp: false,
  allowFollowing: true,
};

/** Valid flag names (used for runtime validation). */
export type CharacterFlagName = keyof CharacterFlags;

/** Metadata for each supported flag. */
export interface FlagDefinition {
  name: CharacterFlagName;
  label: string;
  description: string;
}

/** Registry of all supported flags with display metadata. */
export const FLAG_DEFINITIONS: readonly FlagDefinition[] = [
  {
    name: 'anon',
    label: '[Anon]',
    description: 'Hide your identity from other players. Admins and players in the same room can still see you.',
  },
  {
    name: 'rp',
    label: '[RP]',
    description: 'Signal that you are roleplaying in-character.',
  },
  {
    name: 'allowFollowing',
    label: '[Follow]',
    description: 'Allow other players to follow you. Enabled by default.',
  },
] as const;

/** Check whether a string is a valid flag name. */
export function isValidFlagName(name: string): name is CharacterFlagName {
  return name === 'anon' || name === 'rp' || name === 'allowFollowing';
}
