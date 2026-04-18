/**
 * CombatSystem — tick-based combat orchestrator for a zone.
 *
 * Manages active encounters, queued actions, and simultaneous resolution.
 * Called by ZoneRoom.update() on every 1-second tick.
 *
 * Design constraints:
 * - Deterministic: same inputs → same outputs (no randomness in Phase 1)
 * - Simultaneous: all damage calculated from start-of-tick HP, applied at once
 * - Auto-attack: idle combatants auto-strike; dodge is passive on every incoming attack
 */

import type { CombatAction, PositionZone, CreaturePositionType } from '@ellmud/shared';
import {
  type Combatant,
  type CombatEncounter,
  type CombatEvent,
  type FleeResult,
  type QueuedAction,
  type TickResult,
  type TelegraphBroadcast,
  COMBAT_TIMEOUT_TICKS,
  EMPTY_TICK_RESULT,
  BASE_FLEE_CHANCE,
  FLEE_DODGE_BONUS_PER_RANK,
  FLEE_LEVEL_PENALTY,
  REPOSITION_COOLDOWN_TICKS,
  AUTO_ATTACK_COOLDOWN_TICKS,
} from './CombatState.js';
import { calculateDamage, type DamageBreakdown } from './damage.js';
import {
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from './actions.js';
import { getAbilityDefinition } from './abilities.js';
import { ThreatTable } from './ThreatTable.js';

/**
 * Calculate flee success probability for a combatant.
 * Base 50% + dodge skill scaling - creature level penalty (GDD §6.2).
 *
 * @param fleeing - The combatant attempting to flee
 * @param hostiles - All hostile combatants in the encounter
 * @returns Probability of success (0.0-1.0)
 */
function calculateFleeChance(fleeing: Combatant, hostiles: Combatant[]): number {
  let chance = BASE_FLEE_CHANCE;

  // Dodge skill bonus (replaces evasion)
  chance += fleeing.dodge * FLEE_DODGE_BONUS_PER_RANK;

  // Level penalty from highest-level hostile creature
  const maxHostileLevel = Math.max(...hostiles.map(h => h.level), 0);
  const levelDiff = Math.max(0, maxHostileLevel - fleeing.level);
  chance -= levelDiff * FLEE_LEVEL_PENALTY;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, chance));
}

export type ExitResolver = (roomId: string) => string[];

/** A function returning a float in [0, 1) — used for dodge rolls. */
export type RollFn = () => number;

export class CombatSystem {
  private combatants = new Map<string, Combatant>();
  private encounters = new Map<string, CombatEncounter>();
  private queuedActions = new Map<string, QueuedAction>();
  /** Maps combatant ID → encounter ID for fast lookup. */
  private combatantEncounter = new Map<string, string>();
  /** Maps creature combatant ID → position type for reachability (GDD §6.11). */
  private creaturePositionTypes = new Map<string, CreaturePositionType>();
  private nextEncounterId = 0;
  private resolveExits: ExitResolver;
  private roll: RollFn;

  constructor(resolveExits: ExitResolver, roll?: RollFn) {
    this.resolveExits = resolveExits;
    // Default: always fail dodge (backward compatible with existing deterministic tests)
    this.roll = roll ?? (() => 1);
  }

