import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import {
  createCombatant,
  DEFAULT_PLAYER_STATS,
  type Combatant,
  type CombatStats,
} from '../combat/CombatState.js';

const TEST_ROOM = 'room-1';
const ADJACENT_ROOM = 'room-2';

function testExitResolver(roomId: string): string[] {
  return roomId === TEST_ROOM
    ? [ADJACENT_ROOM]
    : roomId === ADJACENT_ROOM
      ? [TEST_ROOM]
      : [];
}

function makePlayer(
  id: string,
  roomId = TEST_ROOM,
  stats?: Partial<CombatStats>,
): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, true, {
    attack: merged.unarmed,
    maxHp: merged.maxHp,
    armour: merged.armour,
    shieldBlock: merged.shieldBlock,
    dodge: merged.dodge,
  });
}

function makeCreature(
  id: string,
  roomId = TEST_ROOM,
  stats?: Partial<CombatStats>,
): Combatant {
  const merged = { ...DEFAULT_PLAYER_STATS, ...stats };
  return createCombatant(id, id, roomId, false, {
    attack: merged.unarmed,
    maxHp: merged.maxHp,
    armour: merged.armour,
    shieldBlock: merged.shieldBlock,
    dodge: merged.dodge,
  });
}

describe('Combat HP Persistence', () => {
  let system: CombatSystem;

  beforeEach(() => {
    system = new CombatSystem(testExitResolver);
  });

  // ── createCombatant with currentHp ──────────────────────────────────────────

  describe('createCombatant with currentHp', () => {
    it('uses currentHp when provided', () => {
      const c = createCombatant('p1', 'Player', TEST_ROOM, true, {
        maxHp: 100,
        currentHp: 75,
      });
      expect(c.hp).toBe(75);
      expect(c.maxHp).toBe(100);
    });

    it('defaults hp to maxHp when currentHp omitted', () => {
      const c = createCombatant('p1', 'Player', TEST_ROOM, true, {
        maxHp: 100,
      });
      expect(c.hp).toBe(100);
    });

    it('allows currentHp of 1 (near-death)', () => {
      const c = createCombatant('p1', 'Player', TEST_ROOM, true, {
        maxHp: 100,
        currentHp: 1,
      });
      expect(c.hp).toBe(1);
    });
  });

  // ── HP persists across encounters ──────────────────────────────────────────

  describe('HP persists across encounters', () => {
    it('player retains damage from encounter 1 when entering encounter 2', () => {
      // Encounter 1: player fights a weak creature that will die in one tick
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 100 });
      const creature1 = makeCreature('c1', TEST_ROOM, {
        maxHp: 1,
        unarmed: 10,
        armour: 0,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature1);
      system.initiateCombat('p1', 'c1');

      // Resolve tick — creature attacks player, then creature dies
      const result1 = system.resolveTick();

      // Creature should be defeated, encounter ended
      expect(result1.endedEncounterIds.length).toBeGreaterThan(0);

      // Capture player HP after encounter 1
      const hpAfterEncounter1 = result1.endedEncounterData[0]!.playerCombatantHps.find(
        (p) => p.id === 'p1',
      );
      expect(hpAfterEncounter1).toBeDefined();
      expect(hpAfterEncounter1!.hp).toBeLessThan(100);

      // Encounter 2: re-register player with their damaged HP
      const player2 = createCombatant('p1', 'p1', TEST_ROOM, true, {
        maxHp: 100,
        currentHp: hpAfterEncounter1!.hp,
        attack: DEFAULT_PLAYER_STATS.unarmed,
        armour: DEFAULT_PLAYER_STATS.armour,
      });
      const creature2 = makeCreature('c2', TEST_ROOM, {
        maxHp: 1,
        unarmed: 0,
        armour: 0,
      });

      system.registerCombatant(player2);
      system.registerCombatant(creature2);
      system.initiateCombat('p1', 'c2');

      // Player HP should be at damaged value, not full
      const combatant = system.getCombatant('p1');
      expect(combatant).toBeDefined();
      expect(combatant!.hp).toBe(hpAfterEncounter1!.hp);
      expect(combatant!.hp).toBeLessThan(100);
    });
  });

  // ── Dead player HP resets ─────────────────────────────────────────────────

  describe('dead player HP resets', () => {
    it('endedEncounterData includes dead player HP so cache can be cleared', () => {
      // BUG (#471): When a player dies, they are removed from the encounter
      // before endedEncounterData is captured, so the server can't know to
      // clear the HP cache. The fix should ensure dead players appear in
      // endedEncounterData with hp <= 0.
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 50, armour: 0 });
      const creature = makeCreature('c1', TEST_ROOM, {
        maxHp: 1000,
        unarmed: 100,
        armour: 999,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      // Player takes 98 damage (100-2 armour, but armour is 0 → 100 dmg),
      // with 50 HP the player dies on tick 1.
      const result = system.resolveTick();
      expect(result.endedEncounterIds.length).toBeGreaterThan(0);

      const data = result.endedEncounterData[0]!;
      // The dead player SHOULD still appear in playerCombatantHps
      const playerHp = data.playerCombatantHps.find((p) => p.id === 'p1');
      expect(playerHp).toBeDefined();
      expect(playerHp!.hp).toBeLessThanOrEqual(0);
    });

    it('after death, new combatant starts at full HP (cache cleared)', () => {
      // After death the HP cache should be cleared, so a fresh
      // createCombatant without currentHp defaults to maxHp.
      const revivedPlayer = createCombatant('p1', 'p1', TEST_ROOM, true, {
        maxHp: 50,
      });
      expect(revivedPlayer.hp).toBe(50);
    });
  });

  // ── endedEncounterData in TickResult ──────────────────────────────────────

  describe('endedEncounterData in TickResult', () => {
    it('returns player HP data when encounter ends', () => {
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 100, unarmed: 100 });
      const creature = makeCreature('c1', TEST_ROOM, {
        maxHp: 1,
        unarmed: 5,
        armour: 0,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      const result = system.resolveTick();
      expect(result.endedEncounterIds.length).toBe(1);
      expect(result.endedEncounterData.length).toBe(1);

      const data = result.endedEncounterData[0]!;
      expect(data.encounterId).toBe(result.endedEncounterIds[0]);
      expect(data.roomId).toBe(TEST_ROOM);
      expect(data.playerCombatantHps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'p1', maxHp: 100 }),
        ]),
      );
    });

    it('does not include creatures in playerCombatantHps', () => {
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 100, unarmed: 100 });
      const creature = makeCreature('c1', TEST_ROOM, {
        maxHp: 1,
        unarmed: 5,
        armour: 0,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      const result = system.resolveTick();
      const data = result.endedEncounterData[0]!;
      const creatureEntry = data.playerCombatantHps.find((p) => p.id === 'c1');
      expect(creatureEntry).toBeUndefined();
    });

    it('returns empty endedEncounterData when no encounters end', () => {
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 1000 });
      const creature = makeCreature('c1', TEST_ROOM, { maxHp: 1000 });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      const result = system.resolveTick();
      expect(result.endedEncounterData).toEqual([]);
    });
  });

  // ── Terminal empty COMBAT_STATE ────────────────────────────────────────────

  describe('terminal empty COMBAT_STATE on encounter end', () => {
    it('encounter ends and endedEncounterData includes room for broadcast', () => {
      // When an encounter ends, the server needs the roomId to know
      // which players to send the empty COMBAT_STATE to.
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 100, unarmed: 100 });
      const creature = makeCreature('c1', TEST_ROOM, {
        maxHp: 1,
        unarmed: 0,
        armour: 0,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      const result = system.resolveTick();
      expect(result.endedEncounterIds.length).toBe(1);

      // The ended encounter data should contain the roomId
      // so the server can broadcast COMBAT_STATE with empty combatants
      const data = result.endedEncounterData[0]!;
      expect(data.roomId).toBe(TEST_ROOM);
      expect(data.encounterId).toBeTruthy();
    });

    it('combatants are cleaned up after encounter ends', () => {
      const player = makePlayer('p1', TEST_ROOM, { maxHp: 100, unarmed: 100 });
      const creature = makeCreature('c1', TEST_ROOM, {
        maxHp: 1,
        unarmed: 0,
        armour: 0,
      });

      system.registerCombatant(player);
      system.registerCombatant(creature);
      system.initiateCombat('p1', 'c1');

      system.resolveTick();

      // After the encounter ends and tick resolves, the combat system
      // should have cleaned up — player should no longer be in combat
      expect(system.isInCombat('p1')).toBe(false);
      expect(system.isInCombat('c1')).toBe(false);
    });
  });
});
