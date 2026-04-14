/**
 * CreatureManager — manages all creatures in a zone instance.
 *
 * Responsibilities:
 * - Spawn creatures during zone seeding (deterministic placement)
 * - Spawn zone-defined NPCs from ZoneData
 * - Tick all creature behaviors each game tick
 * - Provide room queries for look/combat
 * - Handle creature death and loot generation
 */

import type { RoomGraph, Room, ZoneData } from '@ellmud/shared';
import type { PRNG } from '../generator/prng.js';
import type { Creature, CreatureTemplate, CreatureAction } from './types.js';
import { updateCreature, type CreatureWorldState } from './behavior.js';
import { generateLoot, type LootItem } from './loot.js';
import type { Combatant, CombatStats } from '../combat/CombatState.js';
import { createCombatant } from '../combat/CombatState.js';
import { calculateCreatureEffectiveStats } from '../combat/stats.js';
import { DROWNED_REVENANT } from './templates/drowned-revenant.js';
import { getContentRegistry } from '../content/index.js';
import type { CreaturePositionType } from '@ellmud/shared';

/** Hardcoded fallback — used when ContentRegistry is not initialized. */
const FALLBACK_TEMPLATES = new Map<string, CreatureTemplate>([
  ['drowned_revenant', DROWNED_REVENANT],
]);

/** Get all creature templates (for admin UI). */
export function getAllCreatureTemplates(): CreatureTemplate[] {
  const registry = getContentRegistry();
  if (registry) return registry.getAllCreatures();
  return Array.from(FALLBACK_TEMPLATES.values());
}

/** Resolve a creature template by slug/type, checking ContentRegistry first. */
function resolveCreatureTemplate(id: string): CreatureTemplate | undefined {
  const registry = getContentRegistry();
  if (registry) return registry.getCreature(id);
  return FALLBACK_TEMPLATES.get(id);
}

/** Tracks a zone-spawned creature for repop. */
interface ZoneCreatureRecord {
  creatureId: string;
  roomSlug: string;
  templateId: string;
}

export class CreatureManager {
  private creatures = new Map<string, Creature>();
  private nextCreatureId = 0;
  /** Zone creature records for repop tracking. */
  private zoneCreatureRecords: ZoneCreatureRecord[] = [];
  /** Maps creature ID to its template for position type lookup. */
  private creatureTemplates = new Map<string, CreatureTemplate>();

  // ─── Spawning ──────────────────────────────────────────────────────────────

  /**
   * Spawn creatures into a zone's room graph during seeding.
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

    // Track template for position type lookup
    this.creatureTemplates.set(id, template);

    return {
      id,
      type: template.type,
      name: template.name,
      hp: template.stats.maxHp,
      maxHp: template.stats.maxHp,
      unarmed: template.stats.unarmed,
      oneHanded: template.stats.oneHanded,
      twoHanded: template.stats.twoHanded,
      ranged: template.stats.ranged,
      armour: template.stats.armour,
      dodge: template.stats.dodge,
      shieldBlock: template.stats.shieldBlock,
      currentRoomId: roomId,
      behaviorState: 'idle',
      idleTicks: 0,
      idleTicksTarget: idleTarget,
      alertTargetRoomId: null,
      lootTable: [...template.lootTable],
      isAlive: true,
      aggressive: template.aggressive,
      roomDescription: template.roomDescription,
      positionType: template.positionType,
    };
  }

  /**
   * Admin-triggered spawn: place a single creature of the given template in a specific room.
   * Unlike spawnCreatures(), this is not PRNG-seeded — used for runtime admin actions.
   */
  spawnSingleCreature(template: CreatureTemplate, roomId: string): Creature {
    const id = `creature-${this.nextCreatureId++}`;
    const idleTarget = Math.floor(
      (template.idleTicksMin + template.idleTicksMax) / 2
    );

    // Track template for position type lookup
    this.creatureTemplates.set(id, template);

    const creature: Creature = {
      id,
      type: template.type,
      name: template.name,
      hp: template.stats.maxHp,
      maxHp: template.stats.maxHp,
      unarmed: template.stats.unarmed,
      oneHanded: template.stats.oneHanded,
      twoHanded: template.stats.twoHanded,
      ranged: template.stats.ranged,
      armour: template.stats.armour,
      dodge: template.stats.dodge,
      shieldBlock: template.stats.shieldBlock,
      currentRoomId: roomId,
      behaviorState: 'idle',
      idleTicks: 0,
      idleTicksTarget: idleTarget,
      alertTargetRoomId: null,
      lootTable: [...template.lootTable],
      isAlive: true,
      aggressive: template.aggressive,
      roomDescription: template.roomDescription,
      positionType: template.positionType,
    };

    this.creatures.set(creature.id, creature);
    return creature;
  }

  // ─── Sandbox Spawning ──────────────────────────────────────────────────────