  /** Replace the RollFn at runtime (used by sandbox seed for deterministic replay). */
  setRollFn(fn: RollFn): void {
    this.roll = fn;
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  /** Register (or update) a combatant. Safe to call multiple times. */
  /** Register (or update) a combatant. Safe to call multiple times. */
  registerCombatant(combatant: Combatant, positionType?: CreaturePositionType): void {
    this.combatants.set(combatant.id, combatant);
    if (!combatant.isPlayer && positionType) {
      this.creaturePositionTypes.set(combatant.id, positionType);
      // Set creature's initial position based on type (GDD §6.11)
      const defaultPosition = this.getDefaultPositionForType(positionType);
      combatant.position = defaultPosition;
    }
  }

  getCombatant(id: string): Combatant | undefined {
    return this.combatants.get(id);
  }

  /** Update a combatant's tracked room (e.g. after player movement). */
  updateCombatantRoom(id: string, newRoomId: string): void {
    const combatant = this.combatants.get(id);
    if (combatant) {
      combatant.roomId = newRoomId;
    }
  }

  // ─── Combat Initiation ────────────────────────────────────────────────────

  /**
   * Initiate combat between attacker and target.
   * Creates a new encounter or joins existing one in the same room.
   * Auto-queues attacker's first action as strike and sets current target.
   * Returns the encounter ID, or null if initiation failed.
   */
  initiateCombat(attackerId: string, targetId: string): string | null {
    const attacker = this.combatants.get(attackerId);
    const target = this.combatants.get(targetId);

    if (!attacker || !target) {
      this.debug(`initiateCombat failed: missing combatant (attacker=${attackerId}, target=${targetId})`);
      return null;
    }

    if (attacker.roomId !== target.roomId) {
      this.debug(`initiateCombat failed: not in same room`);
      return null;
    }

    // Check for existing encounter in the room
    let encounter = this.findEncounterInRoom(attacker.roomId);

    if (encounter) {
      // Join existing encounter
      encounter.combatantIds.add(attackerId);
      encounter.combatantIds.add(targetId);
      this.combatantEncounter.set(attackerId, encounter.id);
      this.combatantEncounter.set(targetId, encounter.id);
    } else {
      // Create new encounter
      const encId = `enc-${this.nextEncounterId++}`;
      encounter = {
        id: encId,
        roomId: attacker.roomId,
        combatantIds: new Set([attackerId, targetId]),
        tickCount: 0,
        ticksSinceLastStrike: 0,

      };
      this.encounters.set(encId, encounter);
      this.combatantEncounter.set(attackerId, encId);
      this.combatantEncounter.set(targetId, encId);
    }

    // Set attacker's current target (GDD §6.2: auto-attack target)
    attacker.currentTarget = targetId;
    // Set target's current target to attacker only if they don't already have one
    // (GDD §6.2: auto-target on aggro, but don't override existing target)
    if (!target.currentTarget) {
      target.currentTarget = attackerId;
    }

    // Auto-queue attacker's first action as strike against target
    this.queuedActions.set(attackerId, { action: 'strike', targetId });

    this.debug(`Combat initiated: ${attacker.name} attacks ${target.name} in encounter ${encounter.id}`);
    return encounter.id;
  }

  // ─── Action Submission ────────────────────────────────────────────────────

  /**
   * Set a combatant's current target for auto-attack.
   * Returns false if target is invalid or not in the same encounter.
   */
  setTarget(combatantId: string, targetId: string): boolean {
    const combatant = this.combatants.get(combatantId);
    const target = this.combatants.get(targetId);

    if (!combatant || !target) {
      this.debug(`setTarget failed: missing combatant or target`);
      return false;
    }

    if (combatant.roomId !== target.roomId) {
      this.debug(`setTarget failed: not in same room`);
      return false;
    }

    const encId = this.combatantEncounter.get(combatantId);
    if (!encId) {
      this.debug(`setTarget failed: combatant not in combat`);
      return false;
    }

    const encounter = this.encounters.get(encId);
    if (!encounter || !encounter.combatantIds.has(targetId)) {
      this.debug(`setTarget failed: target not in same encounter`);
      return false;
    }

    combatant.currentTarget = targetId;
    this.debug(`${combatant.name} targets ${target.name}`);
    return true;
  }

  /**
   * Queue an action for the next tick resolution.
   * Returns false if combatant is not in combat.
   */
  submitAction(combatantId: string, action: CombatAction, targetId?: string, fleeRoomId?: string, abilityId?: string): boolean {
    if (!this.isInCombat(combatantId)) {
      this.debug(`submitAction rejected: ${combatantId} not in combat`);
      return false;
    }

    this.queuedActions.set(combatantId, { action, targetId, fleeRoomId, abilityId });
    this.debug(`Action queued: ${combatantId} → ${action}${targetId ? ` @ ${targetId}` : ''}${abilityId ? ` (${abilityId})` : ''}`);
    return true;
  }

  /**
   * Queue a telegraphed ability (GDD §6.5).
   * Initiates wind-up state on the combatant.
   * Returns false if combatant is not in combat or already winding up.
   */
  queueTelegraph(
    combatantId: string,
    targetId: string,
    ability: { id: string; name: string; damage: number; windUpTicks: number; telegraphText: string },
  ): boolean {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) {
      this.debug(`queueTelegraph rejected: combatant ${combatantId} not found`);
      return false;
    }

    if (!this.isInCombat(combatantId)) {
      this.debug(`queueTelegraph rejected: ${combatantId} not in combat`);
      return false;
    }

    if (combatant.windUp) {
      this.debug(`queueTelegraph rejected: ${combatant.name} already winding up`);
      return false;
    }

    // Initiate wind-up state
    combatant.windUp = {
      abilityId: ability.id,
      abilityName: ability.name,
      damage: ability.damage,
      remainingTicks: ability.windUpTicks,
      targetId,
      telegraphText: ability.telegraphText,
    };

    this.debug(`Telegraph queued: ${combatant.name} begins ${ability.name} (${ability.windUpTicks} ticks)`);
    return true;
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  isInCombat(combatantId: string): boolean {
    return this.combatantEncounter.has(combatantId);
  }

  getEncounterForCombatant(combatantId: string): CombatEncounter | undefined {
    const encId = this.combatantEncounter.get(combatantId);
    return encId ? this.encounters.get(encId) : undefined;
  }

  /**
   * Get all hostile combatants for a given combatant in their encounter.
   * Players see creatures as hostile. Creatures see players as hostile.
   */
  getHostilesInEncounter(combatantId: string): Combatant[] {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return [];

    const encId = this.combatantEncounter.get(combatantId);
    if (!encId) return [];

    const encounter = this.encounters.get(encId);
    if (!encounter) return [];

    const hostiles: Combatant[] = [];
    for (const cid of encounter.combatantIds) {
      if (cid === combatantId) continue;
      const c = this.combatants.get(cid);
      if (!c || c.hp <= 0) continue;
      // Players see creatures as hostile, creatures see players as hostile
      if (combatant.isPlayer !== c.isPlayer) {
        hostiles.push(c);
      }
    }
    return hostiles;
  }

  /**
   * Cycle to the next hostile target in encounter (tab-targeting).
   * Returns the new target ID, or undefined if no valid targets.
   */
  cycleTarget(combatantId: string): string | undefined {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) return undefined;

    const hostiles = this.getHostilesInEncounter(combatantId);
    if (hostiles.length === 0) return undefined;

    // If no current target or target is dead, pick the first hostile
    if (!combatant.currentTarget) {
      const firstHostile = hostiles[0];
      if (firstHostile) {
        combatant.currentTarget = firstHostile.id;
        return firstHostile.id;
      }
      return undefined;
    }

    // Find current target in hostiles list
    const currentIndex = hostiles.findIndex(h => h.id === combatant.currentTarget);
    if (currentIndex === -1) {
      // Current target no longer valid, pick first hostile
      const firstHostile = hostiles[0];
      if (firstHostile) {
        combatant.currentTarget = firstHostile.id;
        return firstHostile.id;
      }
      return undefined;
    }

    // Cycle to next
    const nextIndex = (currentIndex + 1) % hostiles.length;
    const nextTarget = hostiles[nextIndex];
    if (nextTarget) {
      combatant.currentTarget = nextTarget.id;
      return nextTarget.id;
    }

    return undefined;
  }

  hasActiveEncounters(): boolean {
    return this.encounters.size > 0;
  }

  /** Room IDs with active combat — used for creature noise detection. */
  getActiveEncounterRoomIds(): string[] {
    const roomIds: string[] = [];
    for (const enc of this.encounters.values()) {
      roomIds.push(enc.roomId);
    }
    return roomIds;
  }

