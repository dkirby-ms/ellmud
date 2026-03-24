import { describe, it, expect } from 'vitest';
import { AmbientSystem } from '../systems/AmbientSystem.js';

/**
 * Integration test: simulate joining the Refuge and observing 3+ ambient
 * events over a 1-minute session (60 ticks at 1 tick/second).
 */
describe('Refuge Ambient Integration', () => {
  it('should produce 3+ ambient events in a 60-tick session', () => {
    let rngCounter = 0;
    // Deterministic RNG that cycles through values to trigger varied events
    const rng = () => {
      rngCounter++;
      return (rngCounter % 7) / 7; // cycles 0.14, 0.28, 0.43, 0.57, 0.71, 0.86, 0
    };

    const system = new AmbientSystem({
      weather: { weatherCheckInterval: 15, timePeriodTicks: 30, transitionChance: 0.8 },
      atmosphereInterval: 20,
      rng,
    });

    // Player joins — should get a join narration
    const joinNarration = system.getJoinNarration();
    expect(joinNarration).toBeTruthy();
    expect(joinNarration.length).toBeGreaterThan(10);

    // Simulate 60 ticks (1-minute session)
    const allEvents: ReturnType<AmbientSystem['tick']> = [];
    for (let i = 0; i < 60; i++) {
      allEvents.push(...system.tick());
    }

    // Must observe at least 3 distinct ambient events
    expect(allEvents.length).toBeGreaterThanOrEqual(3);

    // Events should span multiple types
    const eventTypes = new Set(allEvents.map(e => e.type));
    expect(eventTypes.size).toBeGreaterThanOrEqual(2);

    // All events have narrative text
    for (const event of allEvents) {
      expect(event.narrative).toBeTruthy();
      expect(typeof event.narrative).toBe('string');
    }

    // Should have tick numbers
    for (const event of allEvents) {
      expect(event.tick).toBeGreaterThan(0);
    }
  });

  it('should include weather, NPC, and atmosphere events in extended session', () => {
    let rngCounter = 0;
    const rng = () => {
      rngCounter++;
      return (rngCounter % 5) / 5;
    };

    const system = new AmbientSystem({
      weather: { weatherCheckInterval: 10, timePeriodTicks: 25, transitionChance: 1.0 },
      atmosphereInterval: 12,
      rng,
    });

    const allEvents: ReturnType<AmbientSystem['tick']> = [];
    for (let i = 0; i < 60; i++) {
      allEvents.push(...system.tick());
    }

    const types = allEvents.map(e => e.type);

    // Should see weather changes
    expect(types).toContain('weather_change');

    // Should see NPC idle actions (from default REFUGE_NPCS)
    expect(types).toContain('npc_idle');

    // Should see atmosphere events
    expect(types).toContain('ambient_atmosphere');
  });

  it('should integrate faction milestones with ambient tick', () => {
    const system = new AmbientSystem({
      weather: { weatherCheckInterval: 1000, timePeriodTicks: 1000 },
      npcDefinitions: [],
      atmosphereInterval: 1000,
    });

    // Simulate faction resource contribution
    const events = system.addFactionScore('ironhearth', 100);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.type).toBe('faction_event');
    expect(events[0]!.narrative.length).toBeGreaterThan(0);
  });

  it('should provide different join narrations for different world states', () => {
    const system = new AmbientSystem({
      weather: { weatherCheckInterval: 1000, timePeriodTicks: 1000 },
    });

    const morningClear = system.getJoinNarration();

    system.weather.setWeather('storm');
    system.weather.setTimeOfDay('night');
    const nightStorm = system.getJoinNarration();

    // They should be different (atmospheric context changed)
    expect(morningClear).not.toBe(nightStorm);
  });
});
