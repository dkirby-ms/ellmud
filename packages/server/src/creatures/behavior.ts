/**
 * Creature behavior tree — deterministic AI decision-making (GDD §6.6).
 *
 * States: idle → alert → hostile → fleeing
 * All transitions are deterministic based on game state.
 * AI actions are resolved the same way as player actions.
 */

import type { Creature, CreatureAction, BehaviorState } from './types.js';

// ─── World State (subset needed for AI decisions) ────────────────────────────

export interface CreatureWorldState {
  /** Player IDs present in each room. */
  playersInRoom: Map<string, string[]>;
  /** Room adjacency: roomId → list of adjacent room IDs. */
  roomExits: Map<string, string[]>;
  /** Rooms where sound was recently generated (e.g., combat, loud actions). */
  noisyRooms: Set<string>;
}

// ─── Behavior Transitions ────────────────────────────────────────────────────

/**
 * Determine the next behavior state based on current state and world.
 * Transitions are strict and deterministic:
 *   idle   → alert   (noise in adjacent room) [only if aggressive]
 *   idle   → hostile (player in same room) [only if aggressive]
 *   alert  → hostile (player in same room) [only if aggressive]
 *   alert  → idle    (reached alert target, no player found)
 *   hostile → fleeing (HP below threshold)
 *   fleeing stays fleeing (no recovery in Phase 1)
 *   hostile → idle   (no players in room — combat ended externally)
 */
function transitionState(
  creature: Creature,
  world: CreatureWorldState,
  fleeThreshold: number,
): BehaviorState {
  const playersHere = world.playersInRoom.get(creature.currentRoomId) ?? [];
  const adjacentRooms = world.roomExits.get(creature.currentRoomId) ?? [];

  // Passive creatures never enter hostile or alert states
  if (!creature.aggressive) {
    return 'idle';
  }

  // Fleeing is terminal in Phase 1 — once fleeing, always fleeing
  if (creature.behaviorState === 'fleeing') {
    return 'fleeing';
  }

  // Check HP threshold → fleeing (only from hostile)
  if (creature.behaviorState === 'hostile') {
    if (creature.hp / creature.maxHp <= fleeThreshold) {
      return 'fleeing';
    }
    // Still hostile if players present
    if (playersHere.length > 0) {
      return 'hostile';
    }
    // Players left the room — drop to idle
    return 'idle';
  }

  // Player in same room → hostile
  if (playersHere.length > 0) {
    return 'hostile';
  }

  // Check for noise in adjacent rooms → alert
  if (creature.behaviorState === 'idle') {
    for (const adjRoom of adjacentRooms) {
      if (world.noisyRooms.has(adjRoom)) {
        return 'alert';
      }
    }
    return 'idle';
  }

  // Alert state: arrived at target or target cleared
  if (creature.behaviorState === 'alert') {
    // If we've reached our alert target and no player, drop to idle
    if (!creature.alertTargetRoomId) {
      return 'idle';
    }
    // If we're at the target room, check for players
    if (creature.currentRoomId === creature.alertTargetRoomId) {
      return 'idle';
    }
    // Still heading toward target
    return 'alert';
  }

  return 'idle';
}

// ─── Action Selection ────────────────────────────────────────────────────────

/**
 * Determine what action a creature should take this tick.
 * Pure function: reads creature + world state, returns an action.
 */
export function updateCreature(
  creature: Creature,
  world: CreatureWorldState,
  fleeThreshold: number,
): CreatureAction {
  if (!creature.isAlive) {
    return { type: 'idle', creatureId: creature.id };
  }

  const previousState = creature.behaviorState;
  const nextState = transitionState(creature, world, fleeThreshold);
  creature.behaviorState = nextState;

  const adjacentRooms = world.roomExits.get(creature.currentRoomId) ?? [];

  switch (nextState) {
    case 'idle':
      return handleIdle(creature, adjacentRooms, previousState);

    case 'alert':
      return handleAlert(creature, world, adjacentRooms, previousState);

    case 'hostile':
      return handleHostile(creature, world);

    case 'fleeing':
      return handleFleeing(creature, adjacentRooms);
  }
}

// ─── State Handlers ──────────────────────────────────────────────────────────

function handleIdle(
  creature: Creature,
  adjacentRooms: string[],
  previousState: BehaviorState,
): CreatureAction {
  // Reset alert target when returning to idle
  if (previousState !== 'idle') {
    creature.idleTicks = 0;
    creature.alertTargetRoomId = null;
  }

  creature.idleTicks++;

  // Patrol: move to adjacent room when idle timer expires
  if (creature.idleTicks >= creature.idleTicksTarget && adjacentRooms.length > 0) {
    // Deterministic room selection: pick based on creature ID hash mod available rooms
    const roomIndex = simpleHash(creature.id + creature.idleTicks) % adjacentRooms.length;
    const targetRoom = adjacentRooms[roomIndex];
    creature.idleTicks = 0;
    return { type: 'patrol_move', creatureId: creature.id, targetRoomId: targetRoom };
  }

  return { type: 'idle', creatureId: creature.id };
}

function handleAlert(
  creature: Creature,
  world: CreatureWorldState,
  adjacentRooms: string[],
  previousState: BehaviorState,
): CreatureAction {
  // On transition to alert, find the noisy room to investigate
  if (previousState !== 'alert') {
    for (const adjRoom of adjacentRooms) {
      if (world.noisyRooms.has(adjRoom)) {
        creature.alertTargetRoomId = adjRoom;
        break;
      }
    }
  }

  if (creature.alertTargetRoomId && creature.currentRoomId !== creature.alertTargetRoomId) {
    return { type: 'alert_move', creatureId: creature.id, targetRoomId: creature.alertTargetRoomId };
  }

  // Arrived at target or no target — will transition to idle next tick
  creature.alertTargetRoomId = null;
  return { type: 'idle', creatureId: creature.id };
}

function handleHostile(
  creature: Creature,
  world: CreatureWorldState,
): CreatureAction {
  const playersHere = world.playersInRoom.get(creature.currentRoomId) ?? [];

  if (playersHere.length === 0) {
    return { type: 'idle', creatureId: creature.id };
  }

  // Berserker archetype: always strike. Target first player in room (deterministic).
  const targetId = playersHere[0];

  // If HP is low (but above flee threshold), still strike — flee threshold handles transition
  return { type: 'combat_strike', creatureId: creature.id, targetCombatantId: targetId };
}

function handleFleeing(
  creature: Creature,
  adjacentRooms: string[],
): CreatureAction {
  if (adjacentRooms.length === 0) {
    // Cornered — dodge instead
    return { type: 'combat_dodge', creatureId: creature.id };
  }

  // Flee to first available exit (deterministic)
  return { type: 'combat_flee', creatureId: creature.id, targetRoomId: adjacentRooms[0] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Simple deterministic hash for string → number. No randomness. */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}