  /** Get all active encounters — used for COMBAT_STATE broadcasts (#467). */
  getActiveEncounters(): CombatEncounter[] {
    return Array.from(this.encounters.values());
  }

  /** Get combatant data for all members of an encounter (#467). */
  getEncounterCombatants(encounterId: string): Combatant[] {
    const encounter = this.encounters.get(encounterId);
    if (!encounter) return [];
    const result: Combatant[] = [];
    for (const cid of encounter.combatantIds) {
      const c = this.combatants.get(cid);
      if (c) result.push(c);
    }
    return result;
  }

  // ─── Position System (GDD §6.11) ──────────────────────────────────────────

  /**
   * Queue a position change for the next tick.
   * Returns false if combatant is not in combat or on cooldown.
   */
  queuePositionChange(combatantId: string, newPosition: PositionZone): { success: boolean; reason?: string } {
    const combatant = this.combatants.get(combatantId);
    if (!combatant) {
      return { success: false, reason: 'Combatant not found' };
    }

    if (!this.isInCombat(combatantId)) {
      return { success: false, reason: 'You must be in combat to reposition.' };
    }

    if (combatant.position === newPosition) {
      return { success: false, reason: `You are already at the ${newPosition} position.` };
    }

    if (combatant.positionCooldown > 0) {
      return { success: false, reason: `You cannot reposition yet. (${combatant.positionCooldown} ticks remaining)` };
    }

    // Queue the position change as this tick's action
    this.queuedActions.set(combatantId, { action: 'strike', newPosition });
    return { success: true };
  }

  /**
   * Get default position for a creature position type (GDD §6.11).
   */
  private getDefaultPositionForType(type: CreaturePositionType): PositionZone {
    switch (type) {
      case 'melee': return 'front';
      case 'ranged': return 'rear';
      case 'skirmisher': return 'flank';
      case 'boss': return 'front'; // Boss can reach all but starts front
    }
  }

  /**
   * Check if attacker can reach target based on positions (GDD §6.11).
   */
  private canReachTarget(attacker: Combatant, target: Combatant): boolean {
    const attackerPosType = this.creaturePositionTypes.get(attacker.id);
    
    // Boss creatures can reach any position
    if (attackerPosType === 'boss') return true;
    
    // Ranged creatures/players can reach any position
    if (attackerPosType === 'ranged') return true;
    
    // For melee combatants (players and melee/skirmisher creatures):
    // Rear attackers can't melee at all
    if (attacker.position === 'rear') return false;
    
    // Front/Flank attackers can reach Front and Flank targets
    if (target.position === 'front' || target.position === 'flank') return true;
    
    // Cannot reach Rear targets with melee
    return false;
  }

  /**
   * Check if flanking bonus applies (GDD §6.11).
   * Attacker at Flank attacking a creature whose current target is at Front.
   */
  private shouldApplyFlankingBonus(attacker: Combatant, target: Combatant): boolean {
    // Only applies to player attacking from flank
    if (!attacker.isPlayer || attacker.position !== 'flank') return false;
    
    // Only applies when target is a creature
    if (target.isPlayer) return false;
    
    // Check if creature's current target is at Front position
    if (!target.currentTarget) return false;
    
    const targetOfTarget = this.combatants.get(target.currentTarget);
    return targetOfTarget?.position === 'front';
  }

  /**
   * Get reachable players for a creature based on position type (GDD §6.11).
   * Boss and ranged can reach all. Melee at Front/Flank can reach Front + Flank.
   */
  private getReachablePlayers(
    creature: Combatant,
    players: Combatant[],
    creaturePositionType: CreaturePositionType
  ): Combatant[] {
    // Boss can reach all
    if (creaturePositionType === 'boss') {
      return players;
    }
    
    // Ranged can reach all
    if (creaturePositionType === 'ranged') {
      return players;
    }
    
    // Melee and skirmisher have position restrictions
    // If creature is at Rear, can only reach Rear (edge case, rarely happens)
    if (creature.position === 'rear') {
      return players.filter(p => p.position === 'rear');
    }
    
    // Melee at Front/Flank can reach Front + Flank players only
    return players.filter(p => p.position === 'front' || p.position === 'flank');
  }

  /**
   * Pick a target for a creature using threat table + position reachability (GDD §6.10-6.11).
   * Returns target ID or undefined if no valid targets.
   * 
   * Logic:
   * 1. Get threat table for this creature (create if doesn't exist)
   * 2. Get all living players in encounter
   * 3. Filter to reachable players based on position
   * 4. Use threat table to find highest-threat reachable target
   * 5. If highest-threat OVERALL target is unreachable:
   *    - Aggressive (skirmisher): reposition toward target (costs action)
   *    - Steady (melee/ranged): attack highest-threat reachable target instead
   */
  private pickCreatureTarget(
    creature: Combatant,
    combatants: Combatant[],
    positionType: CreaturePositionType,
    encounter: CombatEncounter
  ): string | undefined {
    // Initialize threat tables if needed
    if (!encounter.threatTables) {
      encounter.threatTables = new Map();
    }
    
    // Get or create threat table for this creature
    if (!encounter.threatTables.has(creature.id)) {
      encounter.threatTables.set(creature.id, new ThreatTable());
    }
    const threatTable = encounter.threatTables.get(creature.id)!;
    
    // Get all living players in encounter
    const players = combatants.filter(c => c.isPlayer && c.hp > 0);
    if (players.length === 0) return undefined;
    
    // Get reachable players based on position
    const reachablePlayers = this.getReachablePlayers(creature, players, positionType);
    
    // Try to find highest-threat reachable target
    const reachableIds = reachablePlayers.map(p => p.id);
    const highestThreatReachable = threatTable.getHighestThreatTarget(reachableIds);
    
    // Also get the overall highest-threat target (including unreachable)
    const allPlayerIds = players.map(p => p.id);
    const highestThreatOverall = threatTable.getHighestThreatTarget(allPlayerIds);
    
    // For aggressive creatures (skirmisher): check if overall highest is unreachable
    // If so, reposition toward them instead of settling for a reachable target
    if (positionType === 'skirmisher' && highestThreatOverall && !reachableIds.includes(highestThreatOverall)) {
      const target = this.combatants.get(highestThreatOverall);
      if (target && creature.positionCooldown === 0) {
        const newPosition = target.position;
        this.queuedActions.set(creature.id, { action: 'strike', newPosition });
        creature.currentTarget = highestThreatOverall;
        this.debug(`${creature.name} repositions to ${newPosition} (aggressive, chasing ${target.name})`);
        return undefined; // Repositioning costs the action
      }
      // On cooldown — fall through to attack reachable target
    }
    
    if (highestThreatReachable) {
      creature.currentTarget = highestThreatReachable;
      return highestThreatReachable;
    }
    
    // Fall back to first reachable player (no threat data yet, or all unreachable)
    if (reachablePlayers.length > 0) {
      const fallbackTarget = reachablePlayers[0];
      creature.currentTarget = fallbackTarget.id;
      return fallbackTarget.id;
    }
    
    return undefined;
  }

