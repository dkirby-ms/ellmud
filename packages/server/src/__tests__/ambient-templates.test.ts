import { describe, it, expect } from 'vitest';
import { renderAmbientTemplate } from '../narrative/ambient-templates.js';

describe('ambient-templates', () => {
  describe('weather_change', () => {
    it('should produce narration for each weather state', () => {
      for (const weather of ['clear', 'cloudy', 'rain', 'storm'] as const) {
        const text = renderAmbientTemplate('weather_change', { weather });
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(10);
      }
    });
  });

  describe('time_change', () => {
    it('should produce narration for each time of day', () => {
      for (const timeOfDay of ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const) {
        const text = renderAmbientTemplate('time_change', { timeOfDay });
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(10);
      }
    });
  });

  describe('npc_movement', () => {
    it('should narrate merchant movement', () => {
      const text = renderAmbientTemplate('npc_movement', {
        npcName: 'Greta',
        role: 'merchant',
        location: 'east-stalls',
        previousLocation: 'market-square',
      });
      expect(text).toContain('Greta');
      expect(text).toContain('east stalls');
    });

    it('should narrate refugee movement', () => {
      const text = renderAmbientTemplate('npc_movement', {
        npcName: 'a weary refugee',
        role: 'refugee',
        location: 'central-plaza',
      });
      expect(text).toContain('weary refugee');
    });
  });

  describe('npc_idle', () => {
    it('should narrate idle actions for each role', () => {
      for (const role of ['merchant', 'faction_rep', 'refugee'] as const) {
        const text = renderAmbientTemplate('npc_idle', {
          npcName: 'Test NPC',
          role,
          idleAction: 'stands quietly',
        });
        expect(text).toContain('Test NPC');
        expect(text).toContain('stands quietly');
      }
    });
  });

  describe('npc_arrival', () => {
    it('should narrate arrivals', () => {
      const text = renderAmbientTemplate('npc_arrival', {
        npcName: 'a stranger',
        role: 'refugee',
        location: 'south gate',
      });
      expect(text).toContain('stranger');
    });
  });

  describe('npc_departure', () => {
    it('should narrate departures', () => {
      const text = renderAmbientTemplate('npc_departure', {
        npcName: 'a tired figure',
        role: 'refugee',
      });
      expect(text).toContain('tired figure');
    });
  });

  describe('ambient_atmosphere', () => {
    it('should produce atmosphere for all weather/time combos', () => {
      for (const weather of ['clear', 'cloudy', 'rain', 'storm'] as const) {
        for (const timeOfDay of ['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'night'] as const) {
          const text = renderAmbientTemplate('ambient_atmosphere', { weather, timeOfDay });
          expect(text).toBeTruthy();
          expect(text.length).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('join_snapshot', () => {
    it('should produce a snapshot with weather and NPCs', () => {
      const text = renderAmbientTemplate('join_snapshot', {
        weather: 'rain',
        timeOfDay: 'dusk',
        npcCount: 5,
        merchantNames: [],
      });
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(20);
    });

    it('should mention wandering merchants when present', () => {
      const text = renderAmbientTemplate('join_snapshot', {
        weather: 'clear',
        timeOfDay: 'morning',
        npcCount: 3,
        merchantNames: ['The Whispering Trader'],
      });
      expect(text).toContain('Whispering Trader');
    });

    it('should describe empty Refuge', () => {
      const text = renderAmbientTemplate('join_snapshot', {
        weather: 'clear',
        timeOfDay: 'night',
        npcCount: 0,
        merchantNames: [],
      });
      expect(text).toContain('empty');
    });
  });

  describe('fallback types', () => {
    it('should never return empty string', () => {
      const types = [
        'weather_change', 'time_change', 'npc_movement', 'npc_idle',
        'npc_arrival', 'npc_departure', 'ambient_atmosphere', 'join_snapshot',
        'faction_event', 'merchant_arrival', 'merchant_departure',
      ] as const;

      for (const type of types) {
        const text = renderAmbientTemplate(type, {});
        expect(text).toBeTruthy();
        expect(text.length).toBeGreaterThan(0);
      }
    });
  });
});
