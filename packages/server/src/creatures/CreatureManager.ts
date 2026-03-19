/**
 * CreatureManager — manages all creatures in a shard instance.
 *
 * Responsibilities:
 * - Spawn creatures during shard seeding (deterministic placement)
 * - Tick all creature behaviors each game tick
 * - Provide room queries for look/combat
 * - Handle creature death and loot generation
 */

import type { RoomGraph, Room } from '@ellmud/shared';
import type { PRNG } from '../shard/prng.js';
import type { Creature, CreatureTemplate, CreatureAction } from './types.js';
import { updateCreature, type CreatureWorldState } from './behavior.js';
import { generateLoot, type LootItem } from './loot.js';
import type { Combatant } from '../combat/CombatState.js';

export class CreatureManager {
  private creatures = new Map<string, Creature>();
  private nextCreatureId = 0;

  // ─── Spawning ──────────────────────────────────────────────────────────────

  /**
   * Spawn creatures into a shard's room graph during seeding.
   * Uses seeded PRNG for deterministic placement.
   */
  spawnCreatures(roomGraph: RoomGraph, template: CreatureTemplate, prng: PRNG): Creature[] {
    const count = prng.nextInt(template.spawnRules.minCount, template.spawnRules.maxCount);
    const eligibleRooms = this.getEligibleRooms(roomGraph, template);

    if (eligibleRooms.length === 0) return [];

    const spawned: Creature[] = [];
    const shuffled = prng.shuffle([...eligibleRooms]);

    for (let i = 0; i < count && i < shuffled.length; i++) {
      const room = shuffled[i];
      const creature = this.createCreature(template, room.id, prng);
      this.creatures.set(creature.id, creature);
      spawned.push(creature);
    }

    return spawned;
  }

  private getEligibleRooms(roomGraph: RoomGraph, template: CreatureTemplate): Room[] {
    const eligible: Room[] = [];
    const { preferredRoomTypes, forbiddenRoomTypes } = template.spawnRules;

    // First pass: collect preferred rooms
    for (const room of roomGraph.rooms.values()) {
      if (forbiddenRoomTypes.includes(room.type)) continue;
      if (preferredRoomTypes.length === 0 || preferredRoomTypes.includes(room.type)) {
        eligible.push(room);
      }
    }

    // If no preferred rooms found, fall back to any non-forbidden room
    if (eligible.length === 0) {
      for (const room of roomGraph.rooms.values()) {
        if (!forbiddenRoomTypes.includes(room.type)) {
          eligible.push(room);
        }
      }
    }

    return eligible;
  }

  private createCreature(template: CreatureTemplate, roomId: string, prng: PRNG): Creature {
    const id = `creature-${this.nextCreatureId++}`;
    const idleTarget = prng.nextInt(template.idleTicksMin, template.idleTicksMax);

    return {
      id,
      type: template.type,
      name: template.name,
      hp: template.stats.maxHp,
      maxHp: template.stats.maxHp,
      attack: template.stats.attack,
      defence: template.stats.defence,
      armour: template.stats.armour,
      currentRoomId: roomId,
      behaviorState: 'idle',
      idleTicks: 0,
      idleTicksTarget: idleTarget,
      alertTargetRoomId: null,
      lootTable: [...template.lootTable],
      isAlive: true,
    };
  }

  // ─── Tick Update ───────────────────────────────────────────────────────────

  /**
   * Update all living creatures for this tick.
   * Returns the list of actions creatures want to take.
   */
  updateAll(world: CreatureWorldState, fleeThresholds?: Map<string, number>): CreatureAction[] {
    const actions: CreatureAction[] = [];

    for (const creature of this.creatures.values()) {
      if (!creature.isAlive) continue;

      const threshold = fleeThresholds?.get(creature.id) ?? 0.25;
      const action = updateCreature(creature, world, threshold);
      actions.push(action);

      // Apply movement from patrol/alert actions
      if (action.type === 'patrol_move' || action.type === 'alert_move') {
        if (action.targetRoomId) {
          creature.currentRoomId = action.targetRoomId;
        }
      }
    }

    return actions;
  }

  // ─── Queries ───────────────────────────────────────────────────────────────

  getCreature(id: string): Creature | undefined {
    return this.creatures.get(id);
  }

  getCreaturesInRoom(roomId: string): Creature[] {
    const result: Creature[] = [];
    for (const creature of this.creatures.values()) {
      if (creature.isAlive && creature.currentRoomId === roomId) {
        result.push(creature);
      }
    }
    return result;
  }

  getAllCreatures(): Creature[] {
    return [...this.creatures.values()];
  }

  getLivingCreatures(): Creature[] {
    return [...this.creatures.values()].filter(c => c.isAlive);
  }

  // ─── Death & Loot ──────────────────────────────────────────────────────────

  /**
   * Mark a creature as dead and generate its loot.
   * Returns loot items to be placed in the room.
   */
  removeCreature(id: string): LootItem[] {
    const creature = this.creatures.get(id);
    if (!creature || !creature.isAlive) return [];

    creature.isAlive = false;
    creature.hp = 0;
    return generateLoot(creature);
  }

  /**
   * Get loot that would drop from a creature without killing it.
   * Useful for previewing drops.
   */
  getCreatureLoot(creature: Creature): LootItem[] {
    return generateLoot(creature);
  }

  // ─── Combat Integration ────────────────────────────────────────────────────

  /**
   * Convert a creature to a Combatant for the combat system.
   * Creatures use the same combat resolution as players.
   */
  toCombatant(creature: Creature): Combatant {
    return {
      id: creature.id,
      name: creature.name,
      hp: creature.hp,
      maxHp: creature.maxHp,
      attack: creature.attack,
      defence: creature.defence,
      armour: creature.armour,
      roomId: creature.currentRoomId,
      isPlayer: false,
    };
  }

  /**
   * Sync combat system HP back to creature after tick resolution.
   */
  syncFromCombat(combatant: Combatant): void {
    const creature = this.creatures.get(combatant.id);
    if (!creature) return;
    creature.hp = combatant.hp;
    creature.currentRoomId = combatant.roomId;
    if (combatant.hp <= 0) {
      creature.isAlive = false;
    }
  }
}