  // ─── Tick Resolution ──────────────────────────────────────────────────────

  /**
   * Resolve all queued actions simultaneously. Called once per shard tick.
   *
   * Algorithm:
   * 1. Default unsubmitted actions to dodge
   * 2. Calculate all damage from start-of-tick HP (simultaneous)
   * 3. Apply all damage at once
   * 4. Handle flee (remove from encounter, record movement)
   * 5. Handle defeated combatants
   * 6. Check combat-end conditions (timeout, last standing)
   * 7. Clear queued actions
   */
  resolveTick(): TickResult {
    if (this.encounters.size === 0) return EMPTY_TICK_RESULT;

    const allEvents: CombatEvent[] = [];
    const allFlees: FleeResult[] = [];
    const endedEncounterIds: string[] = [];
    const allTelegraphs: TelegraphBroadcast[] = [];
    const newEncounterRoomIds: string[] = [];

    for (const [encId, encounter] of this.encounters) {
      // Track encounters entering their first tick
      const isFirstTick = encounter.tickCount === 0;
      const result = this.resolveEncounterTick(encounter);
      allEvents.push(...result.events);
      allFlees.push(...result.fleeResults);
      if (result.telegraphs) {
        allTelegraphs.push(...result.telegraphs);
      }
      if (isFirstTick) {
        newEncounterRoomIds.push(encounter.roomId);
      }
      if (result.ended) {
        endedEncounterIds.push(encId);
      }
    }

    // Capture surviving player HP data before cleanup destroys combatant records
    const endedEncounterData: TickResult['endedEncounterData'] = [];
    for (const encId of endedEncounterIds) {
      const encounter = this.encounters.get(encId);
      if (!encounter) continue;
      const playerCombatantHps: Array<{ id: string; hp: number; maxHp: number }> = [];
      for (const cid of encounter.combatantIds) {
        const c = this.combatants.get(cid);
        if (c && c.isPlayer) {
          playerCombatantHps.push({ id: c.id, hp: c.hp, maxHp: c.maxHp });
        }
      }
      endedEncounterData.push({ encounterId: encId, roomId: encounter.roomId, playerCombatantHps });
    }

    // Clean up ended encounters
    for (const encId of endedEncounterIds) {
      this.cleanupEncounter(encId);
    }

    return { events: allEvents, fleeResults: allFlees, endedEncounterIds, telegraphs: allTelegraphs, newEncounterRoomIds, endedEncounterData };
  }

