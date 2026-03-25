/**
 * Creature type definitions — data model for all shard creatures.
 *
 * Creatures are Combatants (same combat resolution as players).
 * Behavior state drives deterministic AI decisions each tick.
 */

import type { CombatStats } from '../combat/CombatState.js';

// ─── Creature Types ──────────────────────────────────────────────────────────

export type CreatureType = 'drowned_revenant';

// ─── Behavior States (GDD §6.6) ─────────────────────────────────────────────

export type BehaviorState = 'idle' | 'alert' | 'hostile' | 'fleeing';

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
}

// ─── Creature Instance ───────────────────────────────────────────────────────

export interface Creature {
  id: string;
  type: CreatureType;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defence: number;
  armour: number;
  /** Agility stat — scales dodge chance (GDD §6.4). Defaults to 0 for creatures. */
  agility?: number;
  /** Dodge skill rank — scales dodge chance (GDD §6.4). Defaults to 0 for creatures. */
  dodgeSkillRank?: number;
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
}

// ─── Creature Action Output ──────────────────────────────────────────────────

export type CreatureActionType = 'patrol_move' | 'alert_move' | 'combat_strike' | 'combat_dodge' | 'combat_flee' | 'idle';

export interface CreatureAction {
  type: CreatureActionType;
  creatureId: string;
  /** Target room for movement actions. */
  targetRoomId?: string;
  /** Target combatant for combat actions. */
  targetCombatantId?: string;
}
