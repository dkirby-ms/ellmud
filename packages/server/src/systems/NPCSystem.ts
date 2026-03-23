/**
 * NPCSystem — Pre-programmed NPC behaviors for the Refuge.
 *
 * NPC types:
 *   - Merchants: patrol between stalls on a fixed route
 *   - Faction Reps: hold court at fixed locations, periodic announcements
 *   - Refugees: arrive and depart on schedule
 *
 * GDD §2.1 — NPC activity
 */

import type { NPCDefinition, NPCState, NPCRole } from '@ellmud/shared';

export interface NPCEvent {
  type: 'move' | 'idle' | 'arrive' | 'depart';
  npcId: string;
  npcName: string;
  role: NPCRole;
  location: string;
  previousLocation?: string;
  idleAction?: string;
}

/** Default NPC definitions for the Refuge. */
export const REFUGE_NPCS: NPCDefinition[] = [
  {
    id: 'merchant-greta',
    name: 'Greta the Provisioner',
    role: 'merchant',
    patrolRoute: ['market-square', 'east-stalls', 'weapon-row', 'market-square'],
    idleActions: [
      'arranges wares on a crooked table',
      'haggles with a hooded buyer',
      'polishes a dented helm with a rag',
      'counts coins into a leather pouch',
    ],
    patrolInterval: 30,
  },
  {
    id: 'merchant-tobren',
    name: 'Tobren the Alchemist',
    role: 'merchant',
    patrolRoute: ['apothecary-corner', 'market-square', 'apothecary-corner'],
    idleActions: [
      'grinds herbs in a stone mortar',
      'holds a vial to the light, squinting',
      'mutters over a stained recipe book',
      'decants a smoking liquid into a flask',
    ],
    patrolInterval: 45,
  },
  {
    id: 'faction-ironhearth',
    name: 'Commander Vane',
    role: 'faction_rep',
    patrolRoute: ['ironhearth-hall'],
    idleActions: [
      'studies a map pinned to the wall',
      'issues quiet orders to a runner',
      'sharpens a blade with measured strokes',
      'stares into the middle distance, jaw set',
    ],
    patrolInterval: 0,
  },
  {
    id: 'faction-veilwalkers',
    name: 'Seer Miravel',
    role: 'faction_rep',
    patrolRoute: ['veilwalker-sanctum'],
    idleActions: [
      'traces sigils in the air with pale fingers',
      'whispers to an unseen presence',
      'studies a shard-fragment that pulses faintly',
      'closes her eyes and tilts her head, listening',
    ],
    patrolInterval: 0,
  },
  {
    id: 'faction-ashborn',
    name: 'Forge-Keeper Dunn',
    role: 'faction_rep',
    patrolRoute: ['ashborn-forge'],
    idleActions: [
      'hammers glowing metal on the anvil',
      'wipes soot from a broad face',
      'inspects a newly forged blade, unimpressed',
      'stokes the forge fire higher',
    ],
    patrolInterval: 0,
  },
  {
    id: 'refugee-wanderer',
    name: 'a weary refugee',
    role: 'refugee',
    patrolRoute: ['south-gate', 'central-plaza', 'refugee-camp'],
    idleActions: [
      'sits by the fire, staring at nothing',
      'clutches a bundle of belongings',
      'whispers urgently to a companion',
      'eats from a dented tin bowl',
    ],
    patrolInterval: 40,
  },
  {
    id: 'refugee-group',
    name: 'a small group of survivors',
    role: 'refugee',
    patrolRoute: ['south-gate', 'central-plaza'],
    idleActions: [
      'huddles together, sharing warmth',
      'argues in low tones about the road ahead',
      'tends a wounded companion',
      'scans the horizon with hollow eyes',
    ],
    patrolInterval: 60,
  },
];

/** Ticks between idle action broadcasts. */
export const NPC_IDLE_INTERVAL = 15;

export class NPCSystem {
  private npcs = new Map<string, NPCState>();
  private definitions = new Map<string, NPCDefinition>();
  private tickCount = 0;
  private readonly rng: () => number;