  private resolveEncounterTick(encounter: CombatEncounter): {
    events: CombatEvent[];
    fleeResults: FleeResult[];
    ended: boolean;
    telegraphs?: TelegraphBroadcast[];
  } {
    encounter.tickCount++;
    const events: CombatEvent[] = [];
    const fleeResults: FleeResult[] = [];
    const telegraphs: TelegraphBroadcast[] = [];

    // Collect living combatants in this encounter
    const combatants: Combatant[] = [];
    for (const cid of encounter.combatantIds) {
      const c = this.combatants.get(cid);
      if (c && c.hp > 0) combatants.push(c);
    }

    // Note: Don't end combat immediately if only 1 combatant - check cooldown logic at end

    // 0a. Decrement auto-attack cooldowns
    for (const c of combatants) {
      if (c.strikeCooldown > 0) c.strikeCooldown--;
    }

    // 0b. Process wind-up countdowns (GDD §6.5)
    const windUpExpired: Combatant[] = [];
    for (const c of combatants) {
      if (c.windUp) {
        c.windUp.remainingTicks--;
        if (c.windUp.remainingTicks > 0) {
          // Still winding up — broadcast telegraph
          telegraphs.push({
            creatureId: c.id,
            creatureName: c.name,
            abilityName: c.windUp.abilityName,
            remainingTicks: c.windUp.remainingTicks,
            targetId: c.windUp.targetId,
            telegraphText: c.windUp.telegraphText,
          });
        } else {
          // Wind-up expired — execute ability this tick
          windUpExpired.push(c);
        }
      }
    }


    // 0. Creature threat-based targeting (GDD §6.10-6.11)
    // Re-evaluate creature targets each tick using threat tables + reachability
    for (const c of combatants) {
      if (c.isPlayer || c.hp <= 0) continue;
      const posType = this.creaturePositionTypes.get(c.id) ?? 'melee';
      const picked = this.pickCreatureTarget(c, combatants, posType, encounter);
      if (picked === undefined && this.queuedActions.has(c.id)) {
        // pickCreatureTarget queued a reposition — skip auto-attack for this creature
        continue;
      }
    }

    // 1. Default unsubmitted actions to auto-attack current target (GDD §6.1, §6.2)
    for (const c of combatants) {
      // Combatants winding up don't queue actions — they're committed to the telegraph
      // UNLESS their wind-up just expired this tick (they're in windUpExpired list)
      if (c.windUp && !windUpExpired.includes(c)) {
        // Queue a strike placeholder so resolution logic doesn't crash
        this.queuedActions.set(c.id, { action: 'strike' });
        continue;
      }

      // Disconnected players auto-attack (dodge is passive, not an action)
      if (c.disconnected && !this.queuedActions.has(c.id)) {
        if (c.strikeCooldown > 0) {
          this.queuedActions.set(c.id, { action: 'strike' });
          this.debug(`Auto-attack on cooldown for ${c.name} (disconnected)`);
          continue;
        }
        let target = c.currentTarget ? this.combatants.get(c.currentTarget) : undefined;
        const targetValid = target && target.hp > 0 && encounter.combatantIds.has(c.currentTarget!);
        if (!targetValid) {
          const newTargetId = this.cycleTarget(c.id);
          if (newTargetId) target = this.combatants.get(newTargetId);
        }
        if (target && target.hp > 0 && encounter.combatantIds.has(target.id)) {
          this.queuedActions.set(c.id, { action: 'strike', targetId: target.id });
          this.debug(`Auto-attack for ${c.name} → ${target.name} (disconnected)`);
        } else {
          this.queuedActions.set(c.id, { action: 'strike' });
          this.debug(`Default idle for ${c.name} (disconnected, no target)`);
        }
        continue;
      }

      if (!this.queuedActions.has(c.id)) {
        // On auto-attack cooldown — idle this tick
        if (c.strikeCooldown > 0) {
          this.queuedActions.set(c.id, { action: 'strike' });
          this.debug(`Auto-attack on cooldown for ${c.name}`);
          continue;
        }
        // Auto-attack if we have a valid target
        let target = c.currentTarget ? this.combatants.get(c.currentTarget) : undefined;
        const targetValid = target && target.hp > 0 && encounter.combatantIds.has(c.currentTarget!);

        if (!targetValid) {
          // Current target is dead/missing/unset — try to retarget next hostile
          const newTargetId = this.cycleTarget(c.id);
          if (newTargetId) {
            target = this.combatants.get(newTargetId);
            this.debug(`Auto-retarget for ${c.name} → ${target?.name ?? newTargetId}`);
          }
        }

        if (target && target.hp > 0 && encounter.combatantIds.has(target.id)) {
          this.queuedActions.set(c.id, { action: 'strike', targetId: target.id });
          const reason = c.disconnected ? '(disconnected)' : '(no input)';
          this.debug(`Auto-attack for ${c.name} → ${target.name} ${reason}`);
        } else {
          // No valid hostiles remain — idle (no meaningful action)
          this.queuedActions.set(c.id, { action: 'strike' });
          this.debug(`Default idle for ${c.name} (no target)`);
        }
      }
    }

    // 1a. Decrement ability cooldowns at start of tick (GDD §6.3)
    for (const c of combatants) {
      if (!c.abilityCooldowns) continue;
      for (const [abilityId, remaining] of c.abilityCooldowns) {
        if (remaining > 1) {
          c.abilityCooldowns.set(abilityId, remaining - 1);
        } else {
          c.abilityCooldowns.delete(abilityId);
        }
      }
    }

    // 1b. Resolve ability actions — validate resources and convert to base actions (GDD §6.3)
    for (const c of combatants) {
      const qa = this.queuedActions.get(c.id);
      if (!qa) continue;

      const abilityAction = qa.action;
      // Only process ability actions (not base combat actions)
      if (abilityAction === 'strike' || abilityAction === 'flee') continue;

      const ability = getAbilityDefinition(abilityAction);
      if (!ability) {
        // Unknown ability — fall back to strike
        this.queuedActions.set(c.id, { action: 'strike' });
        continue;
      }

      // Validate stamina and cooldown
      const hasStaminaForAbility = c.stamina === undefined || c.stamina >= ability.staminaCost;
      const cooldown = c.abilityCooldowns?.get(abilityAction) ?? 0;
      const offCooldown = cooldown === 0;

      if (!hasStaminaForAbility || !offCooldown) {
        // Can't use ability — fall back to auto-attack
        if (c.currentTarget) {
          const target = this.combatants.get(c.currentTarget);
          if (target && target.hp > 0 && this.combatantEncounter.has(c.id)) {
            this.queuedActions.set(c.id, { action: 'strike', targetId: c.currentTarget });
            this.debug(`Ability ${abilityAction} failed validation — fallback to auto-attack for ${c.name}`);
          } else {
            this.queuedActions.set(c.id, { action: 'strike' });
          }
        } else {
          this.queuedActions.set(c.id, { action: 'strike' });
        }
        continue;
      }

      // Consume stamina
      if (c.stamina !== undefined) {
        c.stamina -= ability.staminaCost;
      }
      // Set cooldown (only if > 0)
      if (ability.cooldownTicks > 0 && c.abilityCooldowns) {
        c.abilityCooldowns.set(abilityAction, ability.cooldownTicks);
      }

      // Convert action based on ability type
      if (ability.type === 'attack') {
        // Attack ability → convert to strike with abilityId for damage multiplier
        const targetId = qa.targetId ?? c.currentTarget;
        this.queuedActions.set(c.id, { action: 'strike', targetId, abilityId: abilityAction });
        this.debug(`${c.name} uses ${ability.name}`);
      } else if (ability.type === 'defence') {
        // Defence ability (block) → keep as 'block', handled by calculateDamage
        events.push({
          type: 'dodge',
          actorId: c.id,
          actorName: c.name,
          narration: `${c.name} is blocking.`,
          roomId: encounter.roomId,
        });
      } else if (ability.type === 'utility') {
        // Utility ability (observe) → reveal target stats
        const targetId = qa.targetId ?? c.currentTarget;
        const target = targetId ? this.combatants.get(targetId) : undefined;
        if (target) {
          events.push({
            type: 'dodge',
            actorId: c.id,
            actorName: c.name,
            narration: `${c.name} observes ${target.name}: ${target.hp}/${target.maxHp} HP, Attack: ${target.attack}, Armour: ${target.armour}`,
            roomId: encounter.roomId,
          });
        }
        this.queuedActions.set(c.id, { action: 'strike' });
        this.debug(`${c.name} uses ${ability.name} on ${target?.name ?? 'unknown'}`);
      }
    }

    // 2. Resolve actions — collect damage and flee intents
    const actions = new Map<string, QueuedAction>();
    let hasStrike = false;

    for (const c of combatants) {
      // Check for expired wind-ups — convert to immediate strike action
      if (windUpExpired.includes(c) && c.windUp) {
        const windUp = c.windUp;
        // Override queued action with telegraphed ability execution
        this.queuedActions.set(c.id, {
          action: 'strike',
          targetId: windUp.targetId,
          abilityId: windUp.abilityId,
        });
        this.debug(`Wind-up expired: ${c.name} executes ${windUp.abilityName} on ${windUp.targetId}`);
      }

      const qa = this.queuedActions.get(c.id)!;
      actions.set(c.id, qa);
      if (qa.action === 'strike') hasStrike = true;
    }

    // 3. Calculate all damage simultaneously (from start-of-tick state)
    const damageAccumulator = new Map<string, number>(); // targetId → total damage
    const damageContributors = new Map<string, Set<string>>(); // targetId → set of attacker IDs
    const strikeEvents: CombatEvent[] = [];

    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action !== 'strike') continue;

