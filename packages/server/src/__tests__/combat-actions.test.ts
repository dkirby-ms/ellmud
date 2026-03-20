/**
 * Combat Action Resolver Unit Tests
 *
 * Tests the individual action-resolution functions in combat/actions.ts
 * that produce CombatEvent narrations. These are tested in isolation
 * (not through CombatSystem) to verify narration text and event shapes.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveStrike,
  resolveDodge,
  resolveFlee,
  resolveDefeated,
  resolveCombatEnd,
} from '../combat/actions.js';
import { createCombatant, DEFAULT_PLAYER_STATS, type Combatant } from '../combat/CombatState.js';
import { calculateDamage, type DamageResult } from '../combat/damage.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(id, name, 'room-1', true);
  if (hp !== undefined) c.hp = hp;
  return c;
}

function makeCreature(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(id, name, 'room-1', false);
  if (hp !== undefined) c.hp = hp;
  return c;
}

function makeDamageResult(finalDamage: number): DamageResult {
  return { rawDamage: 10, multiplier: 1.0, armourReduction: 0, finalDamage };
}

// ─── resolveStrike ──────────────────────────────────────────────────────────

describe('resolveStrike', () => {
  it('produces a strike event with correct fields', () => {
    const attacker = makePlayer('p1', 'Warrior');
    const defender = makeCreature('c1', 'Revenant');
    const dmg = makeDamageResult(8);

    const event = resolveStrike(attacker, defender, dmg, 92);

    expect(event.type).toBe('strike');
    expect(event.actorId).toBe('p1');
    expect(event.actorName).toBe('Warrior');
    expect(event.targetId).toBe('c1');
    expect(event.targetName).toBe('Revenant');
    expect(event.damage).toBe(8);
    expect(event.newHp).toBe(92);
    expect(event.maxHp).toBe(DEFAULT_PLAYER_STATS.maxHp);
  });

  it('narration shows HP status for non-lethal hit', () => {
    const attacker = makePlayer('p1', 'Warrior');
    const defender = makeCreature('c1', 'Revenant');
    const dmg = makeDamageResult(8);

    const event = resolveStrike(attacker, defender, dmg, 50);
    expect(event.narration).toContain('Warrior strikes Revenant for 8 damage');
    expect(event.narration).toContain('50/100 HP');
    expect(event.narration).not.toContain('defeated');
  });

  it('narration announces defeat when HP reaches 0', () => {
    const attacker = makePlayer('p1', 'Warrior');
    const defender = makeCreature('c1', 'Revenant');
    const dmg = makeDamageResult(10);

    const event = resolveStrike(attacker, defender, dmg, 0);
    expect(event.narration).toContain('defeated');
    expect(event.narration).toContain('Revenant');
  });

  it('handles 1-damage minimum correctly', () => {
    const attacker = makePlayer('p1', 'Weak');
    const defender = makeCreature('c1', 'Tank', 50);
    const dmg = makeDamageResult(1);

    const event = resolveStrike(attacker, defender, dmg, 49);
    expect(event.damage).toBe(1);
    expect(event.newHp).toBe(49);
  });
});

// ─── resolveDodge ───────────────────────────────────────────────────────────

describe('resolveDodge', () => {
  it('produces a dodge event with defensive stance narration', () => {
    const combatant = makePlayer('p1', 'Rogue');
    const event = resolveDodge(combatant);

    expect(event.type).toBe('dodge');
    expect(event.actorId).toBe('p1');
    expect(event.actorName).toBe('Rogue');
    expect(event.narration).toContain('defensive stance');
  });

  it('does not include target or damage fields', () => {
    const combatant = makePlayer('p1', 'Rogue');
    const event = resolveDodge(combatant);

    expect(event.targetId).toBeUndefined();
    expect(event.damage).toBeUndefined();
  });
});

// ─── resolveFlee ────────────────────────────────────────────────────────────

describe('resolveFlee', () => {
  it('produces a successful flee event', () => {
    const combatant = makePlayer('p1', 'Coward');
    const event = resolveFlee(combatant, true, 'room-2');

    expect(event.type).toBe('flee');
    expect(event.actorId).toBe('p1');
    expect(event.narration).toContain('flees from combat');
  });

  it('produces a failed flee event', () => {
    const combatant = makePlayer('p1', 'Trapped');
    const event = resolveFlee(combatant, false);

    expect(event.type).toBe('flee');
    expect(event.narration).toContain('no escape');
  });

  it('does not include target or damage fields', () => {
    const combatant = makePlayer('p1', 'Runner');
    const event = resolveFlee(combatant, true, 'room-2');

    expect(event.targetId).toBeUndefined();
    expect(event.damage).toBeUndefined();
  });
});

// ─── resolveDefeated ────────────────────────────────────────────────────────

describe('resolveDefeated', () => {
  it('produces a defeated event with 0 HP', () => {
    const combatant = makePlayer('p1', 'FallenKnight');
    combatant.hp = 0;
    const event = resolveDefeated(combatant);

    expect(event.type).toBe('defeated');
    expect(event.actorId).toBe('p1');
    expect(event.newHp).toBe(0);
    expect(event.maxHp).toBe(DEFAULT_PLAYER_STATS.maxHp);
    expect(event.narration).toContain('collapses');
  });

  it('includes the combatant name in narration', () => {
    const combatant = makeCreature('c1', 'Drowned Revenant');
    const event = resolveDefeated(combatant);
    expect(event.narration).toContain('Drowned Revenant');
  });
});

// ─── resolveCombatEnd ───────────────────────────────────────────────────────

describe('resolveCombatEnd', () => {
  it('timeout reason produces correct narration', () => {
    const event = resolveCombatEnd('timeout');
    expect(event.type).toBe('combat_end');
    expect(event.narration).toContain('tension fades');
  });

  it('last_standing reason produces correct narration', () => {
    const event = resolveCombatEnd('last_standing');
    expect(event.narration).toContain('No opponents remain');
  });

  it('all_fled reason produces correct narration', () => {
    const event = resolveCombatEnd('all_fled');
    expect(event.narration).toContain('All combatants have fled');
  });

  it('unknown reason falls back to generic narration', () => {
    const event = resolveCombatEnd('unknown_reason' as unknown as 'timeout');
    expect(event.narration).toBe('Combat has ended.');
  });

  it('combat_end events have empty actor fields', () => {
    const event = resolveCombatEnd('timeout');
    expect(event.actorId).toBe('');
    expect(event.actorName).toBe('');
  });
});

// ─── Damage Calculation Edge Cases ──────────────────────────────────────────

describe('Damage Calculation Edge Cases', () => {
  it('zero attack still deals minimum 1 damage on strike', () => {
    const result = calculateDamage(0, 0, 'strike', 'strike');
    expect(result.finalDamage).toBe(1);
  });

  it('very high armour vs low attack clamps to 1', () => {
    const result = calculateDamage(1, 999, 'strike', 'strike');
    expect(result.finalDamage).toBe(1);
  });

  it('dodge vs dodge produces zero damage', () => {
    const result = calculateDamage(100, 0, 'dodge', 'dodge');
    expect(result.finalDamage).toBe(0);
  });

  it('strike vs dodge with exact armour match yields minimum 1', () => {
    // attack=4, armour=2: 4 * 0.5 - 2 = 0 → clamped to 1
    const result = calculateDamage(4, 2, 'strike', 'dodge');
    expect(result.finalDamage).toBe(1);
  });

  it('equal attack and armour still deals 1 damage on strike vs strike', () => {
    // 5 * 1.0 - 5 = 0 → clamped to 1
    const result = calculateDamage(5, 5, 'strike', 'strike');
    expect(result.finalDamage).toBe(1);
  });
});
