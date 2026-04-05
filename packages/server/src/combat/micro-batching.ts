/**
 * Temporal micro-batching for combat narration (GDD §6.6).
 * 
 * Collapses same-type events within a short window into summary lines.
 * Temporal window: 50-150ms (single tick in our 1s tick system).
 * Group-scale rules: ally actions collapsed, defeats protected.
 */

import type { ClassifiedCombatEvent, SignalClass } from './signal-classification.js';

export interface BatchedEvent {
  /** Primary event (first in batch) */
  event: ClassifiedCombatEvent;
  /** Number of events batched together (1 = unbatched) */
  batchSize: number;
  /** Individual damage values for batched strikes */
  damageBatch?: number[];
  /** Total damage across all batched events */
  totalDamage?: number;
}

/**
 * Group-scale batching rules (GDD §6.6).
 * 
 * In group combat (20+ players), aggressive batching is critical:
 * - Ally actions against same target → collapsed
 * - Ally damage received → batched
 * - Defeats → NEVER batched (kills are satisfying)
 * - Healing events → summarized
 */
export interface BatchingRules {
  /** Batch ally actions against the same target */
  batchAllyActions: boolean;
  /** Batch ally damage received from same source */
  batchAllyDamage: boolean;
  /** Never batch defeat events (kills are satisfying) */
  protectDefeats: boolean;
  /** Batch healing events (future) */
  batchHealing: boolean;
}

export const DEFAULT_BATCHING_RULES: BatchingRules = {
  batchAllyActions: true,
  batchAllyDamage: true,
  protectDefeats: true,
  batchHealing: true,
};

/**
 * Temporal micro-batching: collapse same-type events from a single tick.
 * 
 * Since our combat system resolves all actions simultaneously per tick,
 * all events in a single tick occur within the same temporal window.
 * 
 * Batching strategy:
 * 1. Group events by signal class
 * 2. Within each class, group by (actor, target, type) tuple
 * 3. Apply group-scale rules (protect defeats, etc.)
 * 
 * @param events - Classified combat events from a single tick
 * @param rules - Batching rules to apply
 * @returns Batched events ready for narration
 */
export function batchCombatEvents(
  events: ClassifiedCombatEvent[],
  rules: BatchingRules = DEFAULT_BATCHING_RULES,
): BatchedEvent[] {
  // Rule: Never batch defeat events
  if (rules.protectDefeats) {
    const defeats = events.filter(e => e.type === 'defeated');
    const others = events.filter(e => e.type !== 'defeated');
    
    // Batch non-defeat events
    const batchedOthers = batchByClass(others, rules);
    
    // Add defeats as unbatched individual events
    const unbatchedDefeats: BatchedEvent[] = defeats.map(e => ({
      event: e,
      batchSize: 1,
    }));
    
    return [...batchedOthers, ...unbatchedDefeats];
  }
  
  return batchByClass(events, rules);
}

/**
 * Batch events by signal class, then by (actor, target, type).
 */
function batchByClass(
  events: ClassifiedCombatEvent[],
  rules: BatchingRules,
): BatchedEvent[] {
  const batched: BatchedEvent[] = [];
  
  // Group by signal class first
  const byClass = new Map<SignalClass, ClassifiedCombatEvent[]>();
  for (const event of events) {
    const existing = byClass.get(event.signalClass);
    if (existing) {
      existing.push(event);
    } else {
      byClass.set(event.signalClass, [event]);
    }
  }
  
  // Within each class, batch by (actor, target, type)
  for (const [_, classEvents] of byClass) {
    batched.push(...batchByActor(classEvents, rules));
  }
  
  // Priority ordering: player actions first, enemy actions second, system last
  batched.sort((a, b) => {
    const priority: Record<SignalClass, number> = {
      player_action: 0,
      enemy_action: 1,
      environmental: 2,
      status_effect: 2,
      system: 3,
    };
    return priority[a.event.signalClass] - priority[b.event.signalClass];
  });
  
  return batched;
}

/**
 * Batch events by (actor, target, type) tuple.
 */
function batchByActor(
  events: ClassifiedCombatEvent[],
  rules: BatchingRules,
): BatchedEvent[] {
  const batched: BatchedEvent[] = [];
  const grouped = new Map<string, ClassifiedCombatEvent[]>();
  
  for (const event of events) {
    // Key: actor_target_type (use "none" for missing target)
    const key = `${event.actorId}_${event.targetId ?? 'none'}_${event.type}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }
  
  // Convert groups to batched events
  for (const [_, group] of grouped) {
    if (group.length === 1) {
      // Single event — no batching
      batched.push({
        event: group[0],
        batchSize: 1,
      });
    } else {
      // Multiple events — batch them
      const damages = group
        .map(e => e.damage)
        .filter((d): d is number => d !== undefined);
      
      const totalDamage = damages.length > 0
        ? damages.reduce((sum, d) => sum + d, 0)
        : undefined;
      
      batched.push({
        event: group[0], // Use first event as representative
        batchSize: group.length,
        damageBatch: damages.length > 0 ? damages : undefined,
        totalDamage,
      });
    }
  }
  
  return batched;
}

/**
 * Generate narration text for a batched event.
 * 
 * Single events use original narration.
 * Batched events get summary text with multiple damage numbers.
 * 
 * @param batched - Batched event to narrate
 * @returns Narration text
 */
export function narrateBatchedEvent(batched: BatchedEvent): string {
  if (batched.batchSize === 1) {
    // Unbatched — use original narration
    const icon = batched.event.icon ? `${batched.event.icon} ` : '';
    return `${icon}${batched.event.narration}`;
  }
  
  // Batched — generate summary
  const icon = batched.event.icon ? `${batched.event.icon} ` : '';
  const event = batched.event;
  
  if (event.type === 'strike' && batched.damageBatch && batched.damageBatch.length > 1) {
    // Multiple strikes: "X strikes Y — 4, 5, 6 damage (15 total)"
    const damageList = batched.damageBatch.join(', ');
    const total = batched.totalDamage ?? 0;
    return `${icon}${event.actorName} unleashes a flurry against ${event.targetName ?? 'the target'} — ${damageList} damage (${total} total)`;
  }
  
  if (event.type === 'dodge') {
    // Multiple dodges: "X dodges 3 attacks"
    return `${icon}${event.actorName} dodges ${batched.batchSize} attacks`;
  }
  
  // Fallback: use original narration with count
  return `${icon}${batched.event.narration} (×${batched.batchSize})`;
}
