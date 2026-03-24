import { describe, it, expect, beforeEach } from 'vitest';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import type { TimeOfDay } from '@ellmud/shared';

describe('WeatherSystem', () => {
  let system: WeatherSystem;
  let rngValue: number;

  beforeEach(() => {
    rngValue = 0.1;
    system = new WeatherSystem(
      { weatherCheckInterval: 5, timePeriodTicks: 10, transitionChance: 1.0 },
      () => rngValue,
    );
  });

  describe('initial state', () => {
    it('should start with clear weather', () => {
      expect(system.getWeather()).toBe('clear');
    });

    it('should start at morning', () => {
      expect(system.getTimeOfDay()).toBe('morning');
    });

    it('should return a valid snapshot', () => {
      const snap = system.getSnapshot();
      expect(snap.weather).toBe('clear');
      expect(snap.timeOfDay).toBe('morning');
      expect(snap.ticksInState).toBe(0);
    });
  });

  describe('weather state machine', () => {
    it('should transition from clear to cloudy', () => {
      rngValue = 0.1; // passes transitionChance, picks first candidate
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getWeather()).toBe('cloudy');
    });

    it('should not transition when rng exceeds transitionChance', () => {
      const stable = new WeatherSystem(
        { weatherCheckInterval: 5, timePeriodTicks: 100, transitionChance: 0.0 },
        () => 0.5,
      );
      for (let i = 0; i < 20; i++) stable.tick();
      expect(stable.getWeather()).toBe('clear');
    });

    it('should report weatherChanged when transitioning', () => {
      let result: ReturnType<WeatherSystem['tick']> = { weatherChanged: false, timeChanged: false };
      for (let i = 0; i < 5; i++) result = system.tick();
      expect(result.weatherChanged).toBe(true);
      expect(result.oldWeather).toBe('clear');
    });

    it('should cycle through weather states', () => {
      // clear → cloudy
      rngValue = 0.1;
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getWeather()).toBe('cloudy');

      // cloudy → rain (index 0 of filtered non-self candidates: ['rain', 'clear'])
      rngValue = 0.0;
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getWeather()).toBe('rain');

      // rain → storm (index 0 of ['storm', 'cloudy'])
      rngValue = 0.0;
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getWeather()).toBe('storm');

      // storm → rain (only candidate)
      rngValue = 0.0;
      for (let i = 0; i < 5; i++) system.tick();
      expect(system.getWeather()).toBe('rain');
    });

    it('should allow forced weather via setWeather', () => {
      system.setWeather('storm');
      expect(system.getWeather()).toBe('storm');
      expect(system.getSnapshot().ticksInState).toBe(0);
    });
  });

  describe('time of day', () => {
    it('should advance time after timePeriodTicks', () => {
      for (let i = 0; i < 10; i++) system.tick();
      expect(system.getTimeOfDay()).toBe('midday');
    });

    it('should report timeChanged on transition', () => {
      let result: ReturnType<WeatherSystem['tick']> = { weatherChanged: false, timeChanged: false };
      for (let i = 0; i < 10; i++) result = system.tick();
      expect(result.timeChanged).toBe(true);
      expect(result.oldTime).toBe('morning');
    });

    it('should cycle through all time periods', () => {
      const seen: string[] = [system.getTimeOfDay()];
      // Advance through 6 full periods (morning → dawn wraps around)
      for (let period = 0; period < 6; period++) {
        for (let i = 0; i < 10; i++) system.tick();
        seen.push(system.getTimeOfDay());
      }
      // Should have seen morning → midday → afternoon → dusk → night → dawn → morning
      expect(seen).toEqual(['morning', 'midday', 'afternoon', 'dusk', 'night', 'dawn', 'morning']);
    });

    it('should allow forced time via setTimeOfDay', () => {
      system.setTimeOfDay('night');
      expect(system.getTimeOfDay()).toBe('night');
    });

    it('should reject invalid time values in setTimeOfDay', () => {
      system.setTimeOfDay('invalid' as TimeOfDay);
      expect(system.getTimeOfDay()).toBe('morning'); // unchanged
    });
  });
});
