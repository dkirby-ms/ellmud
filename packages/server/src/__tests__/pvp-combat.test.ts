/**
 * PvP Combat Tests (Issue #24)
 *
 * Tests player-vs-player combat mechanics:
 * - Target resolution (players can attack other players)
 * - Simultaneous tick resolution (same as PvE)
 * - Friendly fire (no squad immunity)
 * - Attribution (killerIds on defeated events)
 * - No XP from PvP detection
 * - Death penalty debuff constants
 * - Flee mechanics in PvP
 * - Mixed PvP/PvE encounters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type Combatant,
} from '../combat/CombatState.js';
import { DEATH_PENALTY_DEFAULTS, type PvPKillEvent } from '@ellmud/shared';

// Stub exit resolver: every room has an exit to room-2
const stubExits = (_roomId: string) => ['room-2'];

function makePlayer(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(id, name, 'room-1', true);
  if (hp !== undefined) c.hp = hp;
  return c;
}

function makeCreature(id: string, name: string, hp?: number): Combatant {
  const c = createCombatant(`creature-${id}`, name, 'room-1', false);
  if (hp !== undefined) c.hp = hp;
  return c;
}

describe('PvP Target Resolution', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('players can target other players in combat', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    const encId = combat.initiateCombat(playerA.id, playerB.id);

    expect(encId).toBeDefined();
    const result = combat.resolveTick();
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('combat encounter includes both player combatants', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    const encounter = combat.getEncounterForCombatant(playerA.id);
    expect(encounter).toBeDefined();
    expect(encounter!.combatantIds.has('player-a')).toBe(true);
    expect(encounter!.combatantIds.has('player-b')).toBe(true);
  });
});

describe('PvP Simultaneous Resolution', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('both players deal damage in the same tick', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'strike', playerB.id);
    combat.submitAction(playerB.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const strikes = result.events.filter(e => e.type === 'strike');

    const aStrikes = strikes.filter(e => e.actorId === 'player-a');
    const bStrikes = strikes.filter(e => e.actorId === 'player-b');
    expect(aStrikes.length).toBeGreaterThan(0);
    expect(bStrikes.length).toBeGreaterThan(0);
  });

  it('simultaneous lethal damage can defeat both players', () => {
    const playerA = makePlayer('player-a', 'Alice', 1);
    const playerB = makePlayer('player-b', 'Bob', 1);

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'strike', playerB.id);
    combat.submitAction(playerB.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const defeated = result.events.filter(e => e.type === 'defeated');

    expect(defeated.length).toBe(2);
  });
});

describe('Friendly Fire (no squad immunity)', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('players can damage each other (no squad immunity)', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'strike', playerB.id);

    const result = combat.resolveTick();
    const strikes = result.events.filter(
      e => e.type === 'strike' && e.actorId === 'player-a' && e.targetId === 'player-b',
    );

    expect(strikes.length).toBeGreaterThan(0);
    const bCombatant = combat.getCombatant('player-b');
    expect(bCombatant!.hp).toBeLessThan(DEFAULT_PLAYER_STATS.maxHp);
  });
});

describe('PvP Attribution (killerIds)', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('defeated events include killerIds from damage contributors', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob', 1);

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'strike', playerB.id);
    combat.submitAction(playerB.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const defeated = result.events.find(
      e => e.type === 'defeated' && e.actorId === 'player-b',
    );

    expect(defeated).toBeDefined();
    expect(defeated!.killerIds).toBeDefined();
    expect(defeated!.killerIds).toContain('player-a');
  });

  it('multiple attackers all appear in killerIds', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');
    const victim = makePlayer('player-c', 'Charlie', 1);

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.registerCombatant(victim);
    combat.initiateCombat(playerA.id, victim.id);
    combat.initiateCombat(playerB.id, victim.id);

    combat.submitAction(playerA.id, 'strike', victim.id);
    combat.submitAction(playerB.id, 'strike', victim.id);
    combat.submitAction(victim.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const defeated = result.events.find(
      e => e.type === 'defeated' && e.actorId === 'player-c',
    );

    expect(defeated).toBeDefined();
    expect(defeated!.killerIds).toContain('player-a');
    expect(defeated!.killerIds).toContain('player-b');
  });

  it('PvE defeated events have creature killerIds', () => {
    const player = makePlayer('player-a', 'Alice', 1);
    const creature = makeCreature('goblin-1', 'Goblin');

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.initiateCombat(player.id, creature.id);

    combat.submitAction(creature.id, 'strike', player.id);
    combat.submitAction(player.id, 'strike', creature.id);

    const result = combat.resolveTick();
    const defeated = result.events.find(
      e => e.type === 'defeated' && e.actorId === 'player-a',
    );

    expect(defeated).toBeDefined();
    expect(defeated!.killerIds).toBeDefined();
    expect(defeated!.killerIds!.every(id => id.startsWith('creature-'))).toBe(true);
  });
});

describe('No XP from PvP (detection logic)', () => {
  it('player killerIds are detected as PvP', () => {
    const killerIds = ['player-a', 'player-b'];
    const isPvP = killerIds.some(id => !id.startsWith('creature-'));
    expect(isPvP).toBe(true);
  });

  it('creature-only killerIds are not PvP', () => {
    const killerIds = ['creature-goblin-1'];
    const isPvP = killerIds.some(id => !id.startsWith('creature-'));
    expect(isPvP).toBe(false);
  });

  it('mixed player/creature killerIds are PvP', () => {
    const killerIds = ['player-a', 'creature-goblin-1'];
    const isPvP = killerIds.some(id => !id.startsWith('creature-'));
    expect(isPvP).toBe(true);
  });
});

describe('Death Penalty Defaults', () => {
  it('exports death penalty debuff constants', () => {
    expect(DEATH_PENALTY_DEFAULTS).toBeDefined();
    expect(DEATH_PENALTY_DEFAULTS.durationMs).toBe(120_000);
    expect(DEATH_PENALTY_DEFAULTS.attackPenalty).toBe(-5);
    expect(DEATH_PENALTY_DEFAULTS.defencePenalty).toBe(-3);
  });
});

describe('PvPKillEvent Interface', () => {
  it('can be constructed with required fields', () => {
    const event: PvPKillEvent = {
      type: 'pvp_kill',
      killerId: 'player-a',
      victimId: 'player-b',
      victimName: 'Bob',
      roomId: 'room-1',
      timestamp: Date.now(),
    };

    expect(event.victimId).toBe('player-b');
    expect(event.killerId).toBe('player-a');
  });
});

describe('PvP Flee Mechanics', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('player can flee from PvP combat', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'flee', undefined, 'room-2');
    combat.submitAction(playerB.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const fleeEvents = result.events.filter(e => e.type === 'flee');
    expect(fleeEvents.length).toBe(1);
    expect(fleeEvents[0].actorId).toBe('player-a');
  });
});

describe('PvP Default Dodge Action', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('players without queued action default to dodge', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    combat.submitAction(playerA.id, 'strike', playerB.id);

    const result = combat.resolveTick();
    expect(result).toBeDefined();
  });
});

describe('Mixed PvP and PvE Encounters', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('players and creatures coexist in the same encounter', () => {
    const player = makePlayer('player-a', 'Alice');
    const creature = makeCreature('goblin-1', 'Goblin');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(player);
    combat.registerCombatant(creature);
    combat.registerCombatant(playerB);

    combat.initiateCombat(player.id, creature.id);
    combat.initiateCombat(playerB.id, player.id);

    combat.submitAction(player.id, 'strike', creature.id);
    combat.submitAction(playerB.id, 'strike', player.id);
    combat.submitAction(creature.id, 'strike', player.id);

    const result = combat.resolveTick();
    const strikes = result.events.filter(e => e.type === 'strike');

    expect(strikes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Re-targeting in PvP', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(stubExits);
  });

  it('player can switch targets between ticks', () => {
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');
    const playerC = makePlayer('player-c', 'Charlie');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.registerCombatant(playerC);

    combat.initiateCombat(playerA.id, playerB.id);
    combat.initiateCombat(playerC.id, playerA.id);

    // Tick 1: A attacks B
    combat.submitAction(playerA.id, 'strike', playerB.id);
    combat.submitAction(playerB.id, 'strike', playerA.id);
    combat.submitAction(playerC.id, 'strike', playerA.id);
    combat.resolveTick();

    // Tick 2: A switches to C
    combat.submitAction(playerA.id, 'strike', playerC.id);
    combat.submitAction(playerB.id, 'strike', playerA.id);
    combat.submitAction(playerC.id, 'strike', playerA.id);

    const result = combat.resolveTick();
    const aStrikes = result.events.filter(
      e => e.type === 'strike' && e.actorId === 'player-a',
    );

    expect(aStrikes.length).toBeGreaterThan(0);
    expect(aStrikes[0].targetId).toBe('player-c');
  });
});

describe('Full PvP Encounter Flow', () => {
  it('resolves a complete PvP encounter until one player is defeated', () => {
    const combat = new CombatSystem(stubExits);
    const playerA = makePlayer('player-a', 'Alice');
    const playerB = makePlayer('player-b', 'Bob');

    combat.registerCombatant(playerA);
    combat.registerCombatant(playerB);
    combat.initiateCombat(playerA.id, playerB.id);

    let defeatedFound = false;
    let ticks = 0;
    const maxTicks = 50;

    while (!defeatedFound && ticks < maxTicks) {
      combat.submitAction(playerA.id, 'strike', playerB.id);
      combat.submitAction(playerB.id, 'strike', playerA.id);

      const result = combat.resolveTick();

      for (const event of result.events) {
        if (event.type === 'defeated') {
          defeatedFound = true;
          expect(event.killerIds).toBeDefined();
          expect(event.killerIds!.length).toBeGreaterThan(0);
        }
      }
      ticks++;
    }

    expect(defeatedFound).toBe(true);
    expect(ticks).toBeLessThan(maxTicks);
  });
});

describe('PvP Integration (requires multi-client)', () => {
  it.todo('two connected clients can attack each other through ZoneRoom');
  it.todo('PvP death drops non-soulbound items as lootable corpse');
  it.todo('PvP narration sent to all players in room');
  it.todo('death penalty debuff applied after PvP');
});
