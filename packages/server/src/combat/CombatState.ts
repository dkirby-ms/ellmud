/**
 * Combat state types — data model for all combat encounters.
 *
 * Combatant is a unified interface for players and creatures.
 * CombatEncounter groups combatants in a room-scoped fight.
 *
 * Phase 1 stat model: 8 stats shared between players and creatures.
 * Weapon-type skills replace single attack; shieldBlock replaces defence.
 * Agility removed — dodge stat handles all avoidance.
 */

import type { CombatAction, PositionZone } from '@ellmud/shared';

// ─── Weapon Types ───────────────────────────────────────────────────────────

/** Weapon categories that map to weapon skill stats. */
export type WeaponType = 'unarmed' | 'one_handed' | 'two_handed' | 'ranged';

// ─── Combat Stats ───────────────────────────────────────────────────────────

/**
 * Unified combat stats for both players and creatures (8 stats).
 * Weapon-type skills determine hit effectiveness with each weapon category.
 */
export interface CombatStats {
  maxHp: number;
  unarmed: number;
  oneHanded: number;
  twoHanded: number;
  ranged: number;
  shieldBlock: number;
  dodge: number;
  armour: number;
}

export const DEFAULT_PLAYER_STATS: CombatStats = {
  maxHp: 100,
  unarmed: 5,
  oneHanded: 5,
  twoHanded: 5,
  ranged: 5,
  shieldBlock: 5,
  dodge: 5,
  armour: 2,
};

// ─── Equipment Stat Extraction ──────────────────────────────────────────────

/** Bonuses contributed by equipped gear. */
export interface EquipmentBonuses {
  weaponSkill: WeaponType;
  weaponDamage: number;
  armour: number;
  shieldBlock: number;
}

/** Standardised shape for item_definitions.base_stats JSONB column. */
export interface ItemStats {
  weaponType?: WeaponType;
  weaponDamage?: number;
  armour?: number;
  shieldBlock?: number;
}

// ─── Combatant ──────────────────────────────────────────────────────────────

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  /** Runtime effective attack value (weapon skill + weapon damage for players, weapon skill for creatures). */
  attack: number;
  /** Flat damage reduction from armour (base + equipment). */
  armour: number;
  /** Shield block skill — determines block chance (binary: block nullifies attack). */
  shieldBlock: number;
  /** Dodge skill — determines dodge chance (passive avoidance). */
  dodge: number;
  /** Creature level — affects flee difficulty for players (GDD §6.2). */
  level: number;
  roomId: string;
  isPlayer: boolean;
  disconnected?: boolean;
  /** Current auto-attack target (GDD §6.1, §6.2). */
  currentTarget?: string;
  /** Stamina — consumed by abilities (GDD §6.3). */
  stamina?: number;
  /** Maximum stamina. */
  maxStamina?: number;
  /** Ability cooldowns — maps ability ID to remaining ticks (GDD §6.3). */
  abilityCooldowns?: Map<string, number>;
  /** Active telegraphed ability wind-up state (GDD §6.5). */
  windUp?: WindUpState;
  /** Spatial position in combat (GDD §6.11). */
  position: PositionZone;
  /** Reposition cooldown — ticks remaining before can reposition again (GDD §6.11). */
  positionCooldown: number;
  /** Auto-attack cooldown — ticks remaining before next auto-strike. */
  strikeCooldown: number;
}

// ─── Wind-Up State (GDD §6.5) ───────────────────────────────────────────────

export interface WindUpState {
  abilityId: string;
  abilityName: string;
  damage: number;
  remainingTicks: number;
  targetId: string;
  telegraphText: string;
}