  /**
   * Spawn creature(s) from a template into a specific room at runtime.
   * Used by the combat sandbox. Creatures are tagged with sandbox: true.
   */
  spawnCreatureInRoom(templateId: string, roomId: string, count = 1): Creature[] {
    const template = resolveCreatureTemplate(templateId);
    if (!template) return [];

    const spawned: Creature[] = [];
    for (let i = 0; i < count; i++) {
      const creature = this.spawnSingleCreature(template, roomId);
      creature.sandbox = true;
      spawned.push(creature);
    }
    return spawned;
  }

  /**
   * Remove all creatures from a specific room. Returns the count removed.
   * Used by sandbox reset/kill commands.
   */
  clearCreaturesInRoom(roomId: string): number {
    let count = 0;
    for (const creature of this.creatures.values()) {
      if (creature.currentRoomId === roomId) {
        creature.isAlive = false;
        creature.hp = 0;
        this.creatures.delete(creature.id);
        count++;
      }
    }
    return count;
  }

  // ─── Zone-based Spawning ────────────────────────────────────────────────────

  /**
   * Spawn creatures defined by zone room NPC data.
   * Each zone room may have npcs: [{ creatureId, spawnCount, behavior }].
   */
  spawnCreaturesFromZone(zoneData: ZoneData): Creature[] {
    const spawned: Creature[] = [];

    for (const zoneRoom of zoneData.rooms) {
      for (const npc of zoneRoom.npcs) {
        const template = resolveCreatureTemplate(npc.creatureId);
        if (!template) continue;

        for (let i = 0; i < npc.spawnCount; i++) {
          const creature = this.createZoneCreature(template, zoneRoom.slug);
          this.creatures.set(creature.id, creature);
          this.zoneCreatureRecords.push({
            creatureId: creature.id,
            roomSlug: zoneRoom.slug,
            templateId: npc.creatureId,
          });
          spawned.push(creature);
        }
      }
    }

    return spawned;
  }

  /**
   * Respawn killed zone creatures during a repop cycle.
   * Only respawns creatures that were killed since last repop.
   */
  respawnZoneCreatures(_zoneData: ZoneData): Creature[] {
    const respawned: Creature[] = [];

    for (const record of this.zoneCreatureRecords) {
      const existing = this.creatures.get(record.creatureId);
      if (existing && existing.isAlive) continue;

      const template = resolveCreatureTemplate(record.templateId);
      if (!template) continue;

      // Remove the dead creature entry
      if (existing) this.creatures.delete(record.creatureId);

      // Create a fresh creature in the same room
      const creature = this.createZoneCreature(template, record.roomSlug);
      this.creatures.set(creature.id, creature);

      // Update the record to point to the new creature
      record.creatureId = creature.id;
      respawned.push(creature);
    }

    return respawned;
  }

  private createZoneCreature(template: CreatureTemplate, roomId: string): Creature {
    const id = `creature-${this.nextCreatureId++}`;
    const idleTarget = Math.floor(
      (template.idleTicksMin + template.idleTicksMax) / 2,
    );

    return {
      id,
      type: template.type,
      name: template.name,
      hp: template.stats.maxHp,
      maxHp: template.stats.maxHp,
      unarmed: template.stats.unarmed,
      oneHanded: template.stats.oneHanded,
      twoHanded: template.stats.twoHanded,
      ranged: template.stats.ranged,
      armour: template.stats.armour,
      dodge: template.stats.dodge,
      shieldBlock: template.stats.shieldBlock,
      currentRoomId: roomId,
      behaviorState: 'idle',
      idleTicks: 0,
      idleTicksTarget: idleTarget,
      alertTargetRoomId: null,
      lootTable: [...template.lootTable],
      isAlive: true,
      aggressive: template.aggressive,
      roomDescription: template.roomDescription,
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
          action.sourceRoomId = creature.currentRoomId;
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
    const baseStats: CombatStats = {
      maxHp: creature.maxHp,
      unarmed: creature.unarmed,
      oneHanded: creature.oneHanded,
      twoHanded: creature.twoHanded,
      ranged: creature.ranged,
      shieldBlock: creature.shieldBlock,
      dodge: creature.dodge,
      armour: creature.armour,
    };
    const effective = calculateCreatureEffectiveStats(baseStats);
    const combatant = createCombatant(
      creature.id,
      creature.name,
      creature.currentRoomId,
      false, // isPlayer
      {
        maxHp: effective.maxHp,
        attack: effective.attack,
        armour: effective.armour,
        dodge: effective.dodge,
        shieldBlock: effective.shieldBlock,
      },
    );
    
    // Override with current HP
    combatant.hp = creature.hp;
    
    return combatant;
  }

  /**
   * Get the position type for a creature (for combat system registration).
   */
  getCreaturePositionType(creatureId: string): CreaturePositionType | undefined {
    const template = this.creatureTemplates.get(creatureId);
    return template?.positionType ?? 'melee'; // Default to melee if not specified
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
