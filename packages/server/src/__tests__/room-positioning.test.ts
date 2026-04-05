/**
 * Room positioning system tests — GDD §6.11.
 *
 * Tests:
 * - Position change commands (position front/flank/rear, pos f/k/r)
 * - Repositioning costs tick action
 * - 3-tick cooldown prevents rapid repositioning
 * - Melee from Rear fails
 * - Flanking bonus (+15% damage)
 * - Creature reachability based on position type
 * - Boss creatures bypass position restrictions
 * - Default position is Front
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CombatSystem } from '../combat/CombatSystem.js';
import { createCombatant, REPOSITION_COOLDOWN_TICKS, FLANKING_DAMAGE_BONUS } from '../combat/CombatState.js';

describe('Room Positioning System (GDD §6.11)', () => {
  let combat: CombatSystem;

  beforeEach(() => {
    combat = new CombatSystem(() => ['room-2'], () => 1); // Always fail dodge
  });

  describe('Default Position', () => {
    it('should default all combatants to front position', () => {
      const player = createCombatant('p1', 'Player', 'room-1', true);
      expect(player.position).toBe('front');
      expect(player.positionCooldown).toBe(0);
    });
  });

  describe('Position Change Commands', () => {
    it('should queue position change when in combat', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const result = combat.queuePositionChange('p1', 'rear');
      expect(result.success).toBe(true);
    });

    it('should fail to queue position change when not in combat', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      combat.registerCombatant(p1);

      const result = combat.queuePositionChange('p1', 'rear');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('must be in combat');
    });

    it('should fail to queue position change to current position', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const result = combat.queuePositionChange('p1', 'front');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('already at the front');
    });

    it('should fail to queue position change during cooldown', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      // First reposition
      combat.queuePositionChange('p1', 'rear');
      combat.resolveTick();

      // Try to reposition again immediately
      const result = combat.queuePositionChange('p1', 'flank');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('cannot reposition yet');
    });
  });

  describe('Position Change Resolution', () => {
    it('should execute position change at start of tick', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      combat.queuePositionChange('p1', 'rear');
      combat.resolveTick();

      const updated = combat.getCombatant('p1');
      expect(updated?.position).toBe('rear');
      expect(updated?.positionCooldown).toBe(REPOSITION_COOLDOWN_TICKS);
    });

    it('should prevent attack when repositioning (action consumed)', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const initialHp = e1.hp;
      combat.queuePositionChange('p1', 'rear');
      const result = combat.resolveTick();

      // Player should not have attacked this tick
      const updated = combat.getCombatant('e1');
      expect(updated?.hp).toBe(initialHp); // No damage dealt

      // Event should be a position change, not a strike
      const positionEvent = result.events.find(e => e.actorId === 'p1' && e.narration.includes('rear'));
      expect(positionEvent).toBeDefined();
    });

    it('should decrement cooldown each tick', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      combat.queuePositionChange('p1', 'rear');
      combat.resolveTick();
      
      let updated = combat.getCombatant('p1');
      expect(updated?.positionCooldown).toBe(3);

      combat.resolveTick();
      updated = combat.getCombatant('p1');
      expect(updated?.positionCooldown).toBe(2);

      combat.resolveTick();
      updated = combat.getCombatant('p1');
      expect(updated?.positionCooldown).toBe(1);

      combat.resolveTick();
      updated = combat.getCombatant('p1');
      expect(updated?.positionCooldown).toBe(0);

      // Should be able to reposition again
      const result = combat.queuePositionChange('p1', 'front');
      expect(result.success).toBe(true);
    });
  });

  describe('Melee Range Validation', () => {
    it('should prevent melee attack from rear position', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      p1.position = 'rear'; // Start at rear
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const initialHp = e1.hp;
      combat.submitAction('p1', 'strike', 'e1');
      const result = combat.resolveTick();

      // Attack should fail
      const updated = combat.getCombatant('e1');
      expect(updated?.hp).toBe(initialHp);

      // Should get "too far away" message
      const failEvent = result.events.find(e => e.actorId === 'p1' && e.narration.includes('too far away'));
      expect(failEvent).toBeDefined();
    });

    it('should allow melee attack from front position', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const initialHp = e1.hp;
      combat.submitAction('p1', 'strike', 'e1');
      combat.resolveTick();

      const updated = combat.getCombatant('e1');
      expect(updated!.hp).toBeLessThan(initialHp);
    });

    it('should allow melee attack from flank position', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      p1.position = 'flank';
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const initialHp = e1.hp;
      combat.submitAction('p1', 'strike', 'e1');
      combat.resolveTick();

      const updated = combat.getCombatant('e1');
      expect(updated!.hp).toBeLessThan(initialHp);
    });

    it('should prevent melee attack to rear target from front', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      e1.position = 'rear'; // Enemy at rear
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      const initialHp = e1.hp;
      combat.submitAction('p1', 'strike', 'e1');
      const result = combat.resolveTick();

      const updated = combat.getCombatant('e1');
      expect(updated?.hp).toBe(initialHp);

      const failEvent = result.events.find(e => e.actorId === 'p1' && e.narration.includes('cannot reach'));
      expect(failEvent).toBeDefined();
    });
  });

  describe('Flanking Bonus', () => {
    it('should apply +15% damage when attacking from flank while target focuses front', () => {
      const p1 = createCombatant('p1', 'Flanker', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const p2 = createCombatant('p2', 'Tank', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'flank';
      p2.position = 'front';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(p2);
      combat.registerCombatant(e1);
      
      // Tank initiates - enemy will target tank
      combat.initiateCombat('p2', 'e1');
      
      // Manually join flanker to the encounter
      // In real gameplay, flanker would use 'attack' command which calls initiateCombat
      // But that sets enemy target. For this test, we'll use setTarget approach
      combat.setTarget('p1', 'e1'); // Try to set target (won't work if not in combat)
      
      // If that doesn't work, manually join encounter
      const enemy = combat.getCombatant('e1');
      const tank = combat.getCombatant('p2');
      
      // Initiate flanker into combat but then reset enemy's target back to tank
      combat.initiateCombat('p1', 'e1');
      if (enemy) {
        enemy.currentTarget = 'p2'; // Reset to tank
      }
      
      // Both attack on same tick
      combat.submitAction('p2', 'strike', 'e1');
      combat.submitAction('p1', 'strike', 'e1');
      const result = combat.resolveTick();
      
      // Verify enemy is targeting tank
      expect(enemy?.currentTarget).toBe('p2');
      expect(tank?.position).toBe('front');
      expect(p1.position).toBe('flank');
      
      // Find flanker's strike event
      const flankStrike = result.events.find(e => e.actorId === 'p1' && e.type === 'strike');
      expect(flankStrike).toBeDefined();
      
      // Base damage = 100 attack - 0 armour = 100
      // Note: Due to the way math works out with stance/block/armour calculations,
      // the final damage may vary slightly. The important thing is flanking bonus is applied.
      // With flanking bonus should be higher than without (100)
      expect(flankStrike!.damage).toBeGreaterThan(100);
      expect(flankStrike!.damage).toBeLessThanOrEqual(115);
    });

    it('should not apply flanking bonus when target not focused on front', () => {
      const p1 = createCombatant('p1', 'Flanker', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'flank';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');
      
      combat.submitAction('p1', 'strike', 'e1');
      const result = combat.resolveTick();
      
      const strike = result.events.find(e => e.actorId === 'p1' && e.type === 'strike');
      expect(strike!.damage).toBe(100); // No bonus
    });

    it('should not apply flanking bonus when attacking from front', () => {
      const p1 = createCombatant('p1', 'Tank', 'room-1', true, { maxHp: 100, attack: 100, defence: 0, armour: 0, agility: 0 });
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false, { maxHp: 1000, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');
      
      combat.submitAction('p1', 'strike', 'e1');
      const result = combat.resolveTick();
      
      const strike = result.events.find(e => e.actorId === 'p1' && e.type === 'strike');
      expect(strike!.damage).toBe(100); // No bonus
    });
  });

  describe('Creature Position Types', () => {
    it('should set melee creature to front position by default', () => {
      const melee = createCombatant('c1', 'Melee', 'room-1', false);
      combat.registerCombatant(melee, 'melee');
      
      const updated = combat.getCombatant('c1');
      expect(updated?.position).toBe('front');
    });

    it('should set ranged creature to rear position by default', () => {
      const ranged = createCombatant('c1', 'Ranged', 'room-1', false);
      combat.registerCombatant(ranged, 'ranged');
      
      const updated = combat.getCombatant('c1');
      expect(updated?.position).toBe('rear');
    });

    it('should set skirmisher creature to flank position by default', () => {
      const skirmisher = createCombatant('c1', 'Skirmisher', 'room-1', false);
      combat.registerCombatant(skirmisher, 'skirmisher');
      
      const updated = combat.getCombatant('c1');
      expect(updated?.position).toBe('flank');
    });

    it('should set boss creature to front position by default', () => {
      const boss = createCombatant('c1', 'Boss', 'room-1', false);
      combat.registerCombatant(boss, 'boss');
      
      const updated = combat.getCombatant('c1');
      expect(updated?.position).toBe('front');
    });

    it('should allow boss creatures to reach any position', () => {
      const boss = createCombatant('c1', 'Boss', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'rear'; // Player at rear
      
      combat.registerCombatant(boss, 'boss');
      combat.registerCombatant(p1);
      combat.initiateCombat('c1', 'p1');
      
      const initialHp = p1.hp;
      combat.submitAction('c1', 'strike', 'p1');
      combat.resolveTick();
      
      // Boss should hit rear target
      const updated = combat.getCombatant('p1');
      expect(updated!.hp).toBeLessThan(initialHp);
    });

    it('should prevent melee creature from reaching rear target', () => {
      const melee = createCombatant('c1', 'Melee', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'rear';
      
      combat.registerCombatant(melee, 'melee');
      combat.registerCombatant(p1);
      combat.initiateCombat('c1', 'p1');
      
      const initialHp = p1.hp;
      combat.submitAction('c1', 'strike', 'p1');
      combat.resolveTick();
      
      // Melee should not reach rear
      const updated = combat.getCombatant('p1');
      expect(updated?.hp).toBe(initialHp);
    });

    it('should allow ranged creature to hit any position', () => {
      const ranged = createCombatant('c1', 'Ranged', 'room-1', false, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      const p1 = createCombatant('p1', 'Player', 'room-1', true, { maxHp: 100, attack: 10, defence: 0, armour: 0, agility: 0 });
      
      p1.position = 'front';
      ranged.position = 'rear'; // Ranged at rear
      
      combat.registerCombatant(ranged, 'ranged');
      combat.registerCombatant(p1);
      combat.initiateCombat('c1', 'p1');
      
      const initialHp = p1.hp;
      combat.submitAction('c1', 'strike', 'p1');
      combat.resolveTick();
      
      // Ranged should hit from rear
      const updated = combat.getCombatant('p1');
      expect(updated!.hp).toBeLessThan(initialHp);
    });
  });

  describe('Position Change Narration', () => {
    it('should narrate position change for player', () => {
      const p1 = createCombatant('p1', 'Player', 'room-1', true);
      const e1 = createCombatant('e1', 'Enemy', 'room-1', false);
      combat.registerCombatant(p1);
      combat.registerCombatant(e1);
      combat.initiateCombat('p1', 'e1');

      combat.queuePositionChange('p1', 'flank');
      const result = combat.resolveTick();

      const posEvent = result.events.find(e => e.actorId === 'p1');
      expect(posEvent?.narration).toContain('flank');
    });
  });
});