  constructor(definitions?: NPCDefinition[], rng?: () => number) {
    this.rng = rng ?? Math.random;
    const defs = definitions ?? REFUGE_NPCS;
    for (const def of defs) {
      this.definitions.set(def.id, def);
      this.npcs.set(def.id, {
        id: def.id,
        name: def.name,
        role: def.role,
        currentLocation: def.patrolRoute[0]!,
        patrolIndex: 0,
        idleTick: 0,
        isPresent: def.role !== 'refugee',
      });
    }
  }

  /** Get all NPC states. */
  getAllNPCs(): NPCState[] {
    return [...this.npcs.values()];
  }

  /** Get NPCs at a specific location. */
  getNPCsAt(location: string): NPCState[] {
    return [...this.npcs.values()].filter(
      npc => npc.isPresent && npc.currentLocation === location,
    );
  }

  /** Get a specific NPC state. */
  getNPC(id: string): NPCState | undefined {
    return this.npcs.get(id);
  }

  /**
   * Advance one tick. Returns all NPC events that occurred.
   */
  tick(): NPCEvent[] {
    this.tickCount++;
    const events: NPCEvent[] = [];

    for (const [id, state] of this.npcs) {
      const def = this.definitions.get(id)!;

      // Refugee arrival/departure
      if (def.role === 'refugee') {
        const refugeeEvents = this.tickRefugee(state, def);
        events.push(...refugeeEvents);
      }

      if (!state.isPresent) continue;

      // Patrol movement
      if (def.patrolInterval > 0 && def.patrolRoute.length > 1) {
        if (this.tickCount % def.patrolInterval === 0) {
          const prevLocation = state.currentLocation;
          state.patrolIndex = (state.patrolIndex + 1) % def.patrolRoute.length;
          state.currentLocation = def.patrolRoute[state.patrolIndex]!;
          if (state.currentLocation !== prevLocation) {
            events.push({
              type: 'move',
              npcId: id,
              npcName: state.name,
              role: state.role,
              location: state.currentLocation,
              previousLocation: prevLocation,
            });
          }
        }
      }

      // Idle actions
      state.idleTick++;
      if (state.idleTick >= NPC_IDLE_INTERVAL && def.idleActions.length > 0) {
        state.idleTick = 0;
        const action = def.idleActions[Math.floor(this.rng() * def.idleActions.length)]!;
        events.push({
          type: 'idle',
          npcId: id,
          npcName: state.name,
          role: state.role,
          location: state.currentLocation,
          idleAction: action,
        });
      }
    }

    return events;
  }

  /** Spawn a refugee (make present). */
  spawnRefugee(id: string): void {
    const state = this.npcs.get(id);
    if (state) {
      state.isPresent = true;
      state.patrolIndex = 0;
      const def = this.definitions.get(id);
      if (def) state.currentLocation = def.patrolRoute[0]!;
    }
  }

  /** Despawn a refugee. */
  despawnRefugee(id: string): void {
    const state = this.npcs.get(id);
    if (state) state.isPresent = false;
  }

  private tickRefugee(state: NPCState, def: NPCDefinition): NPCEvent[] {
    const events: NPCEvent[] = [];
    const arrivalChance = 0.02;
    const departureChance = 0.01;

    if (!state.isPresent) {
      if (this.rng() < arrivalChance) {
        state.isPresent = true;
        state.patrolIndex = 0;
        state.currentLocation = def.patrolRoute[0]!;
        events.push({
          type: 'arrive',
          npcId: state.id,
          npcName: state.name,
          role: 'refugee',
          location: state.currentLocation,
        });
      }
    } else {
      // Only depart if at the end of patrol route
      if (state.patrolIndex === def.patrolRoute.length - 1 && this.rng() < departureChance) {
        events.push({
          type: 'depart',
          npcId: state.id,
          npcName: state.name,
          role: 'refugee',
          location: state.currentLocation,
        });
        state.isPresent = false;
      }
    }

    return events;
  }
}
