/**
 * CombatSystem — tick-based combat orchestrator for a zone.
 *
 * Manages active encounters, queued actions, and simultaneous resolution.
 * Called by ZoneRoom.update() on every 1-second tick.
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
  type TelegraphBroadcast,
  type WindUpState,
  COMBAT_TIMEOUT_TICKS,
  EMPTY_TICK_RESULT,
  POST_COMBAT_COOLDOWN_TICKS,
  BASE_FLEE_CHANCE,
  FLEE_EVASION_BONUS_PER_RANK,
  FLEE_LEVEL_PENALTY,
} from './CombatState.js';
import { calculateDamage } from './damage.js';
import {
  resolveDodge,
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from './actions.js';
import { getAbilityDefinition } from './abilities.js';

/**
 * Calculate flee success probability for a combatant.
 * Base 50% + Evasion skill scaling - creature level penalty (GDD §6.2).
 *
 * @param fleeing - The combatant attempting to flee
 * @param hostiles - All hostile combatants in the encounter
 * @returns Probability of success (0.0-1.0)
 */
function calculateFleeChance(fleeing: Combatant, hostiles: Combatant[]): number {
  let chance = BASE_FLEE_CHANCE;

  // Evasion skill bonus
  chance += fleeing.evasionSkillRank * FLEE_EVASION_BONUS_PER_RANK;

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
  private nextEncounterId = 0;
  private resolveExits: ExitResolver;
  private roll: RollFn;

  constructor(resolveExits: ExitResolver, roll?: RollFn) {
    this.resolveExits = resolveExits;
    // Default: always fail dodge (backward compatible with existing deterministic tests)
    this.roll = roll ?? (() => 1);
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
        postCombatCooldown: 0,
      };
      this.encounters.set(encId, encounter);
      this.combatantEncounter.set(attackerId, encId);
      this.combatantEncounter.set(targetId, encId);
    }

    // Set attacker's current target (GDD §6.2: auto-attack target)
    attacker.currentTarget = targetId;
    // Set target's current target to attacker (GDD §6.2: auto-target on aggro)
    // This applies to both creatures and PvP
    target.currentTarget = attackerId;

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

    for (const [encId, encounter] of this.encounters) {
      const result = this.resolveEncounterTick(encounter);
      allEvents.push(...result.events);
      allFlees.push(...result.fleeResults);
      if (result.telegraphs) {
        allTelegraphs.push(...result.telegraphs);
      }
      if (result.ended) {
        endedEncounterIds.push(encId);
      }
    }

    // Clean up ended encounters
    for (const encId of endedEncounterIds) {
      this.cleanupEncounter(encId);
    }

    return { events: allEvents, fleeResults: allFlees, endedEncounterIds, telegraphs: allTelegraphs };
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

    if (combatants.length <= 1) {
      events.push(resolveCombatEnd('last_standing'));
      return { events, fleeResults, ended: true, telegraphs };
    }

    // 0. Process wind-up countdowns (GDD §6.5)
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

    // 1. Default unsubmitted actions to auto-attack current target (GDD §6.1, §6.2)
    for (const c of combatants) {
      // Combatants winding up don't queue actions — they're committed to the telegraph
      // UNLESS their wind-up just expired this tick (they're in windUpExpired list)
      if (c.windUp && !windUpExpired.includes(c)) {
        // Queue a dodge placeholder so resolution logic doesn't crash
        this.queuedActions.set(c.id, { action: 'dodge' });
        continue;
      }

      if (!this.queuedActions.has(c.id)) {
        // Auto-attack if we have a valid target
        if (c.currentTarget) {
          const target = this.combatants.get(c.currentTarget);
          if (target && target.hp > 0 && encounter.combatantIds.has(c.currentTarget)) {
            this.queuedActions.set(c.id, { action: 'strike', targetId: c.currentTarget });
            const reason = c.disconnected ? '(disconnected)' : '(no input)';
            this.debug(`Auto-attack for ${c.name} → ${target.name} ${reason}`);
          } else {
            // Target is dead/missing — pause auto-attack, default to dodge
            this.queuedActions.set(c.id, { action: 'dodge' });
            const reason = c.disconnected ? '(disconnected)' : '(no target)';
            this.debug(`Default dodge for ${c.name} ${reason}`);
          }
        } else {
          // No target set — default to dodge
          this.queuedActions.set(c.id, { action: 'dodge' });
          const reason = c.disconnected ? '(disconnected)' : '(no target)';
          this.debug(`Default dodge for ${c.name} ${reason}`);
        }
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
      if (qa.abilityId && c.windUp && c.windUp.abilityId === qa.abilityId) {
        // Use ability damage instead of base attack
        attackDamage = c.windUp.damage;
        this.debug(`Telegraphed ability: ${c.name} uses ${c.windUp.abilityName} for ${attackDamage} damage`);
        // Clear wind-up state after execution
        c.windUp = undefined;
      }

      // Resolve target
      const targetId = qa.targetId ?? this.pickDefaultTarget(c.id, combatants);
      if (!targetId) continue;

      const target = this.combatants.get(targetId);
      if (!target || target.hp <= 0) continue;

      const defenderAction = actions.get(targetId)?.action ?? 'dodge';
      const dodgeRoll = defenderAction === 'dodge' ? this.roll() : undefined;
      
      // Block should mitigate telegraphed abilities (GDD §6.5)
      const dmg = calculateDamage(attackDamage, target.armour, 'strike', defenderAction, {
        defenderAgility: target.agility,
        defenderDodgeSkillRank: target.dodgeSkillRank,
        dodgeRoll,
      });

      const accumulated = (damageAccumulator.get(targetId) ?? 0) + dmg.finalDamage;
      damageAccumulator.set(targetId, accumulated);

      // Track who contributed damage for kill attribution
      if (!damageContributors.has(targetId)) damageContributors.set(targetId, new Set());
      if (dmg.finalDamage > 0) {
        damageContributors.get(targetId)!.add(c.id);
      }

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
        dodged: dmg.dodged,
      });

      this.debug(`Damage roll: ${c.name} → ${target.name}: raw=${dmg.rawDamage} ×${dmg.multiplier} -${dmg.armourReduction} = ${dmg.finalDamage}${dmg.dodged ? ' (DODGED)' : ''}`);
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
      if (evt.dodged) {
        evt.narration = `${evt.targetName} dodges!`;
      } else {
        const defeated = target.hp <= 0;
        evt.narration = defeated
          ? `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage — ${evt.targetName} is defeated!`
          : `${evt.actorName} strikes ${evt.targetName} for ${evt.damage} damage. [${target.hp}/${target.maxHp} HP]`;
      }
    }
    events.push(...strikeEvents);

    // 5. Dodge events (for combatants not striking or fleeing)
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action === 'dodge') {
        events.push(resolveDodge(c));
      }
    }

    // 6. Handle flee — skill check based on Evasion vs creature level (GDD §6.2)
    for (const c of combatants) {
      const qa = actions.get(c.id)!;
      if (qa.action !== 'flee') continue;

      const exits = this.resolveExits(c.roomId);
      let toRoomId = qa.fleeRoomId;

      // Validate or pick first exit
      if (toRoomId && !exits.includes(toRoomId)) toRoomId = undefined;
      if (!toRoomId && exits.length > 0) toRoomId = exits[0];

      if (!toRoomId) {
        // No exits available — flee fails
        events.push(resolveFlee(c, false));
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
        // Reset cooldown if fleeing player was keeping combat alive
        encounter.postCombatCooldown = 0;
      } else {
        // Flee failed — lose action for this tick (GDD §6.2)
        events.push(resolveFlee(c, false));
      }
    }

    // 7. Handle defeated combatants — attach killer attribution
    for (const c of combatants) {
      if (c.hp <= 0) {
        const defeatedEvent = resolveDefeated(c);
        const contributors = damageContributors.get(c.id);
        if (contributors) {
          defeatedEvent.killerIds = [...contributors];
        }
        events.push(defeatedEvent);
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

    // 9. Check combat-end conditions (GDD §6.2)
    const aliveInEncounter = [...encounter.combatantIds].filter(
      (id) => (this.combatants.get(id)?.hp ?? 0) > 0,
    );

    let ended = false;
    if (aliveInEncounter.length <= 1) {
      // Only one side remains alive — start post-combat cooldown (GDD §6.2)
      if (encounter.postCombatCooldown === 0) {
        // First tick after last enemy defeated — start cooldown
        encounter.postCombatCooldown = POST_COMBAT_COOLDOWN_TICKS;
        this.debug(`Post-combat cooldown started: ${POST_COMBAT_COOLDOWN_TICKS} ticks`);
      } else {
        // Cooldown in progress — decrement
        encounter.postCombatCooldown--;
        this.debug(`Post-combat cooldown: ${encounter.postCombatCooldown} ticks remaining`);
      }

      // Combat ends when cooldown expires
      if (encounter.postCombatCooldown === 0) {
        events.push(resolveCombatEnd('last_standing'));
        ended = true;
      }
    } else {
      // Multiple combatants still alive — reset cooldown if it was running
      if (encounter.postCombatCooldown > 0) {
        this.debug(`Post-combat cooldown interrupted — new threats detected`);
        encounter.postCombatCooldown = 0;
      }
    }

    if (!ended && encounter.ticksSinceLastStrike >= COMBAT_TIMEOUT_TICKS) {
      events.push(resolveCombatEnd('timeout'));
      ended = true;
    }

    // 10. Clear queued actions for next tick
    for (const c of combatants) {
      this.queuedActions.delete(c.id);
    }

    return { events, fleeResults, ended, telegraphs };
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

  /** Mark a combatant as disconnected — will auto-dodge until reconnection. */
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