      // Check if this is a telegraphed ability execution (abilityId present)
      let attackDamage = c.attack;
      let abilityDamageMultiplier = 1.0;
      if (qa.abilityId && c.windUp && c.windUp.abilityId === qa.abilityId) {
        // Use ability damage instead of base attack
        attackDamage = c.windUp.damage;
        this.debug(`Telegraphed ability: ${c.name} uses ${c.windUp.abilityName} for ${attackDamage} damage`);
        // Clear wind-up state after execution
        c.windUp = undefined;
      } else if (qa.abilityId) {
        // Instant ability (e.g., Heavy Strike) — look up damage multiplier
        const ability = getAbilityDefinition(qa.abilityId);
        const damageEffect = ability?.effects.find(e => e.type === 'damage');
        if (damageEffect?.damageMultiplier) {
          abilityDamageMultiplier = damageEffect.damageMultiplier;
        }
      }

      // Resolve target
      const targetId = qa.targetId ?? this.pickDefaultTarget(c.id, combatants);
      if (!targetId) continue;

      const target = this.combatants.get(targetId);
      if (!target || target.hp <= 0) continue;

      // Position-based range check (GDD §6.11)
      if (!this.canReachTarget(c, target)) {
        this.debug(`${c.name} cannot reach ${target.name} (position: ${c.position} → ${target.position})`);
        continue;
      }

      const defenderAction = actions.get(targetId)?.action ?? 'strike';
      // Passive dodge: always roll for dodge on every incoming attack
      const dodgeRoll = this.roll();
      // Shield block: roll for block if target has shieldBlock > 0
      const blockRoll = target.shieldBlock > 0 ? this.roll() : 1;
      
      // Block should mitigate telegraphed abilities (GDD §6.5)
      const dmg = calculateDamage(attackDamage, target.armour, 'strike', defenderAction, {
        defenderDodge: target.dodge,
        defenderShieldBlock: target.shieldBlock,
        dodgeRoll,
        blockRoll,
        damageMultiplier: abilityDamageMultiplier,
      });

      // Apply flanking bonus: +15% from Flank when target's threat focus is at Front (GDD §6.11)
      let finalDamage = dmg.finalDamage;
      let appliedFlankingBonus = 1.0;
      if (this.shouldApplyFlankingBonus(c, target)) {
        appliedFlankingBonus = 1.15;
        finalDamage = Math.ceil(finalDamage * appliedFlankingBonus);
        this.debug(`Flanking bonus: ${c.name} deals +15% damage to ${target.name}`);
      }

      // Augment breakdown with externally applied flanking bonus
      let breakdown: DamageBreakdown | undefined;
      if (dmg.breakdown) {
        breakdown = {
          ...dmg.breakdown,
          flankingBonus: appliedFlankingBonus,
          finalDamage,
        };
      }

      const accumulated = (damageAccumulator.get(targetId) ?? 0) + finalDamage;
      damageAccumulator.set(targetId, accumulated);

      // Track who contributed damage for kill attribution
      if (!damageContributors.has(targetId)) damageContributors.set(targetId, new Set());
      if (finalDamage > 0) {
        damageContributors.get(targetId)!.add(c.id);
      }

      // We'll compute newHp after all damage is accumulated
      strikeEvents.push({
        type: 'strike',
        actorId: c.id,
        actorName: c.name,
        targetId: target.id,
        targetName: target.name,
        damage: finalDamage,
        newHp: 0, // placeholder, filled below
        maxHp: target.maxHp,
        narration: '', // placeholder
        dodged: dmg.dodged,
        blocked: dmg.blocked,
        breakdown,
      });

      this.debug(`Damage roll: ${c.name} → ${target.name}: raw=${dmg.rawDamage} ×${dmg.multiplier} -${dmg.armourReduction} = ${dmg.finalDamage}${dmg.dodged ? ' (DODGED)' : ''}${dmg.blocked ? ' (BLOCKED)' : ''}`);

