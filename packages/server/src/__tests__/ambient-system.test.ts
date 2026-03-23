import { describe, it, expect, beforeEach } from 'vitest';
import { AmbientSystem, ATMOSPHERE_INTERVAL } from '../systems/AmbientSystem.js';
import type { FactionMilestone, NPCDefinition } from '@ellmud/shared';

const FAST_NPCS: NPCDefinition[] = [
  {
    id: 'test-merchant',
    name: 'Test Merchant',
    role: 'merchant',
    patrolRoute: ['loc-a', 'loc-b'],
    idleActions: ['tests wares'],
    patrolInterval: 5,
  },
];

const TEST_MILESTONES: FactionMilestone[] = [
  {
    factionId: 'ironhearth',
    name: 'test_milestone',
    threshold: 50,
    description: 'Ironhearth test milestone reached.',
    reached: false,
  },
  {
    factionId: 'veilwalkers',
    name: 'test_ward',
    threshold: 100,
    description: 'Veilwalker test ward activated.',
    reached: false,
  },
];

describe('AmbientSystem', () => {
  let system: AmbientSystem;
  let rngValue: number;

  beforeEach(() => {
    rngValue = 0.5;
    system = new AmbientSystem({
      weather: { weatherCheckInterval: 10, timePeriodTicks: 20, transitionChance: 1.0 },
      npcDefinitions: FAST_NPCS,
      milestones: TEST_MILESTONES,
      wanderingMerchants: [],
      atmosphereInterval: 15,
      rng: () => rngValue,
    });
  });

  describe('tick orchestration', () => {
    it('should return events array on tick', () => {
      const events = system.tick();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should produce weather change events', () => {
      rngValue = 0.1;
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 10; i++) allEvents = allEvents.concat(system.tick());
      const weatherChanges = allEvents.filter(e => e.type === 'weather_change');
      expect(weatherChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('should produce time change events', () => {
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 20; i++) allEvents = allEvents.concat(system.tick());
      const timeChanges = allEvents.filter(e => e.type === 'time_change');
      expect(timeChanges.length).toBeGreaterThanOrEqual(1);
    });

    it('should produce NPC movement events', () => {
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 5; i++) allEvents = allEvents.concat(system.tick());
      const moves = allEvents.filter(e => e.type === 'npc_movement');
      expect(moves.length).toBeGreaterThanOrEqual(1);
    });

    it('should produce atmosphere events at configured interval', () => {
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 15; i++) allEvents = allEvents.concat(system.tick());
      const atmosphere = allEvents.filter(e => e.type === 'ambient_atmosphere');
      expect(atmosphere).toHaveLength(1);
    });

    it('should include narrative text in all events', () => {
      rngValue = 0.1;
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 20; i++) allEvents = allEvents.concat(system.tick());
      for (const event of allEvents) {
        expect(event.narrative).toBeTruthy();
        expect(typeof event.narrative).toBe('string');
        expect(event.narrative.length).toBeGreaterThan(0);
      }
    });
  });

  describe('faction events', () => {
    it('should trigger milestone when threshold is reached', () => {
      const events = system.addFactionScore('ironhearth', 50);
      expect(events).toHaveLength(1);
      expect(events[0]!.type).toBe('faction_event');
      expect(events[0]!.narrative).toContain('Ironhearth test milestone');
    });

    it('should not double-trigger milestones', () => {
      system.addFactionScore('ironhearth', 50);
      const events2 = system.addFactionScore('ironhearth', 50);
      expect(events2).toHaveLength(0);
    });

    it('should track faction scores', () => {
      system.addFactionScore('ironhearth', 30);
      expect(system.getFactionScore('ironhearth')).toBe(30);
      system.addFactionScore('ironhearth', 25);
      expect(system.getFactionScore('ironhearth')).toBe(55);
    });

    it('should return milestones by faction', () => {
      const ironhearth = system.getMilestones('ironhearth');
      expect(ironhearth).toHaveLength(1);
      expect(ironhearth[0]!.name).toBe('test_milestone');
    });

    it('should trigger multiple milestones from different factions independently', () => {
      const e1 = system.addFactionScore('ironhearth', 50);
      const e2 = system.addFactionScore('veilwalkers', 100);
      expect(e1).toHaveLength(1);
      expect(e2).toHaveLength(1);
    });
  });

  describe('wandering merchants', () => {
    it('should track merchant states', () => {
      const states = system.getMerchantStates();
      expect(Array.isArray(states)).toBe(true);
    });

    it('should trigger merchant arrival on schedule', () => {
      const merchantSystem = new AmbientSystem({
        weather: { weatherCheckInterval: 1000, timePeriodTicks: 1000 },
        npcDefinitions: [],
        milestones: [],
        wanderingMerchants: [{
          id: 'test-merchant',
          name: 'Test Trader',
          arrivalInterval: 5,
          arrivalChance: 1.0,
          duration: 3,
          inventory: [{ name: 'Test Item', stock: 1, description: 'A test.' }],
          arrivalNarrative: 'The Test Trader arrives.',
          departureNarrative: 'The Test Trader departs.',
        }],
        atmosphereInterval: 1000,
        rng: () => 0.5,
      });

      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 5; i++) allEvents = allEvents.concat(merchantSystem.tick());
      const arrivals = allEvents.filter(e => e.type === 'merchant_arrival');
      expect(arrivals).toHaveLength(1);
      expect(arrivals[0]!.narrative).toBe('The Test Trader arrives.');
    });

    it('should trigger merchant departure after duration', () => {
      const merchantSystem = new AmbientSystem({
        weather: { weatherCheckInterval: 1000, timePeriodTicks: 1000 },
        npcDefinitions: [],
        milestones: [],
        wanderingMerchants: [{
          id: 'test-merchant',
          name: 'Test Trader',
          arrivalInterval: 5,
          arrivalChance: 1.0,
          duration: 3,
          inventory: [],
          arrivalNarrative: 'The Test Trader arrives.',
          departureNarrative: 'The Test Trader departs.',
        }],
        atmosphereInterval: 1000,
        rng: () => 0.5,
      });

      // Trigger arrival (tick 5)
      for (let i = 0; i < 5; i++) merchantSystem.tick();

      // Duration is 3, so departure at tick 8
      let allEvents: ReturnType<AmbientSystem['tick']> = [];
      for (let i = 0; i < 3; i++) allEvents = allEvents.concat(merchantSystem.tick());
      const departures = allEvents.filter(e => e.type === 'merchant_departure');
      expect(departures).toHaveLength(1);
      expect(departures[0]!.narrative).toBe('The Test Trader departs.');
    });
  });

  describe('join narration', () => {
    it('should produce non-empty join narration', () => {
      const narration = system.getJoinNarration();
      expect(narration).toBeTruthy();
      expect(narration.length).toBeGreaterThan(10);
    });

    it('should reflect current weather and time', () => {
      system.weather.setWeather('storm');
      system.weather.setTimeOfDay('night');
      const narration = system.getJoinNarration();
      expect(narration).toBeTruthy();
      expect(typeof narration).toBe('string');
    });
  });

  describe('tick counter', () => {
    it('should track tick count', () => {
      expect(system.getTickCount()).toBe(0);
      system.tick();
      expect(system.getTickCount()).toBe(1);
      system.tick();
      expect(system.getTickCount()).toBe(2);
    });
  });
});