export function createCombatant(
  id: string,
  name: string,
  roomId: string,
  isPlayer: boolean,
  opts?: {
    attack?: number;
    maxHp?: number;
    armour?: number;
    shieldBlock?: number;
    dodge?: number;
    level?: number;
  },
): Combatant {
  const maxHp = opts?.maxHp ?? DEFAULT_PLAYER_STATS.maxHp;
  return {
    id,
    name,
    hp: maxHp,
    maxHp,
    attack: opts?.attack ?? DEFAULT_PLAYER_STATS.unarmed,
    armour: opts?.armour ?? DEFAULT_PLAYER_STATS.armour,
    shieldBlock: opts?.shieldBlock ?? (isPlayer ? DEFAULT_PLAYER_STATS.shieldBlock : 0),
    dodge: opts?.dodge ?? DEFAULT_PLAYER_STATS.dodge,
    level: opts?.level ?? 1,
    roomId,
    isPlayer,
    stamina: isPlayer ? 100 : undefined,
    maxStamina: isPlayer ? 100 : undefined,
    abilityCooldowns: isPlayer ? new Map() : undefined,
    position: 'front',
    positionCooldown: 0,
    strikeCooldown: 0,
  };
}

// ─── Queued Actions ─────────────────────────────────────────────────────────

export interface QueuedAction {
  action: CombatAction;
  targetId?: string;
  fleeRoomId?: string;
  /** Ability ID for 'skill' actions (GDD §6.3). */
  abilityId?: string;
  /** Position change for repositioning actions (GDD §6.11). */
  newPosition?: PositionZone;
}

// ─── Combat Encounter ───────────────────────────────────────────────────────

export interface CombatEncounter {
  id: string;
  roomId: string;
  combatantIds: Set<string>;
  tickCount: number;
  ticksSinceLastStrike: number;
  /** Threat tables per creature — map of creature ID to ThreatTable (GDD §6.10). */
  threatTables?: Map<string, import('./ThreatTable.js').ThreatTable>;
}

// ─── Combat Events (output of tick resolution) ─────────────────────────────

export interface CombatEvent {
  type: 'strike' | 'dodge' | 'flee' | 'defeated' | 'combat_end';
  actorId: string;
  actorName: string;
  targetId?: string;
  targetName?: string;
  damage?: number;
  newHp?: number;
  maxHp?: number;
  narration: string;
  killerIds?: string[];
  /** True when the target successfully dodged the attack. */
  dodged?: boolean;
  /** True when the target's shield blocked the attack (binary nullification). */
  blocked?: boolean;
  /** Detailed damage pipeline breakdown — populated on strike events for observability. */
  breakdown?: import('./damage.js').DamageBreakdown;
  /** Room where this event occurred — used for room-scoped delivery. */
  roomId?: string;
}

export interface FleeResult {
  combatantId: string;
  combatantName: string;
  fromRoomId: string;
  toRoomId: string;
}

export interface TelegraphBroadcast {
  creatureId: string;
  creatureName: string;
  abilityName: string;
  remainingTicks: number;
  targetId: string;
  telegraphText: string;
}

export interface TickResult {
  events: CombatEvent[];
  fleeResults: FleeResult[];
  endedEncounterIds: string[];
  telegraphs?: TelegraphBroadcast[];
}

/** No-op tick result when there's no active combat. */
export const EMPTY_TICK_RESULT: TickResult = {
  events: [],
  fleeResults: [],
  endedEncounterIds: [],
  telegraphs: [],
};

/** Timeout in ticks (seconds) before combat ends with no strikes. */
export const COMBAT_TIMEOUT_TICKS = 10;

/** Base flee success chance (0.0-1.0) before skill/level modifiers (GDD §6.2). */
export const BASE_FLEE_CHANCE = 0.5;

/** Flee success bonus per dodge skill rank. */
export const FLEE_DODGE_BONUS_PER_RANK = 0.05;

/** Flee success penalty per creature level above player (GDD §6.2). */
export const FLEE_LEVEL_PENALTY = 0.05;

/** Repositioning cooldown in ticks (GDD §6.11). */
export const REPOSITION_COOLDOWN_TICKS = 3;

/** Ticks between auto-attacks — slows basic strike pacing for a deliberate feel. */
export const AUTO_ATTACK_COOLDOWN_TICKS = 1;

/** Flanking damage bonus when attacking from flank (GDD §6.11). */
export const FLANKING_DAMAGE_BONUS = 0.15;
