/**
 * Tests for combat narration signal classification (GDD §6.6).
 */

import { describe, it, expect } from 'vitest';
import {
  classifyCombatEvent,
  classifyEvent,
  getEventIcon,
  COMBAT_ICONS,
  type SignalClass,
} from '../combat/signal-classification.js';
import type { CombatEvent } from '../combat/CombatState.js';

describe('Signal Classification (GDD §6.6)', () => {
  describe('classifyCombatEvent', () => {
    it('should classify player strike as player_action', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        narration: 'Alice strikes the Goblin for 10 damage',
      };

      const signalClass = classifyCombatEvent(event, true, false);
      expect(signalClass).toBe('player_action');
    });

    it('should classify enemy strike as enemy_action', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'creature1',
        actorName: 'Goblin',
        targetId: 'player1',
        targetName: 'Alice',
        damage: 8,
        narration: 'Goblin strikes Alice for 8 damage',
      };

      const signalClass = classifyCombatEvent(event, false, true);
      expect(signalClass).toBe('enemy_action');
    });

    it('should classify player dodge as player_action', () => {
      const event: CombatEvent = {
        type: 'dodge',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        narration: 'Alice dodges the attack',
        dodged: true,
      };

      const signalClass = classifyCombatEvent(event, true, false);
      expect(signalClass).toBe('player_action');
    });

    it('should classify player flee as player_action', () => {
      const event: CombatEvent = {
        type: 'flee',
        actorId: 'player1',
        actorName: 'Alice',
        narration: 'Alice flees the combat',
      };

      const signalClass = classifyCombatEvent(event, true, false);
      expect(signalClass).toBe('player_action');
    });

    it('should classify enemy defeat as enemy_action', () => {
      const event: CombatEvent = {
        type: 'defeated',
        actorId: 'creature1',
        actorName: 'Goblin',
        narration: 'Goblin is defeated',
      };

      const signalClass = classifyCombatEvent(event, false, false);
      expect(signalClass).toBe('enemy_action');
    });

    it('should classify player defeat as player_action', () => {
      const event: CombatEvent = {
        type: 'defeated',
        actorId: 'player1',
        actorName: 'Alice',
        narration: 'Alice is defeated',
      };

      const signalClass = classifyCombatEvent(event, true, false);
      expect(signalClass).toBe('player_action');
    });

    it('should classify combat_end as system', () => {
      const event: CombatEvent = {
        type: 'combat_end',
        actorId: 'system',
        actorName: 'System',
        narration: 'Combat ends',
      };

      const signalClass = classifyCombatEvent(event, false, false);
      expect(signalClass).toBe('system');
    });
  });

  describe('getEventIcon', () => {
    it('should return melee icon for strike', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        narration: 'Strike!',
      };

      const icon = getEventIcon(event);
      expect(icon).toBe(COMBAT_ICONS.melee_attack);
    });

    it('should return dodge icon for successful dodge', () => {
      const event: CombatEvent = {
        type: 'dodge',
        actorId: 'player1',
        actorName: 'Alice',
        narration: 'Dodge!',
        dodged: true,
      };

      const icon = getEventIcon(event);
      expect(icon).toBe(COMBAT_ICONS.dodge);
    });

    it('should return flee icon for flee', () => {
      const event: CombatEvent = {
        type: 'flee',
        actorId: 'player1',
        actorName: 'Alice',
        narration: 'Flee!',
      };

      const icon = getEventIcon(event);
      expect(icon).toBe(COMBAT_ICONS.flee);
    });

    it('should return defeat icon for defeated', () => {
      const event: CombatEvent = {
        type: 'defeated',
        actorId: 'creature1',
        actorName: 'Goblin',
        narration: 'Defeated!',
      };

      const icon = getEventIcon(event);
      expect(icon).toBe(COMBAT_ICONS.defeat);
    });

    it('should return undefined for combat_end', () => {
      const event: CombatEvent = {
        type: 'combat_end',
        actorId: 'system',
        actorName: 'System',
        narration: 'Combat ends',
      };

      const icon = getEventIcon(event);
      expect(icon).toBeUndefined();
    });
  });

  describe('classifyEvent', () => {
    it('should attach signal class and icon to event', () => {
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

      expect(classified.signalClass).toBe('player_action');
      expect(classified.icon).toBe(COMBAT_ICONS.melee_attack);
      expect(classified.type).toBe('strike');
      expect(classified.damage).toBe(10);
    });

    it('should preserve all event fields in classified event', () => {
      const event: CombatEvent = {
        type: 'strike',
        actorId: 'player1',
        actorName: 'Alice',
        targetId: 'creature1',
        targetName: 'Goblin',
        damage: 10,
        newHp: 40,
        maxHp: 50,
        narration: 'Alice strikes the Goblin for 10 damage',
      };

      const classified = classifyEvent(event, true, false);

      expect(classified.actorId).toBe('player1');
      expect(classified.actorName).toBe('Alice');
      expect(classified.targetId).toBe('creature1');
      expect(classified.targetName).toBe('Goblin');
      expect(classified.damage).toBe(10);
      expect(classified.newHp).toBe(40);
      expect(classified.maxHp).toBe(50);
      expect(classified.narration).toBe('Alice strikes the Goblin for 10 damage');
    });
  });

  describe('Icon constants', () => {
    it('should have all required icon types', () => {
      expect(COMBAT_ICONS.melee_attack).toBeDefined();
      expect(COMBAT_ICONS.ranged_attack).toBeDefined();
      expect(COMBAT_ICONS.block).toBeDefined();
      expect(COMBAT_ICONS.critical).toBeDefined();
      expect(COMBAT_ICONS.poison).toBeDefined();
      expect(COMBAT_ICONS.dodge).toBeDefined();
      expect(COMBAT_ICONS.flee).toBeDefined();
      expect(COMBAT_ICONS.defeat).toBeDefined();
    });

    it('should use emoji icons', () => {
      // All icons should be emoji strings (length varies due to emoji encoding)
      for (const icon of Object.values(COMBAT_ICONS)) {
        expect(icon.length).toBeGreaterThan(0);
        expect(icon.length).toBeLessThanOrEqual(4); // Some emoji are multi-byte
      }
    });
  });
});
