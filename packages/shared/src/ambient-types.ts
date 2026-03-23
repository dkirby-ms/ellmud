/**
 * Ambient World Types — shared between server and client.
 *
 * GDD §2.1: The Refuge as a Living World
 * Weather, NPCs, faction events, wandering merchants.
 */

// ─── Weather ─────────────────────────────────────────────────────────────────

export type WeatherState = 'clear' | 'cloudy' | 'rain' | 'storm';

export type TimeOfDay = 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk' | 'night';

export interface WeatherSnapshot {
  weather: WeatherState;
  timeOfDay: TimeOfDay;
  ticksInState: number;
}

/** Valid state transitions for the weather machine. */
export const WEATHER_TRANSITIONS: Record<WeatherState, WeatherState[]> = {
  clear: ['clear', 'cloudy'],
  cloudy: ['cloudy', 'rain', 'clear'],
  rain: ['rain', 'storm', 'cloudy'],
  storm: ['storm', 'rain'],
};

/** Time-of-day cycle order. */
export const TIME_CYCLE: TimeOfDay[] = [
  'dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night',
];

/** Default ticks between weather transition checks. */
export const WEATHER_CHECK_INTERVAL = 60;

/** Default ticks per time-of-day period. */
export const TIME_PERIOD_TICKS = 120;

// ─── NPCs ────────────────────────────────────────────────────────────────────

export type NPCRole = 'merchant' | 'faction_rep' | 'refugee';

export interface NPCDefinition {
  id: string;
  name: string;
  role: NPCRole;
  /** Locations the NPC patrols through (room/area IDs). */
  patrolRoute: string[];
  /** Idle actions performed when stationary. */
  idleActions: string[];
  /** Ticks between patrol moves. */
  patrolInterval: number;
}

export interface NPCState {
  id: string;
  name: string;
  role: NPCRole;
  currentLocation: string;
  patrolIndex: number;
  idleTick: number;
  isPresent: boolean;
}

// ─── Faction Events ──────────────────────────────────────────────────────────

export type FactionId = 'ironhearth' | 'veilwalkers' | 'ashborn';

export interface FactionMilestone {
  factionId: FactionId;
  name: string;
  threshold: number;
  description: string;
  /** Whether this milestone has been reached. */
  reached: boolean;
}

export interface FactionEventDef {
  factionId: FactionId;
  milestone: string;
  narratives: string[];
}

// ─── Wandering Merchants ─────────────────────────────────────────────────────

export interface WanderingMerchantDef {
  id: string;
  name: string;
  /** Tick interval at which the merchant may appear. */
  arrivalInterval: number;
  /** Probability (0–1) of arrival each check. */
  arrivalChance: number;
  /** How long the merchant stays (ticks). */
  duration: number;
  /** Items offered — limited stock. */
  inventory: WanderingMerchantItem[];
  /** Narration on arrival. */
  arrivalNarrative: string;
  /** Narration on departure. */
  departureNarrative: string;
}

export interface WanderingMerchantItem {
  name: string;
  stock: number;
  description: string;
}

export interface WanderingMerchantState {
  id: string;
  name: string;
  isPresent: boolean;
  ticksRemaining: number;
  inventory: WanderingMerchantItem[];
}

// ─── Ambient Events ──────────────────────────────────────────────────────────

export type AmbientEventType =
  | 'weather_change'
  | 'time_change'
  | 'npc_movement'
  | 'npc_idle'
  | 'npc_arrival'
  | 'npc_departure'
  | 'faction_event'
  | 'merchant_arrival'
  | 'merchant_departure'
  | 'ambient_atmosphere';

export interface AmbientEvent {
  type: AmbientEventType;
  tick: number;
  narrative: string;
  /** Optional metadata for client rendering. */
  metadata?: Record<string, unknown>;
}
