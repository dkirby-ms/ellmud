/**
 * AmbientSystem — Orchestrates the living world of the Refuge.
 *
 * Drives weather, NPC behavior, faction events, and wandering merchants.
 * Each tick produces zero or more AmbientEvents, narrated by template
 * fallback (cache-first LLM enhancement planned).
 *
 * GDD §2.1 — The Refuge as a Living World
 */

import type {
  AmbientEvent,
  AmbientEventType,
  FactionId,
  FactionMilestone,
  WanderingMerchantDef,
  WanderingMerchantState,
} from '@ellmud/shared';

import { WeatherSystem, type WeatherConfig } from './WeatherSystem.js';
import { NPCSystem, type NPCEvent, REFUGE_NPCS } from './NPCSystem.js';
import { renderAmbientTemplate } from '../narrative/ambient-templates.js';
import type { NPCDefinition } from '@ellmud/shared';

// ─── Faction Event Definitions ──────────────────────────────────────────────

const DEFAULT_MILESTONES: FactionMilestone[] = [
  {
    factionId: 'ironhearth',
    name: 'barricade_raised',
    threshold: 100,
    description: 'Ironhearth workers raise a new barricade along the south wall.',
    reached: false,
  },
  {
    factionId: 'ironhearth',
    name: 'forge_expansion',
    threshold: 250,
    description: 'The Ironhearth forge expands — a second anvil glows beside the first.',
    reached: false,
  },
  {
    factionId: 'veilwalkers',
    name: 'ward_stones',
    threshold: 100,
    description: 'Veilwalker ward-stones flicker to life along the perimeter.',
    reached: false,
  },
  {
    factionId: 'veilwalkers',
    name: 'scrying_pool',
    threshold: 250,
    description: 'A scrying pool forms at the Veilwalker sanctum, its surface shimmering with distant visions.',
    reached: false,
  },
  {
    factionId: 'ashborn',
    name: 'banner_hung',
    threshold: 100,
    description: 'Ashborn banners — black flame on grey — now hang from the central pillar.',
    reached: false,
  },
  {
    factionId: 'ashborn',
    name: 'vendor_opens',
    threshold: 250,
    description: 'An Ashborn vendor sets up shop, offering salvage from beyond the veil.',
    reached: false,
  },
];

// ─── Wandering Merchant Definitions ─────────────────────────────────────────

const DEFAULT_WANDERING_MERCHANTS: WanderingMerchantDef[] = [
  {
    id: 'merchant-whisper',
    name: 'The Whispering Trader',
    arrivalInterval: 300,
    arrivalChance: 0.15,
    duration: 120,
    inventory: [
      { name: 'Shardglass Vial', stock: 3, description: 'A stoppered vial that hums with residual shard energy.' },
      { name: 'Voidtouched Compass', stock: 1, description: 'The needle points toward instability.' },
      { name: 'Pale Salve', stock: 5, description: 'Soothes wounds, leaves the skin translucent for hours.' },
    ],
    arrivalNarrative: 'A cloaked figure slips through the south gate, trailing mist. The Whispering Trader has arrived.',
    departureNarrative: 'The Whispering Trader melts into the fog as suddenly as they appeared. Their stall stands empty.',
  },
  {
    id: 'merchant-forge-daughter',
    name: 'Kael, Daughter of the Forge',
    arrivalInterval: 450,
    arrivalChance: 0.1,
    duration: 90,
    inventory: [
      { name: 'Ember-Tempered Blade', stock: 1, description: 'Still warm from the volcanic forges beyond the rift.' },
      { name: 'Ashen Shield', stock: 2, description: 'Light as bone, hard as regret.' },
    ],
    arrivalNarrative: 'A broad-shouldered woman strides in carrying an anvil on her back. Kael, Daughter of the Forge, sets up shop.',
    departureNarrative: 'Kael shoulders her anvil and departs without ceremony. The ground still smokes where she stood.',
  },
];

// ─── Ambient Atmosphere ─────────────────────────────────────────────────────

/** Ticks between atmosphere broadcasts. */
export const ATMOSPHERE_INTERVAL = 45;

// ─── System ─────────────────────────────────────────────────────────────────

export interface AmbientSystemConfig {
  weather?: Partial<WeatherConfig>;
  npcDefinitions?: NPCDefinition[];
  milestones?: FactionMilestone[];
  wanderingMerchants?: WanderingMerchantDef[];
  atmosphereInterval?: number;
  rng?: () => number;
}

export class AmbientSystem {
  readonly weather: WeatherSystem;
  readonly npcs: NPCSystem;

  private milestones: FactionMilestone[];
  private factionScores = new Map<FactionId, number>();
  private merchantDefs: WanderingMerchantDef[];
  private merchantStates = new Map<string, WanderingMerchantState>();

  private tickCount = 0;
  private readonly atmosphereInterval: number;
  private readonly rng: () => number;

  constructor(config: AmbientSystemConfig = {}) {
    this.rng = config.rng ?? Math.random;
    this.weather = new WeatherSystem(config.weather, this.rng);
    this.npcs = new NPCSystem(config.npcDefinitions ?? REFUGE_NPCS, this.rng);
    this.milestones = config.milestones
      ? config.milestones.map(m => ({ ...m }))
      : DEFAULT_MILESTONES.map(m => ({ ...m }));
    this.merchantDefs = config.wanderingMerchants ?? DEFAULT_WANDERING_MERCHANTS;
    this.atmosphereInterval = config.atmosphereInterval ?? ATMOSPHERE_INTERVAL;

    // Initialize faction scores
    for (const m of this.milestones) {
      if (!this.factionScores.has(m.factionId)) {
        this.factionScores.set(m.factionId, 0);
      }
    }

    // Initialize merchant states
    for (const def of this.merchantDefs) {
      this.merchantStates.set(def.id, {
        id: def.id,
        name: def.name,
        isPresent: false,
        ticksRemaining: 0,
        inventory: def.inventory.map(i => ({ ...i })),
      });
    }
  }

