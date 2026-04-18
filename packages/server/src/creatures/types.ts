/**
 * Creature type definitions — data model for all zone creatures.
 *
 * Creatures are Combatants (same combat resolution as players).
 * Behavior state drives deterministic AI decisions each tick.
 */

import type { CombatStats } from '../combat/CombatState.js';
import type { CreaturePositionType } from '@ellmud/shared';

// ─── Creature Types ──────────────────────────────────────────────────────────

export type CreatureType =
  | 'drowned_revenant'
  | 'gutterspawn'
  | 'rubble_scavenger'
  | 'hollow_stalker'
  | 'the_collapsed_one'
  | 'city_dog'
  | 'pigeon_flock'
  | string;

// ─── Behavior States (GDD §6.6) ─────────────────────────────────────────────

export type BehaviorState = 'idle' | 'alert' | 'hostile' | 'fleeing';

// ─── Creature Abilities (GDD §6.5) ──────────────────────────────────────────

/** Telegraphed ability definition for creatures. */
export interface CreatureAbility {
  id: string;
  name: string;
  damage: number;
  windUpTicks: number;
  telegraphText: string;
}

// ─── Loot Table ──────────────────────────────────────────────────────────────

export interface LootEntry {
  itemId: string;
  name: string;
  weight: number;
  description: string;
  /** Probability weight (deterministic selection uses index, not random). */
  dropWeight: number;
}

// ─── Spawn Rules ─────────────────────────────────────────────────────────────

export interface SpawnRules {
  minCount: number;
  maxCount: number;
  /** Room types where this creature prefers to spawn. */
  preferredRoomTypes: string[];
  /** Room types where this creature must never spawn. */
  forbiddenRoomTypes: string[];
}

// ─── Assist Behavior ─────────────────────────────────────────────────────────

/** Assist behavior — how this creature responds when nearby allies are attacked. */
export interface CreatureAssistConfig {
  /** Assist mode:
   * - 'sameType': assist only creatures of the same type
   * - 'all': assist any creature attacked in the room
   * - 'groupTag': assist creatures sharing the same groupTag value
   */
  mode: 'sameType' | 'all' | 'groupTag';
  /** Tag for groupTag mode — creatures with matching tags assist each other. */
  groupTag?: string;
}

// ─── Creature Template ───────────────────────────────────────────────────────

export interface CreatureTemplate {
  type: CreatureType;
  name: string;
  stats: CombatStats;
  lootTable: LootEntry[];
  spawnRules: SpawnRules;
  /** Ticks to remain idle before moving (patrol timer). */
  idleTicksMin: number;
  idleTicksMax: number;
  /** HP percentage threshold to enter fleeing state. */
  fleeThreshold: number;
  /** Whether creature attacks players on sight. False = passive wildlife. */
  aggressive: boolean;
  /** Short atmospheric description shown when the creature is in a room. */
  roomDescription?: string;
  /** Telegraphed abilities available to this creature (GDD §6.5). */
  abilities?: CreatureAbility[];
  /** Position type for combat reachability (GDD §6.11). */
  positionType?: CreaturePositionType;
  /** Assist behavior config. If undefined, creature does NOT assist. */
  assist?: CreatureAssistConfig;
}

// ─── Creature Instance ───────────────────────────────────────────────────────

export interface Creature {
  id: string;
  type: CreatureType;
  name: string;
  hp: number;
  maxHp: number;
  /** Weapon skill stats — creatures use the same 4 weapon skills as players. */
  unarmed: number;
  oneHanded: number;
  twoHanded: number;
  ranged: number;
  armour: number;
  /** Dodge skill — passive avoidance chance. */
  dodge: number;
  /** Shield block skill — binary block chance. Defaults to 0 for most creatures. */
  shieldBlock: number;
  currentRoomId: string;
  behaviorState: BehaviorState;
  /** Ticks spent in current idle patrol position. */
  idleTicks: number;
  /** Max ticks before moving to next room (set from template range). */
  idleTicksTarget: number;
  /** Room ID the creature is alerted to (sound source). */
  alertTargetRoomId: string | null;
  lootTable: LootEntry[];
  isAlive: boolean;
  /** Whether creature attacks players on sight. False = passive wildlife. */
  aggressive: boolean;
  /** Short atmospheric description shown when the creature is in a room. */
  roomDescription?: string;
  /** Telegraphed abilities available to this creature (GDD §6.5). */
  abilities?: CreatureAbility[];
  /** Position type for combat reachability (GDD §6.11). */
  positionType?: CreaturePositionType;
  /** Whether this creature was spawned by the combat sandbox. */
  sandbox?: boolean;
  /** Assist behavior config (copied from template). */
  assist?: CreatureAssistConfig;
}

// ─── Creature Action Output ──────────────────────────────────────────────────

export type CreatureActionType = 'patrol_move' | 'alert_move' | 'combat_strike' | 'combat_dodge' | 'combat_flee' | 'combat_telegraph' | 'idle';

export interface CreatureAction {
  type: CreatureActionType;
  creatureId: string;
  /** Target room for movement actions. */
  targetRoomId?: string;
  /** Source room the creature moved from (set by CreatureManager.updateAll). */
  sourceRoomId?: string;
  /** Target combatant for combat actions. */
  targetCombatantId?: string;
  /** Ability ID for telegraph actions (GDD §6.5). */
  abilityId?: string;
}
