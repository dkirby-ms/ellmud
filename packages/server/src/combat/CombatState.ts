/**
 * Combat state types — data model for all combat encounters.
 *
 * Combatant is a unified interface for players and creatures.
 * CombatEncounter groups combatants in a room-scoped fight.
 */

import type { CombatAction } from '@ellmud/shared';

// ─── Combat Stats ───────────────────────────────────────────────────────────

export interface CombatStats {
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
  /** Agility stat — scales dodge chance (GDD §6.4). */
  agility: number;
}

export const DEFAULT_PLAYER_STATS: CombatStats = {
  maxHp: 100,
  attack: 10,
  defence: 5,
  armour: 2,
  agility: 5,
};

// ─── Combatant ──────────────────────────────────────────────────────────────

export interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
  /** Agility stat — scales dodge chance (GDD §6.4). */
  agility: number;
  /** Dodge skill rank — scales dodge chance (GDD §6.4). */
  dodgeSkillRank: number;
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
}

export function createCombatant(
  id: string,
  name: string,
  roomId: string,
  isPlayer: boolean,
  stats: CombatStats = DEFAULT_PLAYER_STATS,
  dodgeSkillRank = 0,
): Combatant {
  return {
    id,
    name,
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    defence: stats.defence,
    armour: stats.armour,
    agility: stats.agility,
    dodgeSkillRank,
    roomId,
    isPlayer,
    stamina: isPlayer ? 100 : undefined,
    maxStamina: isPlayer ? 100 : undefined,
    abilityCooldowns: isPlayer ? new Map() : undefined,
  };
}

// ─── Queued Actions ─────────────────────────────────────────────────────────

export interface QueuedAction {
  action: CombatAction;
  targetId?: string;
  fleeRoomId?: string;
  /** Ability ID for 'skill' actions (GDD §6.3). */
  abilityId?: string;
}

// ─── Combat Encounter ───────────────────────────────────────────────────────

export interface CombatEncounter {
  id: string;
  roomId: string;
  combatantIds: Set<string>;
  tickCount: number;
  ticksSinceLastStrike: number;
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
  /** True when the target successfully dodged the attack (GDD §6.4). */
  dodged?: boolean;
}

export interface FleeResult {
  combatantId: string;
  combatantName: string;
  fromRoomId: string;
  toRoomId: string;
}

export interface TickResult {
  events: CombatEvent[];
  fleeResults: FleeResult[];
  endedEncounterIds: string[];
}

/** No-op tick result when there's no active combat. */
export const EMPTY_TICK_RESULT: TickResult = {
  events: [],
  fleeResults: [],
  endedEncounterIds: [],
};

/** Timeout in ticks (seconds) before combat ends with no strikes. */
export const COMBAT_TIMEOUT_TICKS = 10;
