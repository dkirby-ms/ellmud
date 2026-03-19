/**
 * CombatSystem — tick-based combat orchestrator for a shard.
 *
 * Manages active encounters, queued actions, and simultaneous resolution.
 * Called by ShardRoom.update() on every 1-second tick.
 *
 * Design constraints:
 * - Deterministic: same inputs → same outputs (no randomness in Phase 1)
 * - Simultaneous: all damage calculated from start-of-tick HP, applied at once
 * - No-input defaults to Dodge (GDD §6.3)
 */

import type { CombatAction } from '@ellmud/shared';
import {
  type Combatant,
  type CombatEncounter,
  type CombatEvent,
  type FleeResult,
  type QueuedAction,
  type TickResult,
  COMBAT_TIMEOUT_TICKS,
  EMPTY_TICK_RESULT,
} from './CombatState.js';
import { calculateDamage } from './damage.js';
import {
  resolveStrike,
  resolveDodge,
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from './actions.js';

export type ExitResolver = (roomId: string) => string[];

export class CombatSystem {
  private combatants = new Map<string, Combatant>();
  private encounters = new Map<string, CombatEncounter>();
  private queuedActions = new Map<string, QueuedAction>();
  /** Maps combatant ID → encounter ID for fast lookup. */
  private combatantEncounter = new Map<string, string>();
  private nextEncounterId = 0;
  private resolveExits: ExitResolver;

  constructor(resolveExits: ExitResolver) {
    this.resolveExits = resolveExits;
  }

  // ─── Registration ─────────────────────────────────────────────────────────

  /** Register (or update) a combatant. Safe to call multiple times. */
  registerCombatant(combatant: Combatant): void {
    this.combatants.set(combatant.id, combatant);
  }

  getCombatant(id: string): Combatant | undefined {
    return this.combatants.get(id);
  }

  // ─── Combat Initiation ────────────────────────────────────────────────────

  /**
   * Initiate combat between attacker and target.
   * Creates a new encounter or joins existing one in the same room.
   * Auto-queues attacker's first action as strike.
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

    // Auto-queue attacker's first action as strike against target
    this.queuedActions.set(attackerId, { action: 'strike', targetId });

    this.debug(`Combat initiated: ${attacker.name} attacks ${target.name} in encounter ${encounter.id}`);
    return encounter.id;
  }

  // ─── Action Submission ────────────────────────────────────────────────────

  /**
   * Queue an action for the next tick resolution.
   * Returns false if combatant is not in combat.
   */
  submitAction(combatantId: string, action: CombatAction, targetId?: string, fleeRoomId?: string): boolean {
    if (!this.isInCombat(combatantId)) {
      this.debug(`submitAction rejected: ${combatantId} not in combat`);
      return false;
    }

    this.queuedActions.set(combatantId, { action, targetId, fleeRoomId });
    this.debug(`Action queued: ${combatantId} → ${action}${targetId ? ` @ ${targetId}` : ''}`);
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

  hasActiveEncounters(): boolean {
    return this.encounters.size > 0;
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

    for (const [encId, encounter] of this.encounters) {
      const result = this.resolveEncounterTick(encounter);
      allEvents.push(...result.events);
      allFlees.push(...result.fleeResults);
      if (result.ended) {
        endedEncounterIds.push(encId);
      }
    }

    // Clean up ended encounters
    for (const encId of endedEncounterIds) {
      this.cleanupEncounter(encId);
    }

    return { events: allEvents, fleeResults: allFlees, endedEncounterIds };
  }

  private resolveEncounterTick(encounter: CombatEncounter): {
    events: CombatEvent[];
    fleeResults: FleeResult[];
    ended: boolean;
  } {
    encounter.tickCount++;
    const events: CombatEvent[] = [];
    const fleeResults: FleeResult[] = [];

    // Collect living combatants in this encounter
    const combatants: Combatant[] = [];
    for (const cid of encounter.combatantIds) {
      const c = this.combatants.get(cid);
      if (c && c.hp > 0) combatants.push(c);
    }

    if (combatants.length <= 1) {
      events.push(resolveCombatEnd('last_standing'));
      return { events, fleeResults, ended: true };
    }

    // 1. Default unsubmitted actions to dodge
    for (const c of combatants) {
      if (!this.queuedActions.has(c.id)) {
        this.queuedActions.set(c.id, { action: 'dodge' });
        this.debug(`Default dodge for ${c.name} (no input)`);
      }
    }

    // 2. Resolve actions — collect damage and flee intents
    const actions = new Map<string, QueuedAction>();
    let hasStrike = false;

    for (const c of combatants) {
      const qa = this.queuedActions.get(c.id)!;
      actions.set(c.id, qa);
      if (qa.action === 'strike') hasStrike = true;
    }

    // 3. Calculate all damage simultaneously (from start-of-tick state)
    const damageAccumulator = new Map<string, number>(); // targetId → total damage
    const strikeEvents: CombatEvent[] = [];

    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action !== 'strike') continue;

      // Resolve target
      const targetId = qa.targetId ?? this.pickDefaultTarget(c.id, combatants);
      if (!targetId) continue;

      const target = this.combatants.get(targetId);
      if (!target || target.hp <= 0) continue;

      const defenderAction = actions.get(targetId)?.action ?? 'dodge';
      const dmg = calculateDamage(c.attack, target.armour, 'strike', defenderAction);

      const accumulated = (damageAccumulator.get(targetId) ?? 0) + dmg.finalDamage;
      damageAccumulator.set(targetId, accumulated);

      // We'll compute newHp after all damage is accumulated
      strikeEvents.push({
        type: 'strike',
        actorId: c.id,
        actorName: c.name,
        targetId: target.id,
        targetName: target.name,
        damage: dmg.finalDamage,
        newHp: 0, // placeholder, filled below
        maxHp: target.maxHp,
        narration: '', // placeholder
      });

      this.debug(`Damage roll: ${c.name} → ${target.name}: raw=${dmg.rawDamage} ×${dmg.multiplier} -${dmg.armourReduction} = ${dmg.finalDamage}`);
    }

    // 4. Apply all damage at once
    for (const [targetId, totalDmg] of damageAccumulator) {
      const target = this.combatants.get(targetId)!;
      target.hp = Math.max(0, target.hp - totalDmg);
    }

    // Fill in newHp on strike events and generate narration
    for (const evt of strikeEvents) {
      const target = this.combatants.get(evt.targetId!)!;
      evt.newHp = target.hp;
      const defeated = target.hp <= 0;
      evt.narration = defeated
        ? `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage — ${evt.targetName} is defeated!`
        : `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage. [${target.hp}/${target.maxHp} HP]`;
    }
    events.push(...strikeEvents);

    // 5. Dodge events (for combatants not striking or fleeing)
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action === 'dodge') {
        events.push(resolveDodge(c));
      }
    }

    // 6. Handle flee
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action !== 'flee') continue;

      const exits = this.resolveExits(c.roomId);
      let toRoomId = qa.fleeRoomId;

      // Validate or pick first exit
      if (toRoomId && !exits.includes(toRoomId)) toRoomId = undefined;
      if (!toRoomId && exits.length > 0) toRoomId = exits[0];

      if (toRoomId) {
        events.push(resolveFlee(c, true, toRoomId));
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
        events.push(resolveFlee(c, false));
      }
    }

    // 7. Handle defeated combatants
    for (const c of combatants) {
      if (c.hp <= 0) {
        events.push(resolveDefeated(c));
        encounter.combatantIds.delete(c.id);
        this.combatantEncounter.delete(c.id);
        this.queuedActions.delete(c.id);
      }
    }

    // 8. Update strike timeout
    if (hasStrike) {
      encounter.ticksSinceLastStrike = 0;
    } else {
      encounter.ticksSinceLastStrike++;
    }

    // 9. Check combat-end conditions
    const aliveInEncounter = [...encounter.combatantIds].filter(
      (id) => (this.combatants.get(id)?.hp ?? 0) > 0,
    );

    let ended = false;
    if (aliveInEncounter.length <= 1) {
      events.push(resolveCombatEnd('last_standing'));
      ended = true;
    } else if (encounter.ticksSinceLastStrike >= COMBAT_TIMEOUT_TICKS) {
      events.push(resolveCombatEnd('timeout'));
      ended = true;
    }

    // 10. Clear queued actions for next tick
    for (const c of combatants) {
      this.queuedActions.delete(c.id);
    }

    return { events, fleeResults, ended };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
        if (enc.combatantIds.size <= 1) {
          this.cleanupEncounter(encId);
        }
      }
      this.combatantEncounter.delete(id);
    }
    this.queuedActions.delete(id);
    this.combatants.delete(id);
  }

  private debug(msg: string): void {
    console.log(`[CombatSystem] ${msg}`);
  }
}