  /**
   * Advance one tick. Returns all ambient events that occurred.
   * Called from ShardRoom's setSimulationInterval.
   */
  tick(): AmbientEvent[] {
    this.tickCount++;
    const events: AmbientEvent[] = [];

    // Weather
    const weatherResult = this.weather.tick();
    if (weatherResult.weatherChanged) {
      events.push({
        type: 'weather_change',
        tick: this.tickCount,
        narrative: renderAmbientTemplate('weather_change', {
          weather: this.weather.getWeather(),
          previousWeather: weatherResult.oldWeather,
          timeOfDay: this.weather.getTimeOfDay(),
        }),
      });
    }
    if (weatherResult.timeChanged) {
      events.push({
        type: 'time_change',
        tick: this.tickCount,
        narrative: renderAmbientTemplate('time_change', {
          timeOfDay: this.weather.getTimeOfDay(),
          previousTime: weatherResult.oldTime,
          weather: this.weather.getWeather(),
        }),
      });
    }

    // NPCs
    const npcEvents = this.npcs.tick();
    for (const npcEvent of npcEvents) {
      events.push(this.npcEventToAmbient(npcEvent));
    }

    // Wandering merchants
    events.push(...this.tickMerchants());

    // Periodic atmosphere
    if (this.tickCount % this.atmosphereInterval === 0) {
      events.push({
        type: 'ambient_atmosphere',
        tick: this.tickCount,
        narrative: renderAmbientTemplate('ambient_atmosphere', {
          weather: this.weather.getWeather(),
          timeOfDay: this.weather.getTimeOfDay(),
        }),
      });
    }

    return events;
  }

  /** Add faction resources (triggers milestone checks). */
  addFactionScore(factionId: FactionId, amount: number): AmbientEvent[] {
    const current = this.factionScores.get(factionId) ?? 0;
    this.factionScores.set(factionId, current + amount);
    return this.checkMilestones(factionId);
  }

  /** Get faction score. */
  getFactionScore(factionId: FactionId): number {
    return this.factionScores.get(factionId) ?? 0;
  }

  /** Get all milestones for a faction. */
  getMilestones(factionId?: FactionId): FactionMilestone[] {
    if (factionId) return this.milestones.filter(m => m.factionId === factionId);
    return [...this.milestones];
  }

  /** Get wandering merchant states. */
  getMerchantStates(): WanderingMerchantState[] {
    return [...this.merchantStates.values()];
  }

  /** Get current tick count. */
  getTickCount(): number {
    return this.tickCount;
  }

  /** Generate a snapshot narration for a player joining the Refuge. */
  getJoinNarration(): string {
    const weather = this.weather.getWeather();
    const time = this.weather.getTimeOfDay();
    const presentNPCs = this.npcs.getAllNPCs().filter(n => n.isPresent);
    const presentMerchants = [...this.merchantStates.values()].filter(m => m.isPresent);

    return renderAmbientTemplate('join_snapshot', {
      weather,
      timeOfDay: time,
      npcCount: presentNPCs.length,
      merchantNames: presentMerchants.map(m => m.name),
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private npcEventToAmbient(event: NPCEvent): AmbientEvent {
    const typeMap: Record<NPCEvent['type'], AmbientEventType> = {
      move: 'npc_movement',
      idle: 'npc_idle',
      arrive: 'npc_arrival',
      depart: 'npc_departure',
    };

    return {
      type: typeMap[event.type],
      tick: this.tickCount,
      narrative: renderAmbientTemplate(typeMap[event.type], {
        npcName: event.npcName,
        role: event.role,
        location: event.location,
        previousLocation: event.previousLocation,
        idleAction: event.idleAction,
      }),
      metadata: { npcId: event.npcId, role: event.role },
    };
  }

  private tickMerchants(): AmbientEvent[] {
    const events: AmbientEvent[] = [];

    for (const def of this.merchantDefs) {
      const state = this.merchantStates.get(def.id)!;

      if (state.isPresent) {
        state.ticksRemaining--;
        if (state.ticksRemaining <= 0) {
          state.isPresent = false;
          events.push({
            type: 'merchant_departure',
            tick: this.tickCount,
            narrative: def.departureNarrative,
            metadata: { merchantId: def.id },
          });
          // Restock for next visit
          state.inventory = def.inventory.map(i => ({ ...i }));
        }
      } else if (this.tickCount % def.arrivalInterval === 0) {
        if (this.rng() < def.arrivalChance) {
          state.isPresent = true;
          state.ticksRemaining = def.duration;
          events.push({
            type: 'merchant_arrival',
            tick: this.tickCount,
            narrative: def.arrivalNarrative,
            metadata: { merchantId: def.id },
          });
        }
      }
    }

    return events;
  }

  private checkMilestones(factionId: FactionId): AmbientEvent[] {
    const score = this.factionScores.get(factionId) ?? 0;
    const events: AmbientEvent[] = [];

    for (const milestone of this.milestones) {
      if (milestone.factionId !== factionId) continue;
      if (milestone.reached) continue;
      if (score >= milestone.threshold) {
        milestone.reached = true;
        events.push({
          type: 'faction_event',
          tick: this.tickCount,
          narrative: milestone.description,
          metadata: { factionId, milestone: milestone.name },
        });
      }
    }

    return events;
  }
}
