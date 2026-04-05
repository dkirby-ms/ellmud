/**
 * Tests for combat narration micro-batching (GDD §6.6).
 */

import { describe, it, expect } from 'vitest';
import {
  batchCombatEvents,
  narrateBatchedEvent,
  DEFAULT_BATCHING_RULES,
  type BatchedEvent,
} from '../combat/micro-batching.js';
import { classifyEvent, COMBAT_ICONS } from '../combat/signal-classification.js';
import type { CombatEvent } from '../combat/CombatState.js';
import type { ClassifiedCombatEvent } from '../combat/signal-classification.js';

describe('Temporal Micro-Batching (GDD §6.6)', () => {
  describe('batchCombatEvents', () => {
    it('should not batch single event', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        narration: 'Alice strikes the Goblin for 10 damage',
      };

      const classified = classifyEvent(event, true, false);
      const batched = batchCombatEvents([classified], DEFAULT_BATCHING_RULES);

      expect(batched).toHaveLength(1);
      expect(batched[0].batchSize).toBe(1);
      expect(batched[0].event.actorId).toBe('player1');
    });

    it('should batch multiple strikes from same actor to same target', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 4,
          narration: 'Alice strikes the Goblin for 4 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 5,
          narration: 'Alice strikes the Goblin for 5 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 6,
          narration: 'Alice strikes the Goblin for 6 damage',
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      expect(batched).toHaveLength(1);
      expect(batched[0].batchSize).toBe(3);
      expect(batched[0].damageBatch).toEqual([4, 5, 6]);
      expect(batched[0].totalDamage).toBe(15);
    });

    it('should not batch strikes from different actors', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 10,
          narration: 'Alice strikes the Goblin for 10 damage',
        },
        {
          type: 'strike',
          actorId: 'player2',
          actorName: 'Bob',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 8,
          narration: 'Bob strikes the Goblin for 8 damage',
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      expect(batched).toHaveLength(2);
      expect(batched[0].batchSize).toBe(1);
      expect(batched[1].batchSize).toBe(1);
    });

    it('should not batch strikes to different targets', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 10,
          narration: 'Alice strikes the Goblin for 10 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature2',
          targetName: 'Orc',
          damage: 12,
          narration: 'Alice strikes the Orc for 12 damage',
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      expect(batched).toHaveLength(2);
      expect(batched[0].batchSize).toBe(1);
      expect(batched[1].batchSize).toBe(1);
    });

    it('should never batch defeats (kills are satisfying)', () => {
      const events: CombatEvent[] = [
        {
          type: 'defeated',
          actorId: 'creature1',
          actorName: 'Goblin',
          narration: 'Goblin is defeated',
        },
        {
          type: 'defeated',
          actorId: 'creature2',
          actorName: 'Orc',
          narration: 'Orc is defeated',
        },
        {
          type: 'defeated',
          actorId: 'creature3',
          actorName: 'Troll',
          narration: 'Troll is defeated',
        },
      ];

      const classified = events.map(e => classifyEvent(e, false, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      // Each defeat should be unbatched
      expect(batched).toHaveLength(3);
      expect(batched[0].batchSize).toBe(1);
      expect(batched[1].batchSize).toBe(1);
      expect(batched[2].batchSize).toBe(1);
    });

    it('should batch multiple dodges from same actor', () => {
      const events: CombatEvent[] = [
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      expect(batched).toHaveLength(1);
      expect(batched[0].batchSize).toBe(3);
    });

    it('should prioritize player actions over enemy actions', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'creature1',
          actorName: 'Goblin',
          targetId: 'player1',
          targetName: 'Alice',
          damage: 8,
          narration: 'Goblin strikes Alice for 8 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 10,
          narration: 'Alice strikes the Goblin for 10 damage',
        },
      ];

      const classified = [
        classifyEvent(events[0], false, true), // enemy action
        classifyEvent(events[1], true, false), // player action
      ];

      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      // Player action should come first
      expect(batched[0].event.signalClass).toBe('player_action');
      expect(batched[1].event.signalClass).toBe('enemy_action');
    });

    it('should batch mixed event types separately', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 10,
          narration: 'Alice strikes the Goblin for 10 damage',
        },
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature2',
          targetName: 'Orc',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 12,
          narration: 'Alice strikes the Goblin for 12 damage',
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      // Should have 2 batches: 1 for strikes (2 events), 1 for dodge (1 event)
      expect(batched).toHaveLength(2);
      
      // Find strike batch
      const strikeBatch = batched.find(b => b.event.type === 'strike');
      expect(strikeBatch?.batchSize).toBe(2);
      expect(strikeBatch?.damageBatch).toEqual([10, 12]);
      
      // Find dodge batch
      const dodgeBatch = batched.find(b => b.event.type === 'dodge');
      expect(dodgeBatch?.batchSize).toBe(1);
    });
  });

  describe('narrateBatchedEvent', () => {
    it('should use original narration for unbatched event', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        narration: 'Alice strikes the Goblin for 10 damage',
      };

      const classified = classifyEvent(event, true, false);
      const batched: BatchedEvent = {
        event: classified,
        batchSize: 1,
      };

      const narration = narrateBatchedEvent(batched);
      expect(narration).toContain('Alice strikes the Goblin for 10 damage');
      expect(narration).toContain(COMBAT_ICONS.melee_attack);
    });

    it('should generate flurry narration for batched strikes', () => {
      const events: CombatEvent[] = [
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 4,
          narration: 'Alice strikes the Goblin for 4 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 5,
          narration: 'Alice strikes the Goblin for 5 damage',
        },
        {
          type: 'strike',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          damage: 6,
          narration: 'Alice strikes the Goblin for 6 damage',
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      const narration = narrateBatchedEvent(batched[0]);
      
      // Should contain flurry description
      expect(narration).toContain('flurry');
      expect(narration).toContain('4, 5, 6 damage');
      expect(narration).toContain('15 total');
      expect(narration).toContain(COMBAT_ICONS.melee_attack);
    });

    it('should generate multi-dodge narration for batched dodges', () => {
      const events: CombatEvent[] = [
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
        {
          type: 'dodge',
          actorId: 'player1',
          actorName: 'Alice',
          targetId: 'creature1',
          targetName: 'Goblin',
          narration: 'Alice dodges the attack',
          dodged: true,
        },
      ];

      const classified = events.map(e => classifyEvent(e, true, false));
      const batched = batchCombatEvents(classified, DEFAULT_BATCHING_RULES);

      const narration = narrateBatchedEvent(batched[0]);
      
      expect(narration).toContain('Alice dodges 3 attacks');
      expect(narration).toContain(COMBAT_ICONS.dodge);
    });

    it('should include icon prefix in narration', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        narration: 'Alice strikes the Goblin for 10 damage',
      };

      const classified = classifyEvent(event, true, false);
      const batched: BatchedEvent = {
        event: classified,
        batchSize: 1,
      };

      const narration = narrateBatchedEvent(batched);
      
      // Icon should be first character(s)
      expect(narration.startsWith(COMBAT_ICONS.melee_attack)).toBe(true);
    });
  });

  describe('Group-scale batching rules', () => {
    it('should respect protectDefeats rule', () => {
      const events: CombatEvent[] = [
        {
          type: 'defeated',
          actorId: 'creature1',
          actorName: 'Goblin',
          narration: 'Goblin is defeated',
        },
        {
          type: 'defeated',
          actorId: 'creature2',
          actorName: 'Orc',
          narration: 'Orc is defeated',
        },
      ];

      const classified = events.map(e => classifyEvent(e, false, false));
      const batched = batchCombatEvents(classified, {
        ...DEFAULT_BATCHING_RULES,
        protectDefeats: true,
      });

      // Each defeat should be unbatched
      expect(batched.every(b => b.batchSize === 1)).toBe(true);
    });

    it('should batch defeats when protectDefeats is false', () => {
      const events: CombatEvent[] = [
        {
          type: 'defeated',
          actorId: 'creature1',
          actorName: 'Goblin',
          narration: 'Goblin is defeated',
        },
        {
          type: 'defeated',
          actorId: 'creature1',
          actorName: 'Goblin',
          narration: 'Goblin is defeated',
        },
      ];

      const classified = events.map(e => classifyEvent(e, false, false));
      const batched = batchCombatEvents(classified, {
        ...DEFAULT_BATCHING_RULES,
        protectDefeats: false,
      });

      // Should be batched when protection is disabled
      expect(batched).toHaveLength(1);
      expect(batched[0].batchSize).toBe(2);
    });
  });
});