      // Set auto-attack cooldown after striking
      c.strikeCooldown = AUTO_ATTACK_COOLDOWN_TICKS;
    }

    // 4. Apply all damage at once
    for (const [targetId, totalDmg] of damageAccumulator) {
      const target = this.combatants.get(targetId)!;
      target.hp = Math.max(0, target.hp - totalDmg);
    }

    // Update threat tables for creatures based on damage dealt (GDD §6.10)
    if (!encounter.threatTables) {
      encounter.threatTables = new Map();
    }
    
    for (const evt of strikeEvents) {
      if (!evt.dodged && !evt.blocked && evt.damage && evt.damage > 0) {
        const attacker = this.combatants.get(evt.actorId);
        const target = this.combatants.get(evt.targetId!);
        
        // If a player attacked a creature, add threat to that creature's table
        if (attacker?.isPlayer && target && !target.isPlayer) {
          // Initialize threat table for this creature if it doesn't exist
          if (!encounter.threatTables.has(target.id)) {
            encounter.threatTables.set(target.id, new ThreatTable());
          }
          const threatTable = encounter.threatTables.get(target.id)!;
          threatTable.addDamageThreat(attacker.id, evt.damage);
          this.debug(`Threat: ${attacker.name} +${evt.damage} threat on ${target.name}`);
        }
      }
    }

    // Bug 3 fix: Filter out strikes from combatants who were defeated this tick.
    // Defeated combatants (hp <= 0 after damage) generate no offensive events.
    const filteredStrikeEvents = strikeEvents.filter(evt => {
      const attacker = this.combatants.get(evt.actorId);
      return attacker && attacker.hp > 0;
    });

    // Bug 2 fix: Fill in newHp as running tally (not post-tick snapshot) so
    // each hit within a tick shows cumulative damage rather than identical HP.
    const runningHp = new Map<string, number>();
    for (const evt of filteredStrikeEvents) {
      const target = this.combatants.get(evt.targetId!)!;
      if (!runningHp.has(evt.targetId!)) {
        // Start from pre-damage HP: post-tick HP + total accumulated damage
        const totalDmg = damageAccumulator.get(evt.targetId!) ?? 0;
        runningHp.set(evt.targetId!, target.hp + totalDmg);
      }

      const currentRunning = runningHp.get(evt.targetId!)!;
      const hitDamage = (evt.dodged || evt.blocked) ? 0 : (evt.damage ?? 0);
      const newRunning = Math.max(0, currentRunning - hitDamage);
      runningHp.set(evt.targetId!, newRunning);

      evt.newHp = newRunning;
      evt.roomId = encounter.roomId;
      if (evt.dodged) {
        evt.narration = `${evt.targetName} dodges ${evt.actorName}'s attack!`;
      } else if (evt.blocked) {
        evt.narration = `${evt.targetName} blocks ${evt.actorName}'s attack with their shield!`;
      } else {
        const defeated = newRunning <= 0;
        evt.narration = defeated
          ? `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage — ${evt.targetName} is defeated!`
          : `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage. [${evt.targetName}: ${newRunning}/${target.maxHp} HP]`;
      }
    }
    events.push(...filteredStrikeEvents);

    // 4a. Process position changes and decrement cooldowns (GDD §6.11)
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      
      // Handle position change
      if (qa.newPosition && qa.newPosition !== c.position) {
        c.position = qa.newPosition;
        c.positionCooldown = REPOSITION_COOLDOWN_TICKS;
        const narration = this.getPositionChangeNarration(c.name, qa.newPosition, c.isPlayer);
        events.push({
          type: 'dodge',
          actorId: c.id,
          actorName: c.name,
          narration,
          roomId: encounter.roomId,
        });
        this.debug(`${c.name} repositioned to ${qa.newPosition}`);
      } else if (c.positionCooldown > 0) {
        // Decrement cooldown only if we didn't just reposition this tick
        c.positionCooldown--;
      }
    }

    // 5. (Passive dodge narration is emitted inline with strike events above)

    // 6. Handle flee — skill check based on Evasion vs creature level (GDD §6.2)
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action !== 'flee') continue;
      // Skip flee for defeated combatants — they can't flee if dead
      if (c.hp <= 0) continue;

      const exits = this.resolveExits(c.roomId);
      let toRoomId = qa.fleeRoomId;

      // Validate or pick first exit
      if (toRoomId && !exits.includes(toRoomId)) toRoomId = undefined;
      if (!toRoomId && exits.length > 0) toRoomId = exits[0];

      if (!toRoomId) {
        // No exits available — flee fails
        events.push({ ...resolveFlee(c, false, undefined, 'no_exits'), roomId: encounter.roomId });
        continue;
      }

      // Calculate flee success chance (GDD §6.2)
      const hostiles = combatants.filter(
        (other) => other.id !== c.id && other.hp > 0 && c.isPlayer !== other.isPlayer,
      );
      const fleeChance = calculateFleeChance(c, hostiles);
      const fleeRoll = this.roll();
      const fleeSuccess = fleeRoll < fleeChance;

      if (fleeSuccess) {
        events.push({ ...resolveFlee(c, true, toRoomId), roomId: encounter.roomId });
        fleeResults.push({
          combatantId: c.id,
          combatantName: c.name,
          fromRoomId: c.roomId,
          toRoomId,
        });
        // Remove from encounter
        encounter.combatantIds.delete(c.id);
        this.combatantEncounter.delete(c.id);
        this.queuedActions.delete(c.id);
        c.roomId = toRoomId;

      } else {
        // Flee failed — lose action for this tick (GDD §6.2)
        events.push({ ...resolveFlee(c, false, undefined, 'failed_roll'), roomId: encounter.roomId });
      }
    }

    // 7. Handle defeated combatants — attach killer attribution
    for (const c of combatants) {
      if (c.hp <= 0) {
        const defeatedEvent = resolveDefeated(c);
        defeatedEvent.roomId = encounter.roomId;
        const contributors = damageContributors.get(c.id);
        if (contributors) {
          defeatedEvent.killerIds = [...contributors];
        }
        events.push(defeatedEvent);
        encounter.combatantIds.delete(c.id);
        this.combatantEncounter.delete(c.id);
        this.queuedActions.delete(c.id);

        // Clear stale target refs so auto-retarget kicks in next tick
        for (const remainingId of encounter.combatantIds) {
          const remaining = this.combatants.get(remainingId);
          if (remaining && remaining.currentTarget === c.id) {
            remaining.currentTarget = undefined;
            this.debug(`Cleared stale target for ${remaining.name} (${c.name} defeated)`);
          }
        }
      }
    }

    // 8. Update strike timeout
    if (hasStrike) {
      encounter.ticksSinceLastStrike = 0;
    } else {
      encounter.ticksSinceLastStrike++;
    }

    // 9. Check combat-end conditions (GDD §6.2)
    const aliveInEncounter = [...encounter.combatantIds].filter(
      (id) => (this.combatants.get(id)?.hp ?? 0) > 0,
    );

    let ended = false;
    if (aliveInEncounter.length <= 1) {
      events.push({ ...resolveCombatEnd('last_standing'), roomId: encounter.roomId });
      ended = true;
    } else {
      // Check if hostile pairs remain — if all survivors are on the same
      // "side" (all players or all creatures), combat should end.
      const hasPlayer = aliveInEncounter.some(
        (id) => this.combatants.get(id)?.isPlayer === true,
      );
      const hasCreature = aliveInEncounter.some(
        (id) => this.combatants.get(id)?.isPlayer === false,
      );
      // In PvP, all survivors are players but may be hostile to each other.
      // Only end if a single side remains in PvE (players vs creatures).
      // PvP encounters keep going as long as multiple players remain.
      if (!hasPlayer || !hasCreature) {
        // PvE: only one side left → end combat
        // For PvP, hasCreature is false but multiple players may still fight.
        // Detect PvP: if all alive are players and more than one, check if
        // any pair has active hostility (currentTarget pointing at each other).
        if (hasPlayer && !hasCreature && aliveInEncounter.length > 1) {
          // PvP scenario: check for active hostile pairs among players
          const hasHostilePair = aliveInEncounter.some((id) => {
            const c = this.combatants.get(id);
            return c?.currentTarget && aliveInEncounter.includes(c.currentTarget);
          });
          if (!hasHostilePair) {
            events.push({ ...resolveCombatEnd('last_standing'), roomId: encounter.roomId });
            ended = true;
          }
        } else {
          events.push({ ...resolveCombatEnd('last_standing'), roomId: encounter.roomId });
          ended = true;
        }
      }
    }

    if (!ended && encounter.ticksSinceLastStrike >= COMBAT_TIMEOUT_TICKS) {
      events.push({ ...resolveCombatEnd('timeout'), roomId: encounter.roomId });
      ended = true;
    }

    // 10. Clear queued actions for next tick
    for (const c of combatants) {
      this.queuedActions.delete(c.id);
    }

    // Stamp round number on all events for display grouping
    for (const e of events) {
      e.roundNumber = encounter.tickCount;
    }

    return { events, fleeResults, ended, telegraphs };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Generate narration for position changes (GDD §6.11).
   */
  private getPositionChangeNarration(name: string, position: PositionZone, isPlayer: boolean): string {
    if (isPlayer) {
      switch (position) {
        case 'front': return 'You push forward to the front line.';
        case 'flank': return 'You maneuver to the flank.';
        case 'rear': return 'You fall back to the rear line.';
      }
    } else {
      switch (position) {
        case 'front': return `${name} pushes forward to the front.`;
        case 'flank': return `${name} maneuvers to the flank.`;
        case 'rear': return `${name} falls back to the rear.`;
      }
    }
  }

  private findEncounterInRoom(roomId: string): CombatEncounter | undefined {
    for (const enc of this.encounters.values()) {
      if (enc.roomId === roomId) return enc;
    }
    return undefined;
  }

  /** Pick the first other combatant in the encounter as default target. */
  private pickDefaultTarget(attackerId: string, combatants: Combatant[]): string | undefined {
    for (const c of combatants) {
      if (c.id !== attackerId && c.hp > 0) return c.id;
    }
    return undefined;
  }

  private cleanupEncounter(encId: string): void {
    const encounter = this.encounters.get(encId);
    if (!encounter) return;

    for (const cid of encounter.combatantIds) {
      this.combatantEncounter.delete(cid);
      this.queuedActions.delete(cid);
      // Remove combatant entries so stale roomIds don't block future combat.
      // Both attack handler and creature AI re-register combatants on initiation.
      this.combatants.delete(cid);
    }
    this.encounters.delete(encId);
    this.debug(`Encounter ${encId} ended and cleaned up`);
  }

  /** Remove a combatant entirely (e.g., on disconnect). */
  removeCombatant(id: string): void {
    const encId = this.combatantEncounter.get(id);
    if (encId) {
      const enc = this.encounters.get(encId);
      if (enc) {
        enc.combatantIds.delete(id);
        if (this.shouldEndEncounter(enc)) {
          this.cleanupEncounter(encId);
        }
      }
      this.combatantEncounter.delete(id);
    }
    this.queuedActions.delete(id);
    this.combatants.delete(id);
  }

  /**
   * Check if an encounter should end: <= 1 combatant, or no hostile pairs remain.
   */
  private shouldEndEncounter(enc: CombatEncounter): boolean {
    if (enc.combatantIds.size <= 1) return true;

    const alive = [...enc.combatantIds].filter(
      (cid) => (this.combatants.get(cid)?.hp ?? 0) > 0,
    );
    if (alive.length <= 1) return true;

    const hasPlayer = alive.some((cid) => this.combatants.get(cid)?.isPlayer === true);
    const hasCreature = alive.some((cid) => this.combatants.get(cid)?.isPlayer === false);
    if (!hasPlayer || !hasCreature) {
      // PvP check: multiple players with active hostile pairs should continue
      if (hasPlayer && !hasCreature && alive.length > 1) {
        return !alive.some((cid) => {
          const c = this.combatants.get(cid);
          return c?.currentTarget && alive.includes(c.currentTarget);
        });
      }
      return true;
    }
    return false;
  }

  /** Mark a combatant as disconnected — will auto-attack until reconnection. */
  markDisconnected(id: string): void {
    const combatant = this.combatants.get(id);
    if (combatant) {
      combatant.disconnected = true;
      this.debug(`Combatant ${combatant.name} marked as disconnected`);
    }
  }

  /** Clear disconnected flag on reconnection. */
  clearDisconnected(id: string): void {
    const combatant = this.combatants.get(id);
    if (combatant) {
      combatant.disconnected = false;
      this.debug(`Combatant ${combatant.name} reconnected`);
    }
  }

  private debug(msg: string): void {
    console.log(`[CombatSystem] ${msg}`);
  }
}
